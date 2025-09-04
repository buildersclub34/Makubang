import React, { useEffect } from 'react';
import { loadScript } from '@razorpay/checkout';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const RazorpayCheckout = ({
  amount,
  currency = 'INR',
  orderId,
  keyId,
  name = 'Makubang',
  description = 'Food Order Payment',
  prefill = {},
  onSuccess,
  onError,
  buttonText = 'Pay Now',
  buttonClass = 'bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700',
  disabled = false,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    // Load Razorpay script
    loadScript('https://checkout.razorpay.com/v1/checkout.js');
  }, []);

  const handlePayment = async () => {
    try {
      // Create order on our backend
      const { data } = await api.post('/api/payments/create-order', {
        amount: amount * 100, // Convert to paise
        currency,
        receipt: `order_${Date.now()}`,
        notes: {
          userId: user?._id,
          orderId,
        },
      });

      const options = {
        key: keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name,
        description,
        order_id: data.id,
        handler: async function (response) {
          try {
            // Verify payment with our backend
            const verifyResponse = await api.post('/api/payments/verify', {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              orderId,
            });

            if (onSuccess) {
              onSuccess(verifyResponse.data);
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed. Please contact support.');
            if (onError) {
              onError(error);
            }
          }
        },
        prefill: {
          name: prefill.name || user?.name || '',
          email: prefill.email || user?.email || '',
          contact: prefill.phone || user?.phone || '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            if (onError) {
              onError({ message: 'Payment window closed' });
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment initialization failed');
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <button
      onClick={handlePayment}
      className={buttonClass}
      disabled={disabled}
    >
      {buttonText}
    </button>
  );
};

export default RazorpayCheckout;
