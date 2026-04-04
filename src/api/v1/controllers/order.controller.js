const orderService = require('../../../services/order.service');
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
