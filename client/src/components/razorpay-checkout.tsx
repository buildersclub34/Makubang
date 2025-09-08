import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet, Building2, Smartphone } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  order: {
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    gstAmount: number;
    totalAmount: number;
  };
  onSuccess: (response: any) => void;
  onError: (error: any) => void;
  onCancel: () => void;
}

export default function RazorpayCheckout({ order, onSuccess, onError, onCancel }: RazorpayCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('card');

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', name: 'Net Banking', icon: Building2, desc: 'All major banks' },
    { id: 'upi', name: 'UPI', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
    { id: 'wallet', name: 'Wallets', icon: Wallet, desc: 'Paytm, Mobikwik, Airtel Money' },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const options = {
        key: order.key,
        amount: order.amount * 100, // Convert to paise
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: 'Makubang',
        description: `Order #${order.orderId.slice(0, 8)}`,
        image: '/logo.png',
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
          contact: '+919999999999'
        },
        theme: {
          color: '#F37254'
        },
        method: {
          netbanking: selectedMethod === 'netbanking',
          card: selectedMethod === 'card',
          upi: selectedMethod === 'upi',
          wallet: selectedMethod === 'wallet'
        },
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyResponse.ok) {
              const result = await verifyResponse.json();
              onSuccess(result);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            onError(error);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            onCancel();
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      onError(error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">×{item.quantity}</span>
                </div>
                <span>₹{item.total}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>₹{order.deliveryFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>₹{order.platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span>₹{order.gstAmount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span>₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 border rounded-lg flex items-center space-x-3 hover:bg-muted/50 transition-colors ${
                  selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-muted'
                }`}
              >
                <method.icon className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-muted-foreground">{method.desc}</div>
                </div>
                {selectedMethod === method.id && (
                  <Badge variant="default" className="ml-auto">Selected</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Secure payment powered by Razorpay</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>256-bit SSL encryption</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            `Pay ₹${order.totalAmount.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}
