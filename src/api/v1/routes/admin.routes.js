const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const categoriesController = require('../controllers/categories.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');
const { uploadProduct } = require('../../../middlewares/upload.middleware');

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/v1/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/v1/admin/users
router.get('/users', adminController.getUsers);

// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', adminController.updateUserStatus);

// GET /api/v1/admin/orders
router.get('/orders', adminController.getOrders);

// GET /api/v1/admin/products
router.get('/products', adminController.getProducts);

// POST /api/v1/admin/products
router.post('/products', uploadProduct.array('images', 5), adminController.createProduct);

// GET /api/v1/admin/analytics
router.get('/analytics', adminController.getAnalytics);

// Categories management
// GET /api/v1/admin/categories
router.get('/categories', categoriesController.getAll);

// POST /api/v1/admin/categories
router.post('/categories', categoriesController.create);

// PUT /api/v1/admin/categories/:id
router.put('/categories/:id', categoriesController.update);

// DELETE /api/v1/admin/categories/:id
router.delete('/categories/:id', categoriesController.delete);

module.exports = router;
