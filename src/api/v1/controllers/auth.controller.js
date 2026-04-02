const authService = require('../../../services/auth.service');
const ApiResponse = require('../../../utils/response');

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
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, req.user);
  } catch (error) {
    next(error);
  }
};
