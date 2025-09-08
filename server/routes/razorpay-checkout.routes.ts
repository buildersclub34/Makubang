import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { razorpayCheckoutController } from '../controllers/razorpay-checkout.controller';

const router = Router();

// Create order and Razorpay order
router.post('/create-order', authenticate, (req, res) => 
  razorpayCheckoutController.createOrder(req, res)
);

// Verify payment
router.post('/verify-payment', authenticate, (req, res) => 
  razorpayCheckoutController.verifyPayment(req, res)
);

// Webhook (no auth)
router.post('/webhook', (req, res) => 
  razorpayCheckoutController.webhook(req, res)
);

// Get invoice
router.get('/invoice/:orderId', authenticate, (req, res) => 
  razorpayCheckoutController.getInvoice(req, res)
);

export default router;
