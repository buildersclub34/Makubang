import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSnackbar } from 'notistack';
import { useAuth } from './AuthContext';
import api from '../utils/api';

type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi' | 'cod';

type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

interface PaymentContextType {
  createPayment: (orderId: string, amount: number, currency?: string) => Promise<any>;
  verifyPayment: (paymentId: string, orderId: string, paymentMethod: string, paymentResponse: any) => Promise<boolean>;
  requestRefund: (orderId: string, reason?: string, amount?: number) => Promise<boolean>;
  status: PaymentStatus;
  error: string | null;
  paymentIntent: any;
  resetPayment: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const createPayment = useCallback(async (orderId: string, amount: number, currency: string = 'INR') => {
    try {
      setStatus('processing');
      setError(null);
      
      const response = await api.post('/payments/create-payment-intent', {
        orderId,
        amount,
        currency,
      });

      if (response.data.success) {
        setPaymentIntent(response.data.data);
        setStatus('idle');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create payment');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Payment failed';
      setError(errorMessage);
      setStatus('failed');
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw new Error(errorMessage);
    }
  }, [enqueueSnackbar]);

  const verifyPayment = useCallback(async (
    paymentId: string, 
    orderId: string, 
    paymentMethod: string, 
    paymentResponse: any
  ) => {
    try {
      setStatus('processing');
      setError(null);
      
      const response = await api.post('/payments/verify-payment', {
        paymentId,
        orderId,
        paymentMethod,
        paymentResponse,
      });

      if (response.data.success) {
        setStatus('succeeded');
        enqueueSnackbar('Payment successful!', { variant: 'success' });
        return true;
      } else {
        throw new Error(response.data.error || 'Payment verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Payment verification failed';
      setError(errorMessage);
      setStatus('failed');
      enqueueSnackbar(errorMessage, { variant: 'error' });
      return false;
    }
  }, [enqueueSnackbar]);

  const requestRefund = useCallback(async (orderId: string, reason: string = '', amount?: number) => {
    try {
      setStatus('processing');
      setError(null);
      
      const response = await api.post(`/payments/${orderId}/refund`, {
        reason,
        amount,
      });

      if (response.data.success) {
        setStatus('succeeded');
        enqueueSnackbar('Refund request submitted successfully', { variant: 'success' });
        return true;
      } else {
        throw new Error(response.data.error || 'Refund request failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Refund request failed';
      setError(errorMessage);
      setStatus('failed');
      enqueueSnackbar(errorMessage, { variant: 'error' });
      return false;
    }
  }, [enqueueSnackbar]);

  const resetPayment = useCallback(() => {
    setStatus('idle');
    setError(null);
    setPaymentIntent(null);
  }, []);

  return (
    <PaymentContext.Provider
      value={{
        createPayment,
        verifyPayment,
        requestRefund,
        status,
        error,
        paymentIntent,
        resetPayment,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
