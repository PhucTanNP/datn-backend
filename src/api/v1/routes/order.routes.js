const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');

// POST /api/v1/orders
router.post('/', authMiddleware, orderController.create);

// GET /api/v1/orders/my
router.get('/my', authMiddleware, orderController.getMyOrders);

// GET /api/v1/orders/:id
router.get('/:id', authMiddleware, orderController.getById);

// Admin routes
// GET /api/v1/orders/admin
router.get('/admin', authMiddleware, adminMiddleware, orderController.getAllOrders);

// PUT /api/v1/orders/:id (Admin update order status)
router.put('/:id', authMiddleware, adminMiddleware, orderController.updateStatus);

// DELETE /api/v1/orders/:id (Admin delete order)
router.delete('/:id', authMiddleware, adminMiddleware, orderController.deleteOrder);

module.exports = router;
