import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Payment as PaymentIcon, 
  LocalShipping as ShippingIcon, 
  CheckCircle as CheckCircleIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  PhoneAndroid as UpiIcon,
  AccountBalance as BankIcon,
  EmojiObjects as EmiIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import PaymentButton from '../../components/payment/PaymentButton';
import api from '../../utils/api';

const steps = ['Order Summary', 'Payment', 'Confirmation'];

const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        setIsLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        
        if (response.data.success) {
          setOrder(response.data.data);
          
          // Update active step based on order status
          if (response.data.data.status === 'completed' || response.data.data.paymentStatus === 'completed') {
            setActiveStep(2);
            setPaymentStatus('success');
          } else if (response.data.data.paymentStatus === 'pending') {
            setActiveStep(1);
          }
        } else {
          throw new Error(response.data.error || 'Failed to fetch order details');
        }
      } catch (error: any) {
        console.error('Error fetching order:', error);
        enqueueSnackbar(error.response?.data?.error || 'Failed to load order details', { variant: 'error' });
        navigate('/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, enqueueSnackbar, navigate]);

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentStatus('success');
    setActiveStep(2);
    enqueueSnackbar('Payment successful! Your order has been confirmed.', { variant: 'success' });
    
    // Update order status in local state
    if (order) {
      setOrder({
        ...order,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentId,
      });
    }
  };

  const handlePaymentError = (error: Error) => {
    setPaymentStatus('failed');
    enqueueSnackbar(error.message || 'Payment failed. Please try again.', { variant: 'error' });
  };

  const handleBackToOrders = () => {
    navigate('/orders');
  };

  const handleTrackOrder = () => {
    navigate(`/orders/${orderId}/track`);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCardIcon />;
      case 'upi':
        return <UpiIcon />;
      case 'netbanking':
        return <BankIcon />;
      case 'wallet':
        return <WalletIcon />;
      case 'emi':
        return <EmiIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  if (isLoading || !order) {
    return (
      <Container maxWidth="lg" style={{ padding: '40px 0' }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const { items, total, tax, deliveryFee, discount, orderNumber, status, paymentStatus: orderPaymentStatus } = order;
  const subtotal = parseFloat(total) - parseFloat(tax || 0) - parseFloat(deliveryFee || 0) + parseFloat(discount || 0);

  return (
    <Container maxWidth="lg" style={{ padding: '40px 0' }}>
      <Typography variant="h4" gutterBottom>
        {paymentStatus === 'success' ? 'Order Confirmed!' : 'Complete Your Payment'}
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel style={{ margin: '40px 0' }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
        {/* Order Summary */}
        <Box flex={2}>
          <Paper elevation={3} style={{ padding: '24px', marginBottom: '24px' }}>
            <Typography variant="h6" gutterBottom>
              Order #{orderNumber}
            </Typography>
            
            <List>
              {items?.map((item: any, index: number) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar 
                        src={item.image} 
                        alt={item.name}
                        variant="rounded"
                        sx={{ width: 64, height: 64, marginRight: 2 }}
                      >
                        {item.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {item.quantity} × ₹{item.price.toFixed(2)}
                          </Typography>
                          {item.variant && (
                            <Typography component="div" variant="body2" color="text.secondary">
                              {item.variant.name}
                            </Typography>
                          )}
                          {item.addons?.length > 0 && (
                            <Box component="div" mt={1}>
                              {item.addons.map((addon: any, idx: number) => (
                                <Chip 
                                  key={idx}
                                  label={`${addon.name} (${addon.quantity} × ₹${addon.price.toFixed(2)})`}
                                  size="small"
                                  style={{ marginRight: 8, marginBottom: 4 }}
                                />
                              ))}
                            </Box>
                          )}
                        </>
                      }
                    />
                    <ListItemText
                      primary={`₹${(item.price * item.quantity).toFixed(2)}`}
                      primaryTypographyProps={{ align: 'right' }}
                    />
                  </ListItem>
                  {index < items.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>

            <Divider style={{ margin: '16px 0' }} />

            {/* Order Summary */}
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Subtotal</Typography>
                <Typography>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              {discount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Discount</Typography>
                  <Typography color="success.main">-₹{parseFloat(discount).toFixed(2)}</Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Tax</Typography>
                <Typography>₹{parseFloat(tax || 0).toFixed(2)}</Typography>
              </Box>
              {deliveryFee > 0 && (
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Delivery Fee</Typography>
                  <Typography>₹{parseFloat(deliveryFee || 0).toFixed(2)}</Typography>
                </Box>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">₹{parseFloat(total).toFixed(2)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Delivery Address */}
          <Paper elevation={3} style={{ padding: '24px' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <ShippingIcon color="primary" style={{ marginRight: 8 }} />
              <Typography variant="h6">Delivery Address</Typography>
            </Box>
            <Typography>{order.deliveryAddress?.name || user?.name}</Typography>
            <Typography>{order.deliveryAddress?.line1}</Typography>
            {order.deliveryAddress?.line2 && <Typography>{order.deliveryAddress.line2}</Typography>}
            <Typography>
              {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.postalCode}
            </Typography>
            <Typography>Phone: {order.deliveryAddress?.phone || user?.phone}</Typography>
            {order.deliveryInstructions && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  Delivery Instructions:
                </Typography>
                <Typography>{order.deliveryInstructions}</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Payment Section */}
        <Box flex={1}>
          {paymentStatus === 'success' ? (
            <Paper elevation={3} style={{ padding: '24px', textAlign: 'center' }}>
              <CheckCircleIcon color="success" style={{ fontSize: 80, marginBottom: 16 }} />
              <Typography variant="h5" gutterBottom>
                Thank You for Your Order!
              </Typography>
              <Typography variant="body1" paragraph>
                Your order #{orderNumber} has been confirmed and is being processed.
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                We've sent a confirmation email to {user?.email} with your order details.
              </Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={4}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  onClick={handleTrackOrder}
                >
                  Track Your Order
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  fullWidth 
                  onClick={handleBackToOrders}
                >
                  View All Orders
                </Button>
              </Box>
            </Paper>
          ) : (
            <Paper elevation={3} style={{ padding: '24px' }}>
              <Box display="flex" alignItems="center" mb={3}>
                <PaymentIcon color="primary" style={{ marginRight: 8 }} />
                <Typography variant="h6">Payment Method</Typography>
              </Box>
              
              <PaymentButton
                orderId={orderId!}
                amount={parseFloat(total)}
                currency="INR"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                buttonText={`Pay ₹${parseFloat(total).toFixed(2)}`}
                fullWidth
                size="large"
                variant="contained"
                color="primary"
              />
              
              <Box mt={2} textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Secure payment powered by Razorpay
                </Typography>
              </Box>
              
              <Divider style={{ margin: '24px 0' }} />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  We Accept
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {['card', 'upi', 'netbanking', 'wallet', 'emi'].map((method) => (
                    <Chip
                      key={method}
                      icon={getPaymentMethodIcon(method)}
                      label={{
                        'card': 'Cards',
                        'upi': 'UPI',
                        'netbanking': 'Net Banking',
                        'wallet': 'Wallets',
                        'emi': 'EMI'
                      }[method] || method}
                      variant="outlined"
                      size="small"
                      style={{ margin: '2px' }}
                    />
                  ))}
                </Box>
              </Box>
              
              <Box mt={3} p={2} bgcolor="background.paper" borderRadius={1}>
                <Typography variant="body2" color="textSecondary">
                  Your payment is securely processed by our payment partner. We do not store your card details.
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default PaymentPage;
