const momoService = require('../../services/momo.service');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');

exports.createMoMoPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true } } },
    });

    if (!order) {
      return ApiResponse.error(res, 'Order not found', 404);
    }

    if (order.userId !== req.user.id) {
      return ApiResponse.error(res, 'Unauthorized', 403);
    }

    const momoResponse = await momoService.createPayment({
      orderId: order.orderNumber,
      amount: Math.round(Number(order.totalAmount)),
      orderInfo: `Thanh toán đơn hàng ${order.orderNumber} - DRC Tire Shop`,
    });

    // Save payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'momo',
        amount: order.totalAmount,
        momoOrderId: momoResponse.orderId,
        momoRequestId: momoResponse.requestId,
        momoPayUrl: momoResponse.payUrl,
        momoResponse: momoResponse,
      },
    });

    return ApiResponse.success(res, {
      payUrl: momoResponse.payUrl,
      deeplink: momoResponse.deeplink,
      qrCodeUrl: momoResponse.qrCodeUrl,
    });
  } catch (error) {
    next(error);
  }
};

exports.momoIPN = async (req, res, next) => {
  try {
    const isValid = momoService.verifyIPN(req.body);
    if (!isValid) {
      return ApiResponse.error(res, 'Invalid signature', 400);
    }

    const { orderId, resultCode, transId } = req.body;

    const payment = await prisma.payment.findFirst({
      where: { momoOrderId: orderId },
    });

    if (!payment) {
      return ApiResponse.error(res, 'Payment not found', 404);
    }

    const status = resultCode === 0 ? 'success' : 'failed';

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        momoTransId: String(transId),
        momoResponse: req.body,
        paidAt: status === 'success' ? new Date() : null,
      },
    });

    // Update order status if payment successful
    if (status === 'success') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'confirmed' },
      });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
