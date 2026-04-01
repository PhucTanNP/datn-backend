const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/v1/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/v1/admin/users
router.get('/users', adminController.getUsers);

// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', adminController.updateUserStatus);

// GET /api/v1/admin/analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
