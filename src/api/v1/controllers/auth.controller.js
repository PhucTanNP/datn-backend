const authService = require('../../../services/auth.service');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.register = async (req, res, next) => {
  try {
    const { email, password, fullName, phone, address } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'Email and password are required', 400);
    }

    if (password.length < 6) {
      return ApiResponse.error(res, 'Password must be at least 6 characters', 400);
    }

    const result = await authService.register({ email, password, fullName, phone, address });
    return ApiResponse.created(res, result, 'Registration successful');
  } catch (error) {
    logger.error('Register failed', error, { email: req.body.email });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'Email and password are required', 400);
    }

    const result = await authService.login({ email, password });
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    logger.error('Login failed', error, { email: req.body.email });
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token is required', 400);
    }

    const tokens = await authService.refreshToken(refreshToken);
    return ApiResponse.success(res, tokens, 'Token refreshed');
  } catch (error) {
    logger.error('Refresh token failed', error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return ApiResponse.success(res, null, 'Logged out');
  } catch (error) {
    logger.error('Logout failed', error, { userId: req.user?.id });
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, req.user);
  } catch (error) {
    logger.error('Get profile failed', error, { userId: req.user?.id });
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { full_name, phone, address, email } = req.body;

    const updateData = {
      full_name,
      phone,
      address,
      email,
      updated_at: new Date().toISOString(),
    };

    const supabase = require('../../../config/database');

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Profile update failed', error, { tag: 'auth' });
      throw error;
    }

    return ApiResponse.success(res, user, 'Profile updated');
  } catch (error) {
    logger.error('Update profile error', error, { userId: req.user?.id });
    next(error);
  }
};
