
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
- If you don't know the answer after searching, politely say that you don't have that information.
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

  // A mock function to simulate calling the PHP backend API
  private async find_products(query: string): Promise<object> {
    console.log(`Searching for products with query: "${query}"`);

    // DEVELOPER ACTION REQUIRED: Replace this mock implementation with a real API call to your PHP backend.
    // For example:
    // const response = await fetch(`https://your-site.onrender.com/api/search.php?q=${encodeURIComponent(query)}`);
    // if (!response.ok) {
    //   return { error: "Failed to fetch products from the server." };
    // }
    // const data = await response.json();
    // return data;

    // For demonstration purposes, we return mock data based on the query.
    if (query.toLowerCase().includes('iphone')) {
      return {
        products: [
          { name: 'iPhone 15 Pro', price: '28.990.000₫', description: 'The ultimate iPhone, with the powerful A17 Pro chip.' },
          { name: 'iPhone 15', price: '22.990.000₫', description: 'A total powerhouse, with the A16 Bionic chip.' },
        ]
      };
    } else if (query.toLowerCase().includes('macbook')) {
       return {
        products: [
          { name: 'MacBook Air M3', price: '27.990.000₫', description: 'Strikingly thin and fast, so you can work, play, or create anywhere.' },
          { name: 'MacBook Pro M3', price: '42.990.000₫', description: 'The most advanced laptop for demanding workflows.' },
        ]
      };
    }

    return { products: [] }; // Return empty if no specific products are found
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

          response = await this.chat.sendMessage([ toolResponsePart ]);
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
