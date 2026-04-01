const ApiResponse = require('../utils/response');

const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return ApiResponse.error(res, `${field} already exists`, 409);
  }

  if (err.code === 'P2025') {
    return ApiResponse.error(res, 'Record not found', 404);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiResponse.error(res, 'File too large', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiResponse.error(res, 'Unexpected file field', 400);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, err.message, 400);
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorMiddleware;
