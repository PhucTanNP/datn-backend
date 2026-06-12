const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');

// All cart routes require authentication
router.use(authMiddleware);

// GET /api/v1/cart
router.get('/', cartController.getCart);

// POST /api/v1/cart/sync — đồng bộ toàn bộ giỏ hàng từ client
router.post('/sync', cartController.syncCart);

// POST /api/v1/cart/items — thêm sản phẩm vào giỏ
router.post('/items', cartController.addItem);

// PUT /api/v1/cart/items/:productId — cập nhật số lượng
router.put('/items/:productId', cartController.updateItemQuantity);

// DELETE /api/v1/cart/items/:productId — xóa sản phẩm khỏi giỏ
router.delete('/items/:productId', cartController.removeItem);

// DELETE /api/v1/cart — xóa toàn bộ giỏ hàng
router.delete('/', cartController.clearCart);

module.exports = router;
