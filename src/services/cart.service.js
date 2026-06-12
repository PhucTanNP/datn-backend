const supabase = require('../config/database');

class CartService {
  async getCart(userId) {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return cart || { user_id: userId, items: [] };
  }

  async syncCart(userId, items) {
    // Upsert: insert if not exists, update if exists
    const { data: cart, error } = await supabase
      .from('carts')
      .upsert({
        user_id: userId,
        items,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return cart;
  }

  async addItem(userId, productId, quantity = 1, productData = {}) {
    const cart = await this.getCart(userId);
    const items = cart.items || [];

    const existingIndex = items.findIndex(item => item.product_id === productId);
    if (existingIndex >= 0) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        product_id: productId,
        quantity,
        unit_price: productData.price || 0,
        total_price: (productData.price || 0) * quantity,
        product: productData,
      });
    }

    return this.syncCart(userId, items);
  }

  async updateItemQuantity(userId, productId, quantity) {
    const cart = await this.getCart(userId);
    let items = cart.items || [];

    if (quantity <= 0) {
      items = items.filter(item => item.product_id !== productId);
    } else {
      const item = items.find(item => item.product_id === productId);
      if (item) {
        item.quantity = quantity;
        item.total_price = item.unit_price * quantity;
      }
    }

    return this.syncCart(userId, items);
  }

  async removeItem(userId, productId) {
    const cart = await this.getCart(userId);
    const items = (cart.items || []).filter(item => item.product_id !== productId);
    return this.syncCart(userId, items);
  }

  async clearCart(userId) {
    const { data, error } = await supabase
      .from('carts')
      .upsert({
        user_id: userId,
        items: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new CartService();
