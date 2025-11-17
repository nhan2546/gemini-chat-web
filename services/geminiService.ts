import {
  GoogleGenAI,
  Chat,
  FunctionDeclaration,
  Type,
  GenerateContentResponse,
  SendMessageParameters,
} from '@google/genai';

// 1️⃣  API key (đọc từ env mà Vite đã inject)
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error(
    'API_KEY is not configured. The application will not be able to connect to Gemini.'
  );
}

// 2️⃣  Model
const model = 'gemini-2.5-flash';

// 3️⃣  Function declarations cho Gemini
const findProductsFunctionDeclaration: FunctionDeclaration = {
  name: 'find_products',
  description:
    'Finds products in the Shop Táo Ngon e‑commerce store database based on a search query.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The user's search query, e.g. 'iPhone 15' or 'MacBook Air'.",
      },
    },
    required: ['query'],
  },
};

// 7️⃣ Function declaration: đề xuất sản phẩm
const recommendProductsFn: FunctionDeclaration = {
  name: 'recommend_products',
  description: 'Return a list of products that best match the user\'s preferences such as category, price range, or keyword.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: 'Category name, e.g. "smartphone".' },
      maxPrice: { type: Type.NUMBER, description: 'Maximum price in USD.' },
      keyword:  { type: Type.STRING, description: 'Optional keyword to narrow the search.' },
    },
    required: [],
  },
};

// 8️⃣ Function declaration: lấy chi tiết một sản phẩm cụ thể
const getProductDetailFn: FunctionDeclaration = {
  name: 'get_product_detail',
  description: 'Fetch detailed information (specs, price, images) of a product given its unique productId.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: { type: Type.STRING, description: 'The unique identifier of the product.' },
    },
    required: ['productId'],
  },
};


class GeminiService {
  // 4️⃣ Bản đồ lưu chat theo session
  private chats: Map<string, Chat> = new Map();

  // 5️⃣ System instruction động
  private buildSystemInstruction(profile?: string, summary?: string): string {
    const base = `You are a friendly and helpful AI sales assistant named Táo for the e‑commerce store "Shop Táo Ngon".`;
    const parts = [base];
    if (profile) parts.push(`User profile: ${profile}`);
    if (summary) parts.push(`Conversation summary: ${summary}`);
    return parts.join('\n');
  }

  // 6️⃣ Lấy (hoặc tạo) một chat cho session
  private getOrCreateChat(sessionId: string, profile?: string, summary?: string): Chat {
    const exist = this.chats.get(sessionId);
    if (exist) return exist;

    // tạo mới – systemInstruction được xây dựng ngay tại đây
    const chat = ai!.chats.create({
      model,
      config: {
        systemInstruction: this.buildSystemInstruction(profile, summary),
        temperature: 0.2,                // ít “sáng tạo” hơn, trả lời chính xác hơn
        maxOutputTokens: 2048,
        // --------- công cụ (function) ----------
        tools: [{ functionDeclarations: [
          findProductsFunctionDeclaration,
          recommendProductsFn,
          getProductDetailFn,
        ] }],
      },
    });
    this.chats.set(sessionId, chat);
    return chat;
  }

  public resetSession(sessionId: string) {
    this.chats.delete(sessionId);
  }

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

  // 9️⃣ Gọi API backend để đề xuất sản phẩm
  private async recommend_products(
    category?: string,
    maxPrice?: number,
    keyword?: string
  ): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set');
      return { error: 'Backend URL missing' };
    }
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (maxPrice) params.append('maxPrice', String(maxPrice));
    if (keyword)  params.append('q', keyword);
    const apiUrl = `${baseUrl}/recommend.php?${params.toString()}`;
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`Backend error ${resp.status}:`, txt);
        return { error: `Backend error ${resp.status}` };
      }
      return await resp.json();      // { recommendations: [...] }
    } catch (e) {
      console.error('Recommend API error:', e);
      return { error: 'Cannot reach backend' };
    }
  }

  // 10️⃣ Gọi API backend để lấy chi tiết sản phẩm
  private async get_product_detail(productId: string): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set');
      return { error: 'Backend URL missing' };
    }
    const apiUrl = `${baseUrl}/product_detail.php?id=${encodeURIComponent(productId)}`;
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`Backend error ${resp.status}:`, txt);
        return { error: `Backend error ${resp.status}` };
      }
      return await resp.json();      // { product: {...} }
    } catch (e) {
      console.error('Product detail API error:', e);
      return { error: 'Cannot reach backend' };
    }
  }

  // 12️⃣ Tóm tắt lịch sử hội thoại (dùng gemini-1.5-pro)
  private async summarizeHistory(history: any[]): Promise<string> {
    if (!ai) return '';
    // Tạo một chat “summarizer” – không cần lưu lại
    const summarizer = ai.chats.create({
      model: 'gemini-1.5-pro',
      config: {
        systemInstruction:
          'Summarize the following conversation between a user and an assistant in two‑three short sentences. Keep only the core intent and any important preferences.',
        temperature: 0,
      },
    });

    // Chuyển đổi history thành một chuỗi simple
    const prompt = history
      .map((c: any) => {
        const role = c.role === 'model' ? 'Assistant' : 'User';
        const txt = c.parts?.[0]?.text ?? '';
        return `${role}: ${txt}`;
      })
      .join('\n');

    const resp = await summarizer.sendMessage({ message: prompt });
    return resp.text;
  }

  // 11️⃣ GỬI TIN NHẮN – BÂY GIỜ CẦN SESSION ID
  async sendMessage(message: string, sessionId: string): Promise<string> {
    if (!ai) {
      return 'AI service is not configured. The API_KEY environment variable is missing.';
    }
    // Lấy profile từ localStorage (nếu có)
    const profile = localStorage.getItem('userProfile') ?? undefined;

    // Kiểm tra/ tạo chat, truyền profile (và summary nếu có)
    let chat = this.getOrCreateChat(sessionId, profile);

    // (Tùy chọn) Nếu lịch sử > 30 turn → tóm tắt và tạo lại chat
    const rawHistory = await chat.getHistory();
    if (rawHistory.length > 30) {
      const summary = await this.summarizeHistory(rawHistory);
      // Reset và tạo lại chat với summary
      this.resetSession(sessionId);
      chat = this.getOrCreateChat(sessionId, profile, summary);
    }

    // Gửi tin nhắn thực tế
    let response: GenerateContentResponse;

    try {
      response = await chat.sendMessage({ message });

      // XỬ LÝ FUNCTION CALL (cũng bao gồm các hàm mới)
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log('Function call requested:', functionCalls);
        const call = functionCalls[0];
        let apiResult: any = { error: 'Unsupported function' };

        if (call.name === 'find_products') {
          const query = (call.args as any).query as string;
          apiResult = await this.find_products(query);
        } else if (call.name === 'recommend_products') {
          const { category, maxPrice, keyword } = call.args as any;
          apiResult = await this.recommend_products(category, maxPrice, keyword);
        } else if (call.name === 'get_product_detail') {
          const { productId } = call.args as any;
          apiResult = await this.get_product_detail(productId);
        }

        // Trả lại kết quả cho Gemini
        const functionResponsePart = {
          functionResponse: { name: call.name, response: apiResult },
        };
        const functionResponseMessage: SendMessageParameters = {
          message: [functionResponsePart],
        };
        response = await chat.sendMessage(functionResponseMessage);
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      return "Sorry, I'm having trouble connecting. Please try again later.";
    }
    
    // Trả về text cuối cùng
    return response.text;
  }
}

// Export singleton
export const geminiService = new GeminiService();
