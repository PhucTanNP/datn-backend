const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');
const { uploadPaymentProof } = require('../../../middlewares/upload.middleware');

// POST /api/v1/orders
router.post('/', authMiddleware, orderController.create);

// POST /api/v1/orders/:id/payment-proof
router.post('/:id/payment-proof', 
  authMiddleware, 
  uploadPaymentProof.single('image'), 
  orderController.uploadPaymentProof
);

// GET /api/v1/orders/my
router.get('/my', authMiddleware, orderController.getMyOrders);

// GET /api/v1/orders/:id
router.get('/:id', authMiddleware, orderController.getById);

// Admin routes
// GET /api/v1/orders/admin
router.get('/admin', authMiddleware, adminMiddleware, orderController.getAllOrders);

module.exports = router;
