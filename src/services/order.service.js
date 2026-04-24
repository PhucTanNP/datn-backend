const supabase = require('../config/database');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class OrderService {
  async create(userId, { items, shippingName, shippingPhone, shippingAddress, notes }) {
    // Validate products & calculate totals
    const productIds = items.map((i) => i.productId);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, price, sale_price, stock_quantity, images:product_images(url)')
      .in('id', productIds)
      .eq('is_active', true);

    if (productError || products.length !== items.length) {
      throw Object.assign(new Error('Some products not found or inactive'), { statusCode: 400 });
    }

    const productMap = {};
    products.forEach((p) => { productMap[p.id] = p; });

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap[item.productId];
      if (product.stock_quantity < item.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for ${product.name}`),
          { statusCode: 400 }
        );
      }

      const unitPrice = product.sale_price || product.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += Number(totalPrice);

      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        snapshot: {
          name: product.name,
          sku: product.sku,
          image: product.images?.[0]?.url,
        },
      };
    });

    const shippingFee = subtotal >= 500000 ? 0 : 30000; // Free ship trên 500k
    const totalAmount = subtotal + shippingFee;
    const orderNumber = await generateOrderNumber();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderItems.map(item => ({
          order_id: order.id,
          ...item,
        }))
      );

    if (itemsError) throw itemsError;

    // Update product stock
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        p_product_id: item.productId,
        p_quantity: -item.quantity,
      });
      if (stockError) throw stockError;
    }

    return { ...order, items: orderItems };
  }

  async getMyOrders(userId, query) {
    const { page, limit, skip } = getPagination(query);

    let supabaseQuery = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*, product:products(name, slug))
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    const { data: orders, error, count } = await supabaseQuery;

    if (error) throw error;

    return { orders, pagination: getPaginationMeta(count, page, limit) };
  }

  async getAllOrders(query) {
    const { page, limit, skip } = getPagination(query);

    let supabaseQuery = supabase
      .from('orders')
      .select(`
        *,
        user:users(full_name, email, phone),
        items:order_items(*)
      `, { count: 'exact' })
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    const { data: orders, error, count } = await supabaseQuery;

    if (error) throw error;

    return { orders, pagination: getPaginationMeta(count, page, limit) };
  }

  async updateStatus(orderId, status) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select(`
        *,
        items:order_items(*),
        payments:order_payments(*)
      `)
      .single();

    if (error) throw error;

    return order;
  }

  async getById(orderId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*, product:products(name, slug, sku)),
        user:users(full_name, email, phone)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    return order;
  }

  async deleteOrder(orderId) {
    // Get order with items
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // Restore stock for all items
    for (const item of order.items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity, // Restore stock (positive)
      });
      if (stockError) throw stockError;
    }

    // Delete order items first (cascade)
    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteItemsError) throw deleteItemsError;

    // Delete order
    const { error: deleteOrderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteOrderError) throw deleteOrderError;

    return { message: 'Order deleted successfully', orderId };
  }
}

module.exports = new OrderService();
