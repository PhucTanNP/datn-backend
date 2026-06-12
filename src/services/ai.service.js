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
   * @returns {Promise<{result: string}>}
   */
  async chat(message, history = []) {
    try {
      // GraphRag dùng query param ?q=
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: { q: message },
        headers: this._headers(),
        timeout: 30000,
      });

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
