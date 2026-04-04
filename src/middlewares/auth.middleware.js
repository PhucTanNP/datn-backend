const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const ApiResponse = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Access token is required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return ApiResponse.error(res, 'User not found or inactive', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      phone: user.phone,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 'Invalid token', 401);
    }
    return ApiResponse.error(res, 'Authentication failed', 401);
  }
};

module.exports = authMiddleware;
