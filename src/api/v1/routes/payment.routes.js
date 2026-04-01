const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');

// POST /api/v1/payments/momo
router.post('/momo', authMiddleware, paymentController.createMoMoPayment);

// POST /api/v1/payments/momo/ipn (webhook - no auth)
router.post('/momo/ipn', paymentController.momoIPN);

module.exports = router;
