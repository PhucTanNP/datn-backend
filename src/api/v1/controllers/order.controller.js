const orderService = require('../../../services/order.service');
const ApiResponse = require('../../../utils/response');

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
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const { orders, pagination } = await orderService.getMyOrders(req.user.id, req.query);
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    return ApiResponse.paginated(res, orders, pagination);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateStatus(req.params.id, status);
    return ApiResponse.success(res, order, 'Order status updated');
  } catch (error) {
    next(error);
  }
};
