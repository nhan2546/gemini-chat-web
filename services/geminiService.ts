import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse, SendMessageParameters } from "@google/genai";

// Vite requires environment variables exposed to the client to be prefixed with VITE_
const API_KEY = process.env.VITE_API_KEY;

// Gracefully handle the missing API key by initializing 'ai' as null
// instead of throwing an error that crashes the entire application.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

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
  private chat: Chat | null = null;
  private initializationError: string | null = null;

  constructor() {
    if (!ai) {
      const errorMessage = "AI service is not configured. The VITE_API_KEY is missing.";
      console.error(errorMessage);
      this.initializationError = errorMessage;
      return;
    }

    this.chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [findProductsFunctionDeclaration] }],
      },
    });
  }

  // This function now calls the live PHP backend API.
  // FIX: Changed return type from `Promise<object>` to `Promise<Record<string, unknown>>` to match the type expected by the Gemini API for function call responses.
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
    if (this.initializationError) {
      return this.initializationError;
    }
    if (!this.chat) {
        return "Chat session is not initialized. Please refresh and try again.";
    }

    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({ message });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log("Function call requested by model:", functionCalls);
        const call = functionCalls[0]; 

        if (call.name === 'find_products') {
          const query = call.args.query as string;
          const apiResult = await this.find_products(query);

          const functionResponsePart = {
            functionResponse: {
                name: call.name,
                response: apiResult,
            }
          };
          
          const message: SendMessageParameters = {
            message: [functionResponsePart]
          };

          response = await this.chat.sendMessage(message);
        }
      }
      
      return response.text;

    } catch (error) {
      console.error("Gemini API error:", error);
      return "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
    }
  }
}

export const geminiService = new GeminiService();
