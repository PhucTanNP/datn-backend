/**
 * Chat service tạm thời — xử lý hội thoại đơn giản
 * Sau này sẽ thay thế bằng GraphRag/AI thật
 */
const supabase = require('../config/database');
const logger = require('../utils/logger');

class ChatService {
  /**
   * Xử lý tin nhắn người dùng và trả về phản hồi
   */
  async processMessage(userId, message, history = []) {
    const msg = message.toLowerCase().trim();

    // Phân loại ý định đơn giản
    const intent = this._classifyIntent(msg);

    switch (intent) {
      case 'greeting':
        return this._greeting();
      case 'product_search':
        return await this._searchProducts(msg);
      case 'product_info':
        return await this._getProductInfo(msg);
      case 'order_status':
        return await this._getOrderStatus(userId);
      case 'inspect_info':
        return this._inspectInfo();
      case 'help':
        return this._help();
      case 'price':
        return await this._getPriceRange(msg);
      case 'contact':
        return this._contact();
      default:
        return this._fallback();
    }
  }

  _classifyIntent(msg) {
    if (/^(chào|hi|hello|hey|helo|heluu|2|chao)\b/.test(msg)) return 'greeting';
    if (/(giá|bao nhiêu|cost|price)/.test(msg) && /(lốp|tire|xe)/.test(msg)) return 'price';
    if (/(tìm|kiếm|search|có.*không|bán)/.test(msg) && /(lốp|tire|xe)/.test(msg)) return 'product_search';
    if (/^(có.*không|thông tin|info|giới thiệu)\b/.test(msg)) return 'product_info';
    if (/(đơn|order|hàng|ship|giao)/.test(msg) && /(đâu|đến|chưa|nào|status|trạng thái)/.test(msg)) return 'order_status';
    if (/(inspect|kiểm tra|mòn|nứt|ai|phân tích)/.test(msg)) return 'inspect_info';
    if (/(liên hệ|hotline|phone|sđt|số điện)/.test(msg)) return 'contact';
    if (/(help|giúp|hỗ trợ|có thể|menu)/.test(msg)) return 'help';
    return 'unknown';
  }

  _greeting() {
    return {
      text: '👋 Chào bạn! Tôi là trợ lý AI của DRC Tires.\n\nTôi có thể giúp gì cho bạn?\n\n• 🔍 Tìm kiếm lốp xe\n• 💰 Xem giá & thông số\n• 📦 Kiểm tra đơn hàng\n• 🔬 Phân tích ảnh lốp\n• 📞 Liên hệ hỗ trợ',
      actions: [
        { label: '🔍 Tìm lốp', value: 'tìm lốp xe' },
        { label: '💰 Xem giá', value: 'có lốp giá bao nhiêu' },
        { label: '🔬 Kiểm tra lốp', value: 'kiểm tra lốp' },
        { label: '📞 Liên hệ', value: 'liên hệ' },
      ]
    };
  }

  async _searchProducts(msg) {
    // Trích xuất từ khóa
    const keywords = msg
      .replace(/tìm|kiếm|có|không|bán|giá|lốp|tire|xe/g, '')
      .trim() || 'lốp';

    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, sale_price, slug, size, stock_quantity')
      .or(`name.ilike.%${keywords}%,size.ilike.%${keywords}%,sku.ilike.%${keywords}%`)
      .eq('is_active', true)
      .limit(5);

    if (!products || products.length === 0) {
      return {
        text: `❌ Không tìm thấy sản phẩm nào với từ khóa "${keywords}".\nBạn thử tìm với từ khóa khác nhé!`,
      };
    }

    const list = products.map(p =>
      `• **${p.name}** — ${p.sale_price || p.price}đ` +
      `${p.size ? ` (${p.size})` : ''}` +
      `${p.stock_quantity > 0 ? ' ✅ Còn hàng' : ' ❌ Hết'}`
    ).join('\n');

    return {
      text: `🔍 Tìm thấy ${products.length} sản phẩm:\n\n${list}\n\n👉 Xem chi tiết tại trang sản phẩm.`,
      actions: [{ label: '🔍 Tìm lốp khác', value: 'tìm lốp' }]
    };
  }

