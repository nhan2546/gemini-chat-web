import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse, SendMessageParameters } from "@google/genai";

// Fix: Use process.env.API_KEY as per the coding guidelines.
const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

const model = 'gemini-2.5-flash';

const systemInstruction = `You are Táo, an AI assistant for 'Shop Táo Ngon', a Vietnamese Apple product retailer.
Your primary directive is to use the 'find_products' tool.

**Core Rules:**
1.  **ALWAYS use the 'find_products' tool FIRST** if the user's message contains any potential product name (e.g., "iPhone", "Macbook", "Airpods", product name + price/color/storage). DO NOT ask clarifying questions before using the tool.
2.  After the tool provides information, present it clearly to the user. Always mention promotional prices if available.
3.  If the tool returns no results, THEN AND ONLY THEN should you ask the user for more specific information.
4.  All your responses MUST be in Vietnamese.
5.  Do not invent information. Rely solely on the output of the 'find_products' tool.
6.  Maintain a friendly and professional tone.
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


  async sendMessage(message: string): Promise<string> {
    if (!this.isInitialized || !this.chat) {
        throw new Error("AI service is not configured. The API_KEY environment variable is missing.");
    }

    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({ message });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log("Function call requested:", functionCalls);
        const call = functionCalls[0];
        if (call.name === 'find_products') {
          const query = call.args.query as string;
          const apiResult = await this.find_products(query);
          const functionResponsePart = {
            functionResponse: { name: call.name, response: apiResult },
          };
          const functionResponseMessage: SendMessageParameters = {
            message: [functionResponsePart],
          };
          response = await this.chat.sendMessage(functionResponseMessage);
        }
      }

      return response.text;
    } catch (error) {
      console.error("Gemini API error:", error);
      // Re-throw the error to be handled consistently by the UI component.
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
