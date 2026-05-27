const orderService = require('../../../services/order.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.create = async (req, res, next) => {
  try {
    logger.info('Create order API called', { userId: req.user.id, itemCount: req.body.items?.length, ip: req.ip });
    const { items, shippingName, shippingPhone, shippingAddress, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logger.warn('Create order failed: No items', { userId: req.user.id });
      return ApiResponse.error(res, 'Order items are required', 400);
    }

    if (!shippingName || !shippingPhone || !shippingAddress) {
      logger.warn('Create order failed: Missing shipping info', { userId: req.user.id });
      return ApiResponse.error(res, 'Shipping info is required', 400);
    }

    const order = await orderService.create(req.user.id, {
      items, shippingName, shippingPhone, shippingAddress, notes,
    });

    logger.info('Order created successfully', { orderId: order.id, orderNumber: order.orderNumber, userId: req.user.id });
    return ApiResponse.created(res, order, 'Order created');
  } catch (error) {
    logger.error('Create order failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.uploadPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info('Upload payment proof API called', { orderId: id, userId: req.user.id });

    if (!req.file) {
      return ApiResponse.error(res, 'Payment proof image is required', 400);
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.user_id !== req.user.id) {
      return ApiResponse.error(res, 'Unauthorized', 403);
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_proof_url: req.file.path,
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    logger.info('Payment proof uploaded successfully', { orderId: id, url: req.file.path });
    return ApiResponse.success(res, { imageUrl: req.file.path }, 'Payment proof uploaded successfully');
  } catch (error) {
    logger.error('Upload payment proof failed', error);
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    logger.info('Get my orders API called', { userId: req.user.id, query: req.query, ip: req.ip });
    const { orders, pagination } = await orderService.getMyOrders(req.user.id, req.query);
    logger.info('User orders retrieved successfully', { userId: req.user.id, orderCount: orders.length });
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    logger.error('Get my orders failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    logger.info('Get all orders API called', { query: req.query, userId: req.user?.id, ip: req.ip });
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    logger.info('All orders retrieved successfully', { orderCount: orders.length });
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    logger.error('Get all orders failed', error);
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    logger.info('Update order status API called', { orderId: req.params.id, status: req.body.status, userId: req.user?.id, ip: req.ip });
    const { status } = req.body;
    const order = await orderService.updateStatus(req.params.id, status);
    logger.info('Order status updated successfully', { orderId: req.params.id, newStatus: status });
    return ApiResponse.success(res, order, 'Order status updated');
  } catch (error) {
    logger.error('Update order status failed', error, { orderId: req.params.id });
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    logger.info('Get order by ID API called', { orderId: req.params.id, userId: req.user?.id, ip: req.ip });
    const order = await orderService.getById(req.params.id);

    // Check authorization: user can only see their own order or admin can see any
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn('Unauthorized access to order', { orderId: req.params.id, userId: req.user.id });
      return ApiResponse.error(res, 'Unauthorized', 403);
    }

    logger.info('Order retrieved successfully', { orderId: req.params.id });
    return ApiResponse.success(res, order);
  } catch (error) {
    logger.error('Get order by ID failed', error, { orderId: req.params.id });
    next(error);
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    logger.info('Delete order API called', { orderId: req.params.id, userId: req.user?.id, ip: req.ip });
    const result = await orderService.deleteOrder(req.params.id);
    logger.info('Order deleted successfully', { orderId: req.params.id });
    return ApiResponse.success(res, result, 'Order deleted');
  } catch (error) {
    logger.error('Delete order failed', error, { orderId: req.params.id });
    next(error);
  }
};
