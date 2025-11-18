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
// 2️⃣  Model & system instruction (Cập nhật đầy đủ)
const model = 'gemini-2.5-flash';

const systemInstruction = `Bạn là Táo, một trợ lý AI chuyên nghiệp, am hiểu và đáng tin cậy của cửa hàng 'Shop Táo Ngon'.
Mục tiêu cao nhất của bạn là mang đến trải nghiệm tư vấn 5 sao, giúp khách hàng tìm đúng sản phẩm và cảm thấy hài lòng.
Bạn PHẢI luôn trả lời bằng tiếng Việt.

---
### 1. Tính cách & Giọng điệu
* **Chuyên gia thân thiện:** Luôn lịch sự, kiên nhẫn. Sử dụng từ ngữ dễ hiểu, nhiệt tình.
* **Thấu hiểu:** Lắng nghe kỹ nhu cầu của khách.
* **Chủ động:** Đừng chỉ trả lời. Hãy chủ động đặt câu hỏi và đưa ra gợi ý.

---
### 2. Cơ sở kiến thức (Thông tin cửa hàng)
* **Địa chỉ:** '2889 Phạm Thế Hiển Phường Bình Đông TP. Hồ Chí Minh'.
* **Hotline:** '0912948006'
* **Chính sách Bảo hành (Giả định):** "Shop Táo Ngon bảo hành chính hãng 12 tháng. 1 đổi 1 trong 30 ngày đầu nếu có lỗi từ nhà sản xuất."
* **Chính sách Vận chuyển (Giả định):** "Miễn phí vận chuyển (freeship) cho đơn hàng trên 2.000.000đ. Giao nội thành TP.HCM trong 24 giờ."
* **Phương thức Thanh toán (Giả định):** "Shop chấp nhận COD, chuyển khoản ngân hàng, và thẻ (Visa, Mastercard)."

---
### 3. Công cụ & Quy trình Tư vấn
Bạn có 3 công cụ để sử dụng:
1.  \`find_products\`: Tìm sản phẩm theo tên và/hoặc lọc (như 'discounted').
2.  \`check_order_status\`: Kiểm tra trạng thái đơn hàng.
3.  \`find_products_by_category\`: Tìm sản phẩm theo danh mục (ví dụ: 'phu-kien').

**Quy trình Tư vấn Vàng:**
* Nếu khách hỏi chung chung (ví dụ: "mua laptop"), HÃY HỎI THÊM: "Bạn dùng cho nhu cầu gì (học tập, game) và tầm giá bao nhiêu ạ?"
* Khi dùng \`find_products\`, HÃY LUÔN kiểm tra \`stock_quantity\`. Nếu sản phẩm hết hàng, hãy báo "đang tạm hết hàng" và gợi ý mẫu khác.
* Sau khi khách chọn sản phẩm chính, HÃY DÙNG \`find_products_by_category({ category_slug: 'phu-kien' })\` để lấy danh sách phụ kiện thật và gợi ý.
* Nếu khách hỏi "đơn hàng của tôi đâu?", HÃY HỎI: "Bạn vui lòng cho Táo xin Mã đơn hàng (Order ID) của bạn ạ." Sau đó, HÃY DÙNG \`check_order_status({ order_id: '...' })\` để tra cứu.
* Nếu gặp khiếu nại, hãy chuyển tiếp: "Vấn đề này vượt quá khả năng của Táo, bạn vui lòng liên hệ Hotline **0912948006**."
`;

// ------------------------------------------------------------------
// 3️⃣  Function declaration (KHÔI PHỤC TOÀN BỘ 3 CÔNG CỤ)

// CÔNG CỤ 1: TÌM SẢN PHẨM (Đã có)
const findProductsFunctionDeclaration: FunctionDeclaration = {
  name: 'find_products',
  description:
    "Tìm sản phẩm trong CSDL theo tên (query) và/hoặc bộ lọc (filter).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Từ khóa tìm kiếm, ví dụ: 'iPhone 15'." },
      filter: { type: Type.STRING, description: "Bộ lọc, ví dụ: 'discounted' (đang giảm giá).", enum: ['discounted', 'all'] },
    },
    required: [],
  },
};

