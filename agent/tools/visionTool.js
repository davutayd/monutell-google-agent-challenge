import { GoogleGenerativeAI } from '@google/generative-ai';
import { monuments } from '../mockData.js';
import fs from 'fs';

// Tool definition if we wanted the agent to call it, but usually vision is handled 
// by passing the image directly to the model in the chat history.
export const visionToolDefinition = {
  name: 'identify_monument_from_image',
  description: 'Identifies a monument from a provided image file path.',
  parameters: {
    type: 'OBJECT',
    properties: {
      image_path: {
        type: 'STRING',
        description: 'The path to the image file to analyze.'
      }
    },
    required: ['image_path']
  }
};

export async function identifyMonumentFromImage({ image_path }) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return {
        status: 'mock_success',
        message: 'Mock identification: Looks like the Hungarian Parliament Building!',
        matched_monument_id: 'm1'
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Since we need to identify based on the image, we can use the latest model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const mimeType = 'image/jpeg'; // Assuming jpeg for now
    const imagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(image_path)).toString('base64'),
        mimeType
      }
    };

    const prompt = `Identify the monument in this image. Here is a list of possible monuments: ${monuments.map(m => m.name).join(', ')}. 
    Respond with the EXACT name of the monument if you recognize it from the list, or "Unknown" if it is not in the list.`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();

    const matchedMonument = monuments.find(m => m.name.toLowerCase() === responseText.toLowerCase());

    if (matchedMonument) {
      return {
        status: 'success',
        message: `Identified as ${matchedMonument.name}`,
        matched_monument_id: matchedMonument.id
      };
    } else {
      return {
        status: 'success',
        message: 'Could not identify the monument from the provided list.',
        matched_monument_id: null
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
