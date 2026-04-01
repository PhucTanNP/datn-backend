const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');

// POST /api/v1/orders
router.post('/', authMiddleware, orderController.create);

// GET /api/v1/orders/my
router.get('/my', authMiddleware, orderController.getMyOrders);

// Admin routes
// GET /api/v1/admin/orders
router.get('/admin',
  authMiddleware, adminMiddleware,
  orderController.getAllOrders
);

// PATCH /api/v1/admin/orders/:id/status
router.patch('/:id/status',
  authMiddleware, adminMiddleware,
  orderController.updateStatus
);

module.exports = router;
