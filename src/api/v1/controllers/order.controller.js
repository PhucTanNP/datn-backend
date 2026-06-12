const orderService = require('../../../services/order.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.create = async (req, res, next) => {
  try {
    const { items, shippingName, shippingPhone, shippingAddress, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.error(res, 'Order items are required', 400);
    }

    if (!shippingName || !shippingPhone || !shippingAddress) {
      return ApiResponse.error(res, 'Shipping info is required', 400);
    }

    const order = await orderService.create(req.user.id, {
      items, shippingName, shippingPhone, shippingAddress, notes,
    });

    return ApiResponse.created(res, order, 'Order created');
  } catch (error) {
    logger.error('Create order failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.uploadPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;

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

    return ApiResponse.success(res, { imageUrl: req.file.path }, 'Payment proof uploaded successfully');
  } catch (error) {
    logger.error('Upload payment proof failed', error);
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const { orders, pagination } = await orderService.getMyOrders(req.user.id, req.query);
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    logger.error('Get my orders failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    logger.error('Get all orders failed', error);
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, payment_status, is_paid } = req.body;
    const order = await orderService.updateStatus(req.params.id, status, { payment_status, is_paid });
    return ApiResponse.success(res, order, 'Order status updated');
  } catch (error) {
    logger.error('Update order status failed', error, { orderId: req.params.id });
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await orderService.getById(req.params.id);

    // Check authorization: user can only see their own order or admin can see any
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Unauthorized', 403);
    }

    return ApiResponse.success(res, order);
  } catch (error) {
    logger.error('Get order by ID failed', error, { orderId: req.params.id });
    next(error);
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    return ApiResponse.success(res, result, 'Order deleted');
  } catch (error) {
    logger.error('Delete order failed', error, { orderId: req.params.id });
    next(error);
  }
};
