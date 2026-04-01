const ApiResponse = require('../utils/response');

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Admin access required', 403);
  }
  next();
};

module.exports = adminMiddleware;
