
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = 'gemini-2.5-flash';

const systemInstruction = `You are a friendly and helpful AI sales assistant named Táo for an e-commerce store called 'Shop Táo Ngon' that specializes in genuine Apple products. Your goal is to help customers with their questions about products, promotions, and policies.
- To find product information like price and availability, you must use the 'find_products' function.
- Be polite, professional, and concise.
- If you don't know the answer after searching, or if the search returns no results, politely say that you don't have that information.
- Do not make up product details or prices.
- Your persona is knowledgeable and enthusiastic about Apple products.
`;

const findProductsFunctionDeclaration: FunctionDeclaration = {
    name: 'find_products',
    description: 'Finds products in the Shop Táo Ngon e-commerce store database based on a search query. Returns a list of matching products with their name, price, and a short description.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'The user\'s search query, for example "iPhone 15 Pro Max 256GB" or "Macbook Air M3".',
            },
        },
        required: ['query'],
    },
};


class GeminiService {
  private chat: Chat;

  constructor() {
    this.chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [findProductsFunctionDeclaration] }],
      },
    });
  }

  // This function now calls the live PHP backend API.
  private async find_products(query: string): Promise<object> {
    console.log(`Calling backend API with query: "${query}"`);

    // This is the URL for the user's PHP web service.
    const apiUrl = `https://web-chat-bot-php.onrender.com/api.php?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(apiUrl);

      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status} -`, errorText);
        return { error: "Failed to fetch products from the server." };
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error("Failed to call backend API:", error);
      return { error: "Could not connect to the product database." };
    }
  }


  async sendMessage(message: string): Promise<string> {
    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({ message });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log("Function call requested by model:", functionCalls);
        const call = functionCalls[0]; 

        if (call.name === 'find_products') {
          const query = call.args.query as string;
          const apiResult = await this.find_products(query);

          // Send the function result back to the model
          const toolResponsePart = {
            toolResponse: {
                id: call.id,
                name: call.name,
                response: {
                    result: apiResult,
                }
            }
          };

          // FIX: The chat.sendMessage method expects an object with a 'message' property.
          response = await this.chat.sendMessage({ message: [toolResponsePart] });
        }
      }
      
      return response.text;

    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("Failed to get a response from the AI.");
    }
  }
}

export const geminiService = new GeminiService();
