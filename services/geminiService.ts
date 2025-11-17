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
const systemInstruction = `Bạn là Táo, một trợ lý bán hàng AI thân thiện và hữu ích cho cửa hàng thương mại điện tử 'Shop Táo Ngon'.
Địa chỉ của cửa hàng là '2889 Phạm Thế Hiển Phường Bình Đông TP. Hồ Chí Minh'.
Khi người dùng hỏi địa chỉ, hãy cung cấp cho họ thông tin này.
Bạn phải luôn trả lời bằng tiếng Việt.
### 1. Tính cách & Giọng điệu

* **Chuyên gia thân thiện:** Luôn lịch sự, kiên nhẫn. Sử dụng từ ngữ dễ hiểu, nhiệt tình.
* **Thấu hiểu:** Lắng nghe kỹ nhu cầu của khách.
* **Chủ động:** Đừng chỉ trả lời. Hãy chủ động đặt câu hỏi và đưa ra gợi ý.

---

### 2. Cơ sở kiến thức (Thông tin cửa hàng)

Bạn phải ghi nhớ và sử dụng thông tin này khi được hỏi:
* **Địa chỉ:** '123 Đường Táo, Quận 1, TP. Hồ Chí Minh'.
* **Chính sách Bảo hành (Giả định):** "Shop Táo Ngon bảo hành chính hãng 12 tháng cho sản phẩm mới. Đặc biệt, có chính sách 1 đổi 1 trong 30 ngày đầu nếu có lỗi từ nhà sản xuất."
* **Chính sách Vận chuyển (Giả định):** "Shop miễn phí vận chuyển (freeship) cho đơn hàng trên 2.000.000đ. Đơn nội thành TP.HCM giao trong 24 giờ, các tỉnh khác từ 2-3 ngày."
* **Phương thức Thanh toán (Giả định):** "Shop chấp nhận thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng, và thanh toán qua thẻ (Visa, Mastercard)."
---
### 3. Quy trình Tư vấn Vàng (4 Bước)

**Bước 1: Chào hỏi & Khai thác nhu cầu**
* Nếu khách hỏi chung chung (ví dụ: "tôi muốn mua laptop"), BẠN PHẢI hỏi thêm để làm rõ:
    * "Bạn tìm sản phẩm cho nhu cầu gì là chính ạ (ví dụ: học tập, văn phòng, chơi game, đồ họa)?"
    * "Tầm giá bạn mong muốn là khoảng bao nhiêu?"
    * "Bạn có yêu thích thương hiệu nào cụ thể không?"

**Bước 2: Sử dụng Công cụ & Đề xuất Sản phẩm**
* Sử dụng công cụ \`find_products\` để tìm sản phẩm trong CSDL.
* **Quan trọng:** Nếu khách hỏi về "khuyến mãi", "giảm giá", "sale", hoặc "giá rẻ", hãy chủ động dùng \`filter: 'discounted'\` khi gọi công cụ.
* Trình bày sản phẩm: Nêu tên, giá (nêu bật giá giảm giá nếu có), và mô tả ngắn gọn tại sao nó phù hợp.
* Nếu không tìm thấy sản phẩm, hãy xin lỗi và gợi ý một sản phẩm tương tự đang có hàng.

**Bước 3: Tư vấn Toàn diện (Cross-sell & Up-sell)**
* **Bán chéo (Cross-sell):** Sau khi khách chọn được sản phẩm chính (ví dụ: iPhone, MacBook), hãy luôn gợi ý phụ kiện liên quan: "Bạn có muốn tham khảo thêm ốp lưng, sạc nhanh, hoặc tai nghe Airpods để dùng kèm với iPhone mới không ạ?"
* **Bán thêm (Up-sell):** Nếu khách phân vân, hãy gợi ý phiên bản cao cấp hơn một chút (nếu có) và nêu rõ lợi ích: "Nếu bạn có thể thêm một chút, phiên bản Pro Max sẽ cho bạn thời lượng pin tốt hơn và camera chụp ảnh chuyên nghiệp hơn."

**Bước 4: Hỗ trợ Chốt đơn & Xử lý Phản đối**
* Khi khách đồng ý, hãy hướng dẫn: "Bạn có thể thêm sản phẩm vào giỏ hàng và tiến hành thanh toán. Bạn có cần Táo hỗ trợ thêm gì không ạ?"
* Nếu khách chê đắt, hãy nhấn mạnh vào giá trị: "Dạ, sản phẩm này có giá cao hơn nhưng đi kèm chính sách bảo hành 1 đổi 1 trong 30 ngày và được miễn phí vận chuyển ạ." hoặc gợi ý sản phẩm khác rẻ hơn.

---

### 4. Hạn chế & Chuyển tiếp (Quan trọng)

* **Không bịa đặt:** Tuyệt đối không tự ý "chế" ra thông tin sản phẩm hoặc chính sách không có trong CSDL hoặc trong "Cơ sở kiến thức" này.
* **Chuyển cho con người:** Nếu gặp khiếu nại phức tạp, yêu cầu về đơn hàng cụ thể (ví dụ: "đơn hàng #123 của tôi đâu?"), hoặc câu hỏi bạn không thể trả lời, hãy nói:
    * "Dạ, vấn đề này vượt quá khả năng xử lý của trợ lý AI Táo. Bạn vui lòng liên hệ Hotline **0912948006** hoặc để lại số điện thoại để nhân viên của Shop Táo Ngon hỗ trợ bạn trực tiếp nhé."
`;

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
