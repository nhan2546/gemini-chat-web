import {
  GoogleGenAI,
  Chat,
  FunctionDeclaration,
  Type,
  GenerateContentResponse,
  SendMessageParameters,
} from '@google/genai';

// ------------------------------------------------------------------
// 1️⃣  API key (đọc từ env mà Vite đã inject)
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// ------------------------------------------------------------------
// 2️⃣  Model & system instruction (không thay đổi)
const model = 'gemini-2.5-flash';
const systemInstruction = `You are a friendly and helpful AI sales assistant
named Táo for an e‑commerce store called 'Shop Táo Ngon'…`;

// ------------------------------------------------------------------
// 3️⃣  Function declaration cho Gemini
const findProductsFunctionDeclaration: FunctionDeclaration = {
  name: 'find_products',
  description:
    'Finds products in the Shop Táo Ngon e‑commerce store database based on a search query.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The user's search query, e.g. 'iPhone 15' or 'MacBook Air'.",
      },
    },
    required: ['query'],
  },
};

// ------------------------------------------------------------------
// 4️⃣  Service class
const recommendProductsFn: FunctionDeclaration = {
  name: 'recommend_products',
  description:
    'Return a list of products that best match the user\'s preferences such as category, price range, or keyword.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: 'Category name, e.g. "smartphone".' },
      maxPrice: { type: Type.NUMBER, description: 'Maximum price in USD.' },
      keyword:  { type: Type.STRING, description: 'Optional keyword to narrow the search.' },
    },
    required: [],                      // không bắt buộc, người dùng có thể chỉ cung cấp một trong các trường
  },
};
  // ----------------------------------------------------------------
const getProductDetailFn: FunctionDeclaration = {
  name: 'get_product_detail',
  description:
    'Fetch detailed information (specs, price, images) of a product given its unique productId.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'The unique identifier of the product.' },
    },
    required: ['productId'],
  },
};
  // 5️⃣  GỌI BACKEND – URL lấy từ env công khai
  private async find_products(query: string): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set');
      return { error: 'Backend URL missing' };
    }
    const apiUrl = `${baseUrl}/api.php?q=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`Backend error ${resp.status}:`, txt);
        return { error: `Backend error ${resp.status}` };
      }
      return await resp.json(); // => { products: [...] }
    } catch (e) {
      console.error('Failed to call backend API:', e);
      return { error: 'Cannot reach backend' };
    }
  }

  // ----------------------------------------------------------------
  // 6️⃣  GỬI TIN NHẮN ĐẾN GEMINI
  async sendMessage(message: string): Promise<string> {
    if (!this.isInitialized || !this.chat) {
      return 'AI service is not configured. The API_KEY environment variable is missing.';
    }

    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({
        message,
      });

      // ----------------------------------------------------------------
      // Nếu Gemini yêu cầu function call
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log('Function call requested:', functionCalls);
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
      console.error('Gemini API error:', error);
      return "Sorry, I'm having trouble connecting. Please try again later.";
    }
  }
}

// ------------------------------------------------------------------
// Export singleton
export const geminiService = new GeminiService();
