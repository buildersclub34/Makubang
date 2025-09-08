import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

// Initialize Razorpay client
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret',
});

class RazorpayService {
  // Create a new order
  async createOrder(amount: number, currency: string = 'INR') {
    try {
      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `order_${uuidv4()}`,
        payment_capture: 1 // Auto capture payment
      };

      const order = await razorpay.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      };
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      throw new Error('Failed to create Razorpay order');
    }
  }

  // Verify payment signature
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    try {
      const text = orderId + '|' + paymentId;
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(text)
        .digest('hex');
      
      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId: string) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return {
        id: payment.id,
        amount: payment.amount / 100, // Convert back to rupees
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        orderId: payment.order_id,
        createdAt: new Date(payment.created_at * 1000) // Convert to milliseconds
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  }
}

export const razorpayService = new RazorpayService();
