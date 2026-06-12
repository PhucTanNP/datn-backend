const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const { uploadInspection } = require('../../../middlewares/upload.middleware');

// POST /api/v1/chat — gửi tin nhắn chatbot (không cần đăng nhập)
router.post('/', chatController.chat);

// POST /api/v1/chat/inspect — kiểm tra lốp qua chatbot
router.post('/inspect', uploadInspection.single('image'), chatController.inspect);

module.exports = router;
