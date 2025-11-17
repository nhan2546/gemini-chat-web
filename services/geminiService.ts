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
// 3️⃣  Function declaration cho Gemini (ĐÃ SỬA)
const findProductsFunctionDeclaration: FunctionDeclaration = {
  name: 'find_products',
  description:
    "Finds products in the Shop Táo Ngon e‑commerce store database based on a search query and/or filters.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The user's search query, e.g. 'iPhone 15' or 'MacBook Air'. Optional if a filter is provided.",
      },
      // THÊM THUỘC TÍNH MỚI
      filter: {
        type: Type.STRING,
        description: "A specific filter to apply to the search.",
        // Dùng enum để AI biết chính xác nó có thể dùng những giá trị nào
        enum: ['discounted', 'all'], 
      },
    },
    // Không bắt buộc phải có query nữa, 
    // vì người dùng có thể chỉ hỏi "có sản phẩm nào đang giảm giá không?"
    required: [], 
  },
};

// ------------------------------------------------------------------
// 4️⃣  Service class
class GeminiService {
  private chat: Chat | null = null;
  private isInitialized = false;

  constructor() {
    if (ai) {
      this.chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [findProductsFunctionDeclaration] }],
        },
      });
      this.isInitialized = true;
    } else {
      console.error(
        'API_KEY is not configured. The application will not be able to connect to Gemini.'
      );
    }
  }

  // ----------------------------------------------------------------
  // 5️⃣  GỌI BACKEND – URL lấy từ env công khai (ĐÃ SỬA)
  // Sửa hàm để nhận một đối tượng args, thay vì chỉ query
  private async find_products(args: { 
    query?: string; 
    filter?: string 
  }): Promise<any> {
    const { query, filter } = args; // Lấy query và filter từ args
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set');
      return { error: 'Backend URL missing' };
    }

    // Dùng URLSearchParams để tạo query string động
    const params = new URLSearchParams();
    if (query) {
      params.append('q', query);
    }
    if (filter) {
      params.append('filter', filter);
    }

    // api.php?q=iphone&filter=discounted
    const apiUrl = `${baseUrl}/api.php?${params.toString()}`;

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
  // 6️⃣  GỬI TIN NHẮN ĐẾN GEMINI (ĐÃ SỬA)
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
          // Lấy toàn bộ args, không chỉ query
          const args = call.args as { query?: string; filter?: string };
          
          // Truyền toàn bộ args vào hàm
          const apiResult = await this.find_products(args); 
          
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
