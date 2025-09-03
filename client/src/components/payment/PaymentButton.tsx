import React, { useState, useEffect } from 'react';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box, Divider, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { usePayment } from '../../contexts/PaymentContext';
import { useSnackbar } from 'notistack';
import { loadScript } from '../../utils/loadScript';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentButtonProps {
  orderId: string;
  amount: number;
  currency?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  orderId,
  amount,
  currency = 'INR',
  onSuccess,
  onError,
  buttonText = 'Pay Now',
  fullWidth = false,
  size = 'medium',
  variant = 'contained',
  color = 'primary',
  disabled = false,
  className = '',
  style = {},
}) => {
  const { createPayment, verifyPayment, status } = usePayment();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>>([
    { id: 'card', name: 'Credit/Debit Card', description: 'Pay using Visa, Mastercard, Rupay, etc.', icon: '💳' },
    { id: 'upi', name: 'UPI', description: 'Pay using UPI apps like Google Pay, PhonePe, etc.', icon: '📱' },
    { id: 'netbanking', name: 'Net Banking', description: 'Pay using your bank account', icon: '🏦' },
    { id: 'wallet', name: 'Wallets', description: 'Pay using Paytm, Amazon Pay, etc.', icon: '💰' },
    { id: 'emi', name: 'EMI', description: 'Pay in easy installments', icon: '💸' },
  ]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpay = async () => {
      try {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      } catch (error) {
        console.error('Failed to load Razorpay script', error);
        enqueueSnackbar('Failed to load payment service', { variant: 'error' });
      }
    };

    loadRazorpay();
  }, [enqueueSnackbar]);

  const handlePaymentClick = async () => {
    setShowPaymentDialog(true);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    handleProceedToPay(methodId);
  };

  const handleProceedToPay = async (methodId: string) => {
    if (!window.Razorpay) {
      enqueueSnackbar('Payment service is not available', { variant: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create payment intent
      const paymentData = await createPayment(orderId, amount, currency);
      
      // Initialize Razorpay
      const options = {
        key: paymentData.key,
        amount: paymentData.amount * 100, // Razorpay expects amount in paise
        currency: paymentData.currency,
        name: paymentData.name,
        description: paymentData.description,
        order_id: paymentData.orderId,
        handler: async function(response: any) {
          try {
            // Verify payment
            const success = await verifyPayment(
              paymentData.paymentId,
              orderId,
              methodId,
              response
            );
            
            if (success && onSuccess) {
              onSuccess(response.razorpay_payment_id);
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            if (onError) {
              onError(error as Error);
            }
          }
        },
        prefill: {
          name: paymentData.prefill?.name || '',
          email: paymentData.prefill?.email || '',
          contact: paymentData.prefill?.contact || '',
        },
        notes: {
          order_id: orderId,
          payment_id: paymentData.paymentId,
        },
        theme: {
          color: '#F37254',
        },
        modal: {
          ondismiss: function() {
            console.log('Payment dismissed');
          },
        },
        method: methodId === 'card' ? 'card' : undefined,
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
      setShowPaymentDialog(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        color={color}
        size={size}
        fullWidth={fullWidth}
        onClick={handlePaymentClick}
        disabled={disabled || isLoading || status === 'processing'}
        className={className}
        style={style}
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isLoading ? 'Processing...' : buttonText}
      </Button>

      <Dialog 
        open={showPaymentDialog} 
        onClose={() => setShowPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Payment Method</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="subtitle1" color="textSecondary">
              Order #{orderId}
            </Typography>
            <Typography variant="h6">
              ₹{amount.toFixed(2)}
            </Typography>
          </Box>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <List>
            {paymentMethods.map((method) => (
              <React.Fragment key={method.id}>
                <ListItem 
                  button 
                  onClick={() => handlePaymentMethodSelect(method.id)}
                  disabled={isLoading}
                >
                  <Box mr={2} fontSize="24px">
                    {method.icon}
                  </Box>
                  <ListItemText 
                    primary={method.name}
                    secondary={method.description}
                  />
                  <ListItemSecondaryAction>
                    {selectedMethod === method.id && status === 'processing' ? (
                      <CircularProgress size={24} />
                    ) : null}
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowPaymentDialog(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentButton;
