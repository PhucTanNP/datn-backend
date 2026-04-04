const authService = require('../../../services/auth.service');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.register = async (req, res, next) => {
  try {
    logger.info('Register API called', { email: req.body.email, ip: req.ip });
    const { email, password, fullName, phone, address } = req.body;

    if (!email || !password) {
      logger.warn('Register failed: Missing email or password', { email });
      return ApiResponse.error(res, 'Email and password are required', 400);
    }

    if (password.length < 6) {
      logger.warn('Register failed: Password too short', { email });
      return ApiResponse.error(res, 'Password must be at least 6 characters', 400);
    }

    const result = await authService.register({ email, password, fullName, phone, address });
    logger.info('User registered successfully', { userId: result.id, email });
    return ApiResponse.created(res, result, 'Registration successful');
  } catch (error) {
    logger.error('Register failed', error, { email: req.body.email });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    logger.info('Login API called', { email: req.body.email, ip: req.ip });
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login failed: Missing email or password', { email });
      return ApiResponse.error(res, 'Email and password are required', 400);
    }

    const result = await authService.login({ email, password });
    logger.info('User logged in successfully', { userId: result.user.id, email });
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    logger.error('Login failed', error, { email: req.body.email });
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    logger.info('Refresh token API called', { ip: req.ip });
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn('Refresh token failed: Missing token');
      return ApiResponse.error(res, 'Refresh token is required', 400);
    }

    const tokens = await authService.refreshToken(refreshToken);
    logger.info('Token refreshed successfully');
    return ApiResponse.success(res, tokens, 'Token refreshed');
  } catch (error) {
    logger.error('Refresh token failed', error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    logger.info('Logout API called', { userId: req.user?.id, ip: req.ip });
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    logger.info('User logged out successfully', { userId: req.user?.id });
    return ApiResponse.success(res, null, 'Logged out');
  } catch (error) {
    logger.error('Logout failed', error, { userId: req.user?.id });
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    logger.info('Get profile API called', { userId: req.user?.id, ip: req.ip });
    logger.info('Profile retrieved successfully', { userId: req.user?.id });
    return ApiResponse.success(res, req.user);
  } catch (error) {
    logger.error('Get profile failed', error, { userId: req.user?.id });
    next(error);
  }
};
