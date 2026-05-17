import { GoogleGenerativeAI } from '@google/generative-ai';
import { monumentToolDefinition, findNearbyMonuments } from './tools/monumentTool.js';
import { weatherToolDefinition, getWeatherForecast } from './tools/weatherTool.js';
import { routeToolDefinition, optimizeTourRoute } from './tools/routeTool.js';
import { locationToolDefinition, determineCityFromLocation } from './tools/locationTool.js';

const tools = [
  monumentToolDefinition,
  weatherToolDefinition,
  routeToolDefinition,
  locationToolDefinition
];

const toolFunctions = {
  find_nearby_monuments: findNearbyMonuments,
  get_weather_forecast: getWeatherForecast,
  optimize_tour_route: optimizeTourRoute,
  determine_city_from_location: determineCityFromLocation
};

export class SupervisorAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      console.warn("WARNING: GEMINI_API_KEY is not set. The agent will not function properly.");
    }
    
    // We can instantiate with an empty key if it's missing just to avoid crashes at init,
    // but it will fail on generation.
    this.genAI = new GoogleGenerativeAI(this.apiKey || "mock-key");
    
    // Select the best available model for free tier
    this.model = this.detectBestModel();

    // A simple memory for this prototype (in production this would be in a DB per session)
    this.history = [
      {
        role: "user",
        parts: [{ text: "System prompt: You are the MonuTell Context-Aware Live Agent. You help users explore historical monuments in Hungary. You can find nearby monuments, check weather to advise if it's good for walking, optimize tour routes, and determine the user's city." }]
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am ready to help users explore Hungary." }]
      }
    ];
  }

  detectBestModel() {
    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    for (const modelName of models) {
      try {
        return this.genAI.getGenerativeModel({
          model: modelName,
          tools: [{ functionDeclarations: tools }]
        });
      } catch (e) {
        console.warn(`${modelName} might not be available, trying next...`);
      }
    }
    
    return this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      tools: [{ functionDeclarations: tools }]
    });
  }

  async processMessage(userMessage, context = {}) {
    const steps = [];
    
    // Add user location to the message implicitly if provided
    let contextStr = "";
    if (context.lat && context.lng) {
      contextStr = `\n[System Context: User is at lat: ${context.lat}, lng: ${context.lng}]`;
    }
    
    const messageObj = {
      role: "user",
      parts: [{ text: userMessage + contextStr }]
    };
    
    this.history.push(messageObj);
    steps.push({ type: 'user_message', content: userMessage });

    try {
      let isDone = false;
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
            tools: [{ functionDeclarations: tools }]
          });
          
          chat = tempModel.startChat({
            history: this.history.slice(0, -1)
          });
          
          response = await chat.sendMessage(messageObj.parts[0].text);
          this.model = tempModel; // Keep the working model
          lastError = null;
          break; // Success, exit the retry loop
        } catch (error) {
          console.warn(`Model ${modelName} failed (could be quota):`, error.message);
          lastError = error;
        }
      }
      
      if (lastError) throw lastError;

      while (!isDone && loopCount < MAX_LOOPS) {
        loopCount++;
        
        const responseCandidate = response.response.candidates[0];
        const parts = responseCandidate.content.parts;
        
        let toolCall = null;
        let textResponse = "";

        for (const part of parts) {
          if (part.functionCall) {
            toolCall = part.functionCall;
          }
          if (part.text) {
            textResponse += part.text;
          }
        }

        if (textResponse) {
          steps.push({ type: 'agent_message', content: textResponse });
        }

        if (toolCall) {
          const { name, args } = toolCall;
          steps.push({ type: 'tool_call', name, args });
          
          if (toolFunctions[name]) {
            const toolResult = await toolFunctions[name](args);
            steps.push({ type: 'tool_result', name, result: toolResult });
            
            // Send tool result back to the model
            response = await chat.sendMessage([{
              functionResponse: {
                name,
                response: toolResult
              }
            }]);
          } else {
            // Tool not found
            response = await chat.sendMessage([{
              functionResponse: {
                name,
                response: { error: `Tool ${name} not found` }
              }
            }]);
          }
        } else {
          // No more tool calls, agent is done
          isDone = true;
          this.history = await chat.getHistory();
        }
      }
      
      return steps;

    } catch (error) {
      console.error("Agent execution error:", error);
      steps.push({ type: 'error', content: error.message });
      
      // Fallback for when API fails (e.g. invalid key)
      if (error.message.includes("API key not valid") || this.apiKey === 'your_gemini_api_key_here') {
         steps.push({ type: 'agent_message', content: "I'm running in mock mode because a valid Gemini API key was not provided. However, I can still help you explore the map and listen to audio guides!" });
      }
      
      return steps;
    }
  }
}
