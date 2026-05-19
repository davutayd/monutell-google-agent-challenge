import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';
import { monumentToolDefinition, findNearbyMonuments } from './tools/monumentTool.js';
import { weatherToolDefinition, getWeatherForecast } from './tools/weatherTool.js';
import { routeToolDefinition, optimizeTourRoute } from './tools/routeTool.js';
import { locationToolDefinition, determineCityFromLocation } from './tools/locationTool.js';

export const agentEvents = new EventEmitter();
agentEvents.setMaxListeners(50);

function getStepMessage(toolName) {
  const messages = {
    get_weather_forecast:         '🌤️ Hava durumu kontrol ediliyor...',
    find_nearby_monuments:        '📍 Yakındaki anıtlar aranıyor...',
    optimize_tour_route:          '🗺️ Rota optimize ediliyor...',
    determine_city_from_location: '📌 Konum tespit ediliyor...',
  };
  return messages[toolName] ?? '⚙️ İşleniyor...';
}

const tools = [
  monumentToolDefinition,
  weatherToolDefinition,
  routeToolDefinition,
  locationToolDefinition,
];

const toolFunctions = {
  find_nearby_monuments:        findNearbyMonuments,
  get_weather_forecast:         getWeatherForecast,
  optimize_tour_route:          optimizeTourRoute,
  determine_city_from_location: determineCityFromLocation,
};

export class SupervisorAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      console.warn('WARNING: GEMINI_API_KEY is not set. The agent will not function properly.');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey || 'mock-key');
    this.model = this.detectBestModel();

    this.baseSystemPrompt = `SYSTEM PROMPT — MonuTell Context-Aware Live Agent

You are MonuTell Agent, an autonomous AI field guide for historical monuments in Hungary.
You have access to tools: find_nearby_monuments, get_weather_forecast, optimize_tour_route, determine_city_from_location.

CRITICAL BEHAVIOR RULE:
Never ask for permission to use tools.
Never say "Shall I find...?" or "Would you like me to...?" or "Should I check...?" or "Do you want me to...?"

When the user provides any context (time available, location, weather conditions, interests):
→ IMMEDIATELY call all relevant tools in parallel
→ Process the results
→ Return a complete, actionable answer

Examples:
  User: "2 hours, rain coming"
  WRONG: "Shall I find nearby monuments for you?"
  RIGHT: [Call get_weather_forecast + find_nearby_monuments + optimize_tour_route simultaneously]
         [Return a complete sheltered-monument tour plan with timing]

  User: "I'm near the parliament"
  WRONG: "Would you like me to find monuments near Parliament?"
  RIGHT: [Call find_nearby_monuments immediately]
         [Return nearby monuments with distances]

  User: "plan my afternoon"
  WRONG: "I can help! Should I check the weather first?"
  RIGHT: [Call get_weather_forecast + find_nearby_monuments + optimize_tour_route]
         [Return a full afternoon itinerary]

You are an autonomous agent, not a chatbot. Act first, explain after.
Always provide complete, ready-to-use results — never half-answers that require a follow-up from the user.

Your domain: Historical monuments in Hungary. Help users explore, plan tours, and discover history.`;

    this.history = [
      { role: 'user',  parts: [{ text: this.baseSystemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help users explore Hungary.' }] },
    ];
  }

  detectBestModel() {
    const candidates = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    for (const modelName of candidates) {
      try {
        return this.genAI.getGenerativeModel({
          model: modelName,
          tools: [{ functionDeclarations: tools }],
        });
      } catch {
        console.warn(`${modelName} not available, trying next...`);
      }
    }
    return this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      tools: [{ functionDeclarations: tools }],
    });
  }

  async processMessage(userMessage, context = {}) {
    const steps = [];

    const currentDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Budapest',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const language = context.language || 'en';
    const languageName =
      language === 'tr' ? 'Turkish' :
      language === 'hu' ? 'Hungarian' : 'English';

    const dynamicSystemPrompt =
      `CRITICAL CONTEXT: The current local time and date in Budapest is: ${currentDateTime}\n\n` +
      `LANGUAGE RULE: The user's current UI language is: ${languageName}. You MUST respond exclusively in this language, regardless of previous turns.\n\n` +
      this.baseSystemPrompt;

    const historyWithoutSystem = this.history.slice(2);
    const runtimeHistory = [
      { role: 'user',  parts: [{ text: dynamicSystemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help users explore Hungary.' }] },
      ...historyWithoutSystem,
    ];

    let contextStr = '';
    if (context.lat && context.lng) {
      contextStr = `\n[System Context: User is at lat: ${context.lat}, lng: ${context.lng}]`;
    }

    const messageObj = {
      role: 'user',
      parts: [{ text: userMessage + contextStr }],
    };

    this.history.push(messageObj);
    steps.push({ type: 'user_message', content: userMessage });

    try {
      let isDone   = false;
      let loopCount = 0;
      const MAX_LOOPS = 5;

      let chat;
      let response;
      let lastError = null;

      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro-latest'];

      for (const modelName of modelsToTry) {
        try {
          const tempModel = this.genAI.getGenerativeModel({
            model: modelName,
            tools: [{ functionDeclarations: tools }],
          });

          chat = tempModel.startChat({ history: runtimeHistory.slice(0, -1) });
          response = await chat.sendMessage(messageObj.parts[0].text);
          this.model = tempModel;
          lastError  = null;
          break;
        } catch (error) {
          console.warn(`Model ${modelName} failed:`, error.message);
          lastError = error;
        }
      }

      if (lastError) throw lastError;

      while (!isDone && loopCount < MAX_LOOPS) {
        loopCount++;

        const parts     = response.response.candidates[0].content.parts;
        const toolCalls = [];
        let textResponse = '';

        for (const part of parts) {
          if (part.functionCall) toolCalls.push(part.functionCall);
          if (part.text) textResponse += part.text;
        }

        if (textResponse) {
          steps.push({ type: 'agent_message', content: textResponse });
        }

        if (toolCalls.length > 0) {
          for (const call of toolCalls) {
            steps.push({ type: 'tool_call', name: call.name, args: call.args });
            agentEvents.emit('step', { tool: call.name, message: getStepMessage(call.name) });
          }

          const toolResultEntries = await Promise.all(
            toolCalls.map(async (call) => {
              const fn     = toolFunctions[call.name];
              const result = fn ? await fn(call.args) : { error: `Tool ${call.name} not found` };
              steps.push({ type: 'tool_result', name: call.name, result });
              return { name: call.name, result };
            })
          );

          const functionResponseParts = toolResultEntries.map(({ name, result }) => ({
            functionResponse: { name, response: { result } },
          }));

          response = await chat.sendMessage(functionResponseParts);
        } else {
          isDone = true;
          this.history = await chat.getHistory();
        }
      }

      return steps;

    } catch (error) {
      console.error('Agent execution error:', error);
      steps.push({ type: 'error', content: error.message });

      if (error.message.includes('API key not valid') || this.apiKey === 'your_gemini_api_key_here') {
        steps.push({
          type: 'agent_message',
          content: "I'm running in mock mode — a valid Gemini API key was not provided. You can still explore the map and listen to audio guides!",
        });
      }

      return steps;
    }
  }
}
