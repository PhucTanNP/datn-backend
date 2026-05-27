const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
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
      .select('id, email, full_name, phone, address, avatar_url, role, is_active, note, created_at, updated_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return ApiResponse.error(res, 'User not found or inactive', 401);
    }

    // Normalize user object to snake_case to match frontend types
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      avatar_url: user.avatar_url,
      role: user.role,
      is_active: user.is_active,
      status: user.status,
      note: user.note,
      created_at: user.created_at,
      updated_at: user.updated_at,
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
