const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');

// Commented out MoMo routes - not needed yet
/*
router.post('/momo', authMiddleware, paymentController.createMoMoPayment);
router.post('/momo/ipn', paymentController.momoIPN);
*/

module.exports = router;
