const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey:   process.env.MOMO_ACCESS_KEY,
  secretKey:   process.env.MOMO_SECRET_KEY,
  endpoint:    'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL,
  ipnUrl:      process.env.MOMO_IPN_URL,
};

module.exports = MOMO_CONFIG;