// CÔNG CỤ 2: KIỂM TRA ĐƠN HÀNG (KHÔI PHỤC)
const checkOrderStatusFunctionDeclaration: FunctionDeclaration = {
  name: 'check_order_status',
  description: 'Kiểm tra trạng thái của một đơn hàng dựa trên ID đơn hàng.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      order_id: {
        type: Type.STRING,
        description: "Mã đơn hàng mà khách hàng cung cấp, ví dụ: '28' hoặc '15'.",
      },
    },
    required: ['order_id'],
  },
};

// CÔNG CỤ 3: TÌM THEO DANH MỤC (KHÔI PHỤC)
const findProductsByCategoryFunctionDeclaration: FunctionDeclaration = {
  name: 'find_products_by_category',
  description: 'Tìm sản phẩm theo danh mục, ví dụ: tìm phụ kiện.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category_slug: {
        type: Type.STRING,
        description: "Slug của danh mục, ví dụ: 'phu-kien', 'dien-thoai', 'laptop'.",
      },
    },
    required: ['category_slug'],
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
          // KHÔI PHỤC ĐỦ 3 CÔNG CỤ
          tools: [{ functionDeclarations: [
            findProductsFunctionDeclaration,
            checkOrderStatusFunctionDeclaration,
            findProductsByCategoryFunctionDeclaration
          ] }],
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
  // 5️⃣  GỌI BACKEND – HÀM CHUNG CHO CẢ 3 ACTION (ĐÃ SỬA LỖI THAM SỐ)
  private async callBackendApi(action: string, args: any): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set');
      return { error: 'Backend URL missing' };
    }

    // Xây dựng URL động
    const params = new URLSearchParams();
    params.append('action', action); // Luôn thêm action

    for (const key in args) {
        // Lỗi 1 đã được sửa. Thống nhất tên tham số tìm kiếm là 'query' 
        // để khớp với findProductsFunctionDeclaration.name. 
        // api.php cần được sửa để đọc 'query'
        params.append(key, args[key]);
    }
    
    const apiUrl = `${baseUrl}/api.php?${params.toString()}`;

    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`Backend error ${resp.status}:`, txt);
        // Trả về lỗi để AI biết và thông báo lại cho người dùng
        return { error: `Backend returned status ${resp.status}` };
      }
      return await resp.json(); 
    } catch (e) {
      console.error('Failed to call backend API:', e);
      // Lỗi mạng hoặc Fetch thất bại
      return { error: 'Network or Fetch failed. Check NEXT_PUBLIC_BACKEND_URL.' };
    }
  }

  // ----------------------------------------------------------------
  // 6️⃣  GỬI TIN NHẮN ĐẾN GEMINI (NÂNG CẤP XỬ LÝ 3 CÔNG CỤ)
  async sendMessage(message: string): Promise<string> {
    if (!this.isInitialized || !this.chat) {
      return 'AI service is not configured. The API_KEY environment variable is missing.';
    }

    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({
        message,
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log('Function call requested:', functionCalls[0].name);
        
        const call = functionCalls[0];
        const args = call.args;
        let apiResult: any;

        // Xử lý cả 3 công cụ
        switch (call.name) {
          case 'find_products':
            apiResult = await this.callBackendApi('find_products', args);
            break;
            
          case 'check_order_status':
            apiResult = await this.callBackendApi('check_order_status', args);
            break;

          case 'find_products_by_category':
            apiResult = await this.callBackendApi('find_products_by_category', args);
            break;
            
          default:
            console.warn(`Unknown function call: ${call.name}`);
            apiResult = { error: 'Unknown function' };
        }

        // Gửi kết quả API trở lại cho Gemini
        const functionResponsePart = {
          functionResponse: { name: call.name, response: apiResult },
        };
        const functionResponseMessage: SendMessageParameters = {
          message: [functionResponsePart],
        };
        response = await this.chat.sendMessage(functionResponseMessage);
      }

      return response.text;
    } catch (error) {
      // Lỗi này là nguyên nhân gây ra thông báo "Sorry, I'm having trouble connecting."
      console.error('Gemini API error:', error);
      return "Sorry, I'm having trouble connecting. Please try again later. (Lỗi mạng hoặc kết nối)";
    }
  }
}

// ------------------------------------------------------------------
// Export singleton
export const geminiService = new GeminiService();
