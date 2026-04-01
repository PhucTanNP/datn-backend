const crypto = require('crypto');
const axios  = require('axios');
const MOMO_CONFIG = require('../config/momo');

class MoMoService {
  async createPayment({ orderId, amount, orderInfo }) {
    const requestId = `${MOMO_CONFIG.partnerCode}-${Date.now()}`;
    const rawSignature = [
      `accessKey=${MOMO_CONFIG.accessKey}`,
      `amount=${amount}`,
      `extraData=`,
      `ipnUrl=${MOMO_CONFIG.ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${MOMO_CONFIG.partnerCode}`,
      `redirectUrl=${MOMO_CONFIG.redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=payWithMethod`,
    ].join('&');

    const signature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode:  MOMO_CONFIG.partnerCode,
      requestId,
      amount: parseInt(amount),
      orderId,
      orderInfo,
      redirectUrl:  MOMO_CONFIG.redirectUrl,
      ipnUrl:       MOMO_CONFIG.ipnUrl,
      requestType:  'payWithMethod',
      extraData:    '',
      lang:         'vi',
      signature,
    };

    const { data } = await axios.post(MOMO_CONFIG.endpoint, body);
    return data;
  }

  verifyIPN(body) {
    const { signature, ...rest } = body;

    // Build raw signature from sorted keys
    const sortedKeys = [
      'accessKey', 'amount', 'extraData', 'message', 'orderId',
      'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId',
      'responseTime', 'resultCode', 'transId',
    ];

    const rawSignature = sortedKeys
      .filter((k) => rest[k] !== undefined)
      .map((k) => `${k}=${rest[k]}`)
      .join('&');

    const expected = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    return expected === signature;
  }
}

module.exports = new MoMoService();
