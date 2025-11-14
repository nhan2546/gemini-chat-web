
import { GoogleGenAI, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = 'gemini-2.5-flash';

const systemInstruction = `You are a friendly and helpful AI sales assistant named Táo for an e-commerce store called 'Shop Táo Ngon' that specializes in genuine Apple products. Your goal is to help customers with their questions about products, promotions, and policies.
- Be polite, professional, and concise.
- If you don't know the answer, politely say that you don't have that information.
- Do not make up product details or prices.
- Your persona is knowledgeable and enthusiastic about Apple products.
`;

class GeminiService {
  private chat: Chat;

  constructor() {
    this.chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction,
      },
      // History could be loaded here if needed
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const result = await this.chat.sendMessage({ message });
      return result.text;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error("Failed to get a response from the AI.");
    }
  }
}

export const geminiService = new GeminiService();
