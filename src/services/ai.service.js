const axios = require('axios');

class AIService {
  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.secret = process.env.AI_SERVICE_SECRET || 'internal-secret-key';
  }

  async inspectTire(imageUrl) {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/inspect`,
      { image_url: imageUrl },
      {
        headers: {
          'X-Internal-Secret': this.secret,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    return response.data;
  }

  async healthCheck() {
    const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
    return response.data;
  }
}

module.exports = new AIService();
