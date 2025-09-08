import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Create a Razorpay order (protected)
router.post('/order', authenticate, paymentController.createTestOrder);

// Webhook endpoint for Razorpay to send payment updates (no auth)
router.post('/webhook', paymentController.verifyWebhook);

export default router;
