import { razorpayService } from '../services/razorpay.service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRazorpayIntegration() {
  try {
    console.log('Testing Razorpay Integration...');
    
    // 1. Create a test order
    console.log('\n1. Creating test order...');
    const order = await razorpayService.createOrder(100); // 100 INR
    console.log('Order created successfully:', order);
    
    // 2. Simulate a payment (in a real scenario, this would be done by Razorpay)
    console.log('\n2. To complete the test:');
    console.log('   a. Open your Razorpay test dashboard');
    console.log('   b. Use the following order ID to make a test payment:');
    console.log(`   Order ID: ${order.id}`);
    console.log('   c. Use test card: 4111 1111 1111 1111');
    console.log('   d. Any future date for expiry, any 3-digit CVV');
    
    // 3. After payment, you can verify it using the payment ID
    console.log('\n3. After making the payment, you can verify it using the payment ID in the Razorpay dashboard');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testRazorpayIntegration();
