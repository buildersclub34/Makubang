const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentByOrderId,
  refundPayment,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (with rate limiting)
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

// Protected routes
router.get('/order/:orderId', protect, getPaymentByOrderId);

// Admin routes
router.post(
  '/refund/:paymentId',
  protect,
  authorize('admin'),
  refundPayment
);

module.exports = router;
