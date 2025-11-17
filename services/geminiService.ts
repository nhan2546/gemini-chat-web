
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse, SendMessageParameters } from "@google/genai";

// Fix: Use process.env.API_KEY as per the coding guidelines.
const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

const model = 'gemini-2.5-flash';

const systemInstruction = `You are Táo, a friendly and expert AI sales assistant for 'Shop Táo Ngon', an e-commerce store specializing in genuine Apple products in Vietnam. Your primary goal is to help customers by providing accurate product information from the store's database.
- Your responses MUST be in Vietnamese.
- When a user asks about a specific product, its price, specifications, or availability (e.g., "iPhone 14 giá bao nhiêu?", "còn hàng không?"), you MUST immediately use the 'find_products' function to get the information.
- Do not ask for clarification if the user's query contains a product name. Extract the product name and use the 'find_products' function.
- If the 'find_products' function returns no results, then you can inform the user that you couldn't find the product and ask for more details.
- Always check for and mention any available promotions, sale prices, or discounts returned by the function. This is very important.
- Do not make up product details or prices. Only use information from the 'find_products' function.
- Keep your answers concise, professional, and helpful.
`;

const findProductsFunctionDeclaration: FunctionDeclaration = {
    name: 'find_products',
    description: 'Finds products in the Shop Táo Ngon e-commerce store database based on a search query. Returns a list of matching products with their name, price, a short description, and any available promotion details like sale price or discount.',
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
  private chat: Chat | null = null;
  private isInitialized = false;

  constructor() {
    if (ai) {
      this.chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [findProductsFunctionDeclaration] }],
        },
      });
      this.isInitialized = true;
    } else {
        // Fix: Update error message to refer to API_KEY.
        console.error("API_KEY is not configured. The application will not be able to connect to the AI service.");
    }
  }

  // This function now calls the live PHP backend API.
  private async find_products(query: string): Promise<Record<string, unknown>> {
    console.log(`Calling backend API with query: "${query}"`);

    // This is the URL for the user's PHP web service.
    const apiUrl = `https://web-chat-bot-php.onrender.com/api.php?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(apiUrl);

      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Status ${response.status} -`, errorText);
        return { error: `Failed to fetch products. The server responded with status: ${response.status}` };
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error("Failed to call backend API:", error);
      // FIX: Added a return statement to ensure all code paths return a value, satisfying the function's Promise<Record<string, unknown>> return type.
      return { error: "Could not connect to the product database. Please check the backend server." };
    }
  }


  async sendMessage(message: string, onChunk: (chunk: string) => void): Promise<void> {
    if (!this.isInitialized || !this.chat) {
        throw new Error("AI service is not configured. The API_KEY environment variable is missing.");
    }

    try {
      const resultStream = await this.chat.sendMessageStream({ message });
      let functionCall: any = null;

      for await (const chunk of resultStream) {
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              functionCall = chunk.functionCalls[0];
              // Got a function call, break to handle it.
              break;
          }
          if (chunk.text) {
              onChunk(chunk.text);
          }
      }

      if (functionCall) {
          console.log("Function call requested by model:", functionCall);
          if (functionCall.name === 'find_products') {
              const query = functionCall.args.query as string;
              const apiResult = await this.find_products(query);

              const functionResponsePart = {
                  functionResponse: {
                      name: functionCall.name,
                      response: apiResult,
                  }
              };
              
              const functionResponseMessage: SendMessageParameters = {
                message: [functionResponsePart]
              };

              const finalStream = await this.chat.sendMessageStream(functionResponseMessage);
              for await (const chunk of finalStream) {
                  if (chunk.text) {
                     onChunk(chunk.text);
                  }
              }
          }
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      // Re-throw the error to be handled consistently by the UI component.
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
