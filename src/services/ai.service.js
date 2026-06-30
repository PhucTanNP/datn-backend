/**
 * AI Service — kết nối BE với GraphRag (AI Service)
 *
 * GraphRag endpoints:
 *   GET  /query?q=<message>   — Chat với RAG (knowledge graph)
 *   GET  /health              — Health check
 *   POST /reset               — Reset context hội thoại
 *
 * GraphRag KHÔNG kết nối Supabase, chỉ detect/embed và trả kết quả.
 */
const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.baseUrl = process.env.GRAPHRAG_URL || process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.apiKey = process.env.AI_SERVICE_SECRET || process.env.GRAPHRAG_API_KEY || 'internal-secret-key';
  }

  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Gửi tin nhắn chat tới GraphRag
   * @param {string} message - Nội dung tin nhắn
   * @param {Array} history - Lịch sử hội thoại (optional)
   * @param {string} mode - "fast" (template) hoặc "deep" (Gemini paraphrase)
   * @returns {Promise<{result: string}>}
   */
  async chat(message, history = [], mode = 'fast') {
    try {
      // Gọi POST /api/v1/chat — có history
      const response = await axios.post(
        `${this.baseUrl}/api/v1/chat`,
        { message, history, mode },
        { headers: this._headers(), timeout: 30000 }
      );

      return response.data;
    } catch (error) {
      // Fallback: nếu GraphRag không available, throw để BE xử lý
      throw new Error(`GraphRag chat failed: ${error.message}`);
    }
  }

  /**
   * Kiểm tra lốp — gửi ảnh lên AI Service để detect/embed
   * GraphRag chỉ detect/embed và trả kết quả, KHÔNG lưu Supabase
   * @param {string} imageUrl - URL ảnh từ Cloudinary
   * @returns {Promise<Object>} Kết quả phân tích
   */
  async inspectTire(imageUrl) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/detect`,
        { image_url: imageUrl },
        {
          headers: this._headers(),
          timeout: 60000,
        }
      );

      return response.data;
    } catch (error) {
      // Fallback: nếu GraphRag chưa có detect endpoint, throw để controller xử lý
      throw new Error(`GraphRag inspect failed: ${error.message} — cần thêm endpoint /api/v1/detect vào GraphRag`);
    }
  }

  /**
   * Kiểm tra health của GraphRag
   */
  async healthCheck() {
    const response = await axios.get(`${this.baseUrl}/health`, {
      headers: this._headers(),
      timeout: 5000,
    });
    return response.data;
  }

  /**
   * Recommend lốp theo tên xe — query Neo4j lấy lốp trước + sau, tất cả brand × pattern
   * @param {string} vehicleName - Tên xe (vd: "Vario 125 Click 125i")
   * @returns {Promise<{success: boolean, vehicle_name: string, front_size: string, rear_size: string, tires: Array}>}
   */
  async recommendByVehicle(vehicleName) {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/detect/recommend`,
      { vehicle_name: vehicleName },
      { headers: this._headers(), timeout: 30000 }
    );
    return response.data;
  }

  /**
   * Tìm xe theo size lốp — dùng để filter dropdown sau khi detect
   * @param {string} size - Size lốp đã detect (vd: "80/90-14")
   * @returns {Promise<{success: boolean, vehicles: Array<{name: string}>}>}
   */
  async getVehiclesBySize(size) {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/detect/vehicles-by-size`,
      { size },
      { headers: this._headers(), timeout: 15000 }
    );
    return response.data;
  }

  /**
   * CASE 3: Tìm xe theo pattern — dùng khi chỉ detect được pattern
   * @param {string} pattern - Mã gai (vd: "119", "D354")
   * @returns {Promise<{success: boolean, vehicles: Array<{name: string}>}>}
   */
  async getVehiclesByPattern(pattern) {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/detect/vehicles-by-pattern`,
      { pattern },
      { headers: this._headers(), timeout: 15000 }
    );
    return response.data;
  }

  /**
   * CASE 3: Lấy size lốp trước + sau của xe
   * @param {string} vehicleName - Tên xe
   * @returns {Promise<{success: boolean, front_size: string|null, rear_size: string|null}>}
   */
  async getSizesByVehicle(vehicleName) {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/detect/sizes-by-vehicle`,
      { vehicle_name: vehicleName },
      { headers: this._headers(), timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Reset context hội thoại của GraphRag
   */
  async resetContext() {
    const response = await axios.post(`${this.baseUrl}/reset`, {}, {
      headers: this._headers(),
      timeout: 5000,
    });
    return response.data;
  }
}

module.exports = new AIService();