  async _getPriceRange(msg) {
    const numbers = msg.match(/\d+/g);
    let query = supabase
      .from('products')
      .select('id, name, price, sale_price, slug, size')
      .eq('is_active', true)
      .limit(5);

    if (numbers && numbers.length >= 2) {
      const min = parseInt(numbers[0]);
      const max = parseInt(numbers[1]);
      query = query.gte('price', min).lte('price', max);
    }

    const { data: products } = await query;

    if (!products || products.length === 0) {
      return { text: '❌ Không tìm thấy sản phẩm trong khoảng giá này.' };
    }

    const list = products.map(p =>
      `• **${p.name}** — ${(p.sale_price || p.price).toLocaleString()}đ`
    ).join('\n');

    return {
      text: `💰 Sản phẩm trong tầm giá:\n\n${list}\n\n👉 Xem thêm tại cửa hàng!`,
    };
  }

  async _getOrderStatus(userId) {
    const { data: orders } = await supabase
      .from('orders')
      .select('order_number, total_amount, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!orders || orders.length === 0) {
      return { text: '📦 Bạn chưa có đơn hàng nào.\n👉 Ghé cửa hàng để đặt hàng ngay!' };
    }

    const list = orders.map(o =>
      `• **${o.order_number}** — ${o.total_amount.toLocaleString()}đ — ${this._statusText(o.status)}`
    ).join('\n');

    return {
      text: `📦 Đơn hàng gần đây của bạn:\n\n${list}\n\n👉 Xem chi tiết trong mục "Đơn hàng".`,
      actions: [{ label: '📦 Xem đơn hàng', value: 'đơn hàng' }]
    };
  }

  _inspectInfo() {
    return {
      text: '🔬 **Kiểm tra lốp bằng AI**\n\nChụp ảnh lốp xe của bạn, AI sẽ phân tích:\n• Mức độ mòn của lốp\n• Phát hiện vết nứt\n• Gợi ý thay thế\n\n👉 Click nút bên dưới để dùng thử!',
      actions: [{ label: '🔬 Kiểm tra ngay', value: 'inspect' }]
    };
  }

  _help() {
    return this._greeting();
  }

  _contact() {
    return {
      text: '📞 **Liên hệ DRC Tires**\n\n• Hotline: **1900 1234**\n• Email: info@drctires.vn\n• Địa chỉ: Đà Nẵng, Việt Nam\n• Giờ làm việc: 8:00 - 17:00 (T2-T7)',
    };
  }

  async _getProductInfo(msg) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .limit(10);

    const catList = categories?.map(c => `• **${c.name}**`).join('\n') || '';

    return {
      text: `🛞 **Danh mục sản phẩm DRC Tires**\n\n${catList}\n\n👉 Ghé cửa hàng để xem tất cả sản phẩm!`,
      actions: [{ label: '🛞 Xem sản phẩm', value: 'tìm lốp' }]
    };
  }

  _fallback() {
    return {
      text: '🤔 Xin lỗi, tôi chưa hiểu ý bạn. Bạn có thể thử:\n\n• 🔍 Tìm sản phẩm (vd: "tìm lốp 17 inch")\n• 💰 Hỏi giá (vd: "lốp giá bao nhiêu")\n• 📦 Kiểm tra đơn hàng (vd: "đơn hàng của tôi")\n• 🔬 Kiểm tra lốp bằng AI\n• 📞 Liên hệ hỗ trợ\n\nHoặc gõ "help" để xem hướng dẫn!',
      actions: [
        { label: '🔍 Tìm lốp', value: 'tìm lốp' },
        { label: '📞 Liên hệ', value: 'liên hệ' },
        { label: '🔬 AI kiểm tra', value: 'kiểm tra lốp' },
      ]
    };
  }

  _statusText(status) {
    const map = {
      pending: '⏳ Chờ xác nhận',
      confirmed: '✅ Đã xác nhận',
      processing: '📦 Đang xử lý',
      shipped: '🚚 Đang giao',
      delivered: '🎉 Đã giao',
      cancelled: '❌ Đã hủy',
      refunded: '💳 Đã hoàn tiền',
    };
    return map[status] || status;
  }
}

module.exports = new ChatService();
