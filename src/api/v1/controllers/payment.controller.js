const momoService = require('../../../services/momo.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.createMoMoPayment = async (req, res, next) => {
  try {
    logger.info('Create MoMo payment API called', { orderId: req.body.orderId, userId: req.user.id, ip: req.ip });
    const { orderId } = req.body;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.warn('Create MoMo payment failed: Order not found', { orderId, userId: req.user.id });
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.user_id !== req.user.id) {
      logger.warn('Create MoMo payment failed: Unauthorized', { orderId, userId: req.user.id, orderUserId: order.user_id });
      return ApiResponse.error(res, 'Unauthorized', 403);
    }

    const momoResponse = await momoService.createPayment({
      orderId: order.order_number,
      amount: Math.round(Number(order.total_amount)),
      orderInfo: `Thanh toán đơn hàng ${order.order_number} - DRC Tire Shop`,
    });

    // Save payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        method: 'momo',
        amount: order.total_amount,
        momo_order_id: momoResponse.orderId,
        momo_request_id: momoResponse.requestId,
        momo_pay_url: momoResponse.payUrl,
        momo_response: momoResponse,
      });

    if (paymentError) throw paymentError;

    logger.info('MoMo payment created successfully', { orderId, momoOrderId: momoResponse.orderId, amount: order.totalAmount });
    return ApiResponse.success(res, {
      payUrl: momoResponse.payUrl,
      deeplink: momoResponse.deeplink,
      qrCodeUrl: momoResponse.qrCodeUrl,
    });
  } catch (error) {
    logger.error('Create MoMo payment failed', error, { orderId: req.body.orderId, userId: req.user.id });
    next(error);
  }
};

exports.momoIPN = async (req, res, next) => {
  try {
    logger.info('MoMo IPN received', { body: req.body, ip: req.ip });
    const isValid = momoService.verifyIPN(req.body);
    if (!isValid) {
      logger.warn('MoMo IPN failed: Invalid signature', { body: req.body });
      return ApiResponse.error(res, 'Invalid signature', 400);
    }

    const { orderId, resultCode, transId } = req.body;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('momo_order_id', orderId)
      .single();

    if (paymentError || !payment) {
      logger.warn('MoMo IPN failed: Payment not found', { momoOrderId: orderId });
      return ApiResponse.error(res, 'Payment not found', 404);
    }

    const status = resultCode === 0 ? 'success' : 'failed';

    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status,
        momo_trans_id: String(transId),
        momo_response: req.body,
        paid_at: status === 'success' ? new Date().toISOString() : null,
      })
      .eq('id', payment.id);

    if (updatePaymentError) throw updatePaymentError;

    // Update order status if payment successful
    if (status === 'success') {
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', payment.order_id);

      if (updateOrderError) throw updateOrderError;
      logger.info('Payment successful, order confirmed', { paymentId: payment.id, orderId: payment.order_id, momoOrderId: orderId });
    } else {
      logger.warn('Payment failed', { paymentId: payment.id, orderId: payment.order_id, momoOrderId: orderId, resultCode });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('MoMo IPN processing failed', error, { body: req.body });
    next(error);
  }
};
