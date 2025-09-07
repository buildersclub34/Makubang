import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LocalShipping as ShippingIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const steps = ['Order Placed', 'Order Confirmed', 'Preparing', 'On the Way', 'Delivered'];

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: {
    name: string;
    price: number;
  };
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  instructions?: string;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryAddress: Address;
  createdAt: string;
  estimatedDelivery: string;
}

const PaymentSuccess: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  // Get order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        enqueueSnackbar('No order ID provided', { variant: 'error' });
        navigate('/orders');
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        
        if (response.data.success) {
          setOrder(response.data.data);
          
          // Set active step based on order status
          const statusIndex = steps.findIndex(step => 
            step.toLowerCase().includes(response.data.data.status.toLowerCase())
          );
          
          if (statusIndex !== -1) {
            setActiveStep(statusIndex);
          } else {
            // Default to first step if status not found
            setActiveStep(0);
          }
        } else {
          throw new Error(response.data.error || 'Failed to fetch order details');
        }
      } catch (error: any) {
        console.error('Error fetching order details:', error);
        enqueueSnackbar(
          error.response?.data?.error || 'Failed to load order details', 
          { variant: 'error' }
        );
        navigate('/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, enqueueSnackbar, navigate]);

  // Handle order status steps
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < activeStep) {
      return 'completed';
    } else if (stepIndex === activeStep) {
      return 'in-progress';
    } else {
      return 'pending';
    }
  };

  const handleTrackOrder = () => {
    navigate(`/orders/${orderId}/track`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleViewOrder = () => {
    navigate(`/orders/${orderId}`);
  };

  if (isLoading || !order) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading order details...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box textAlign="center" mb={6}>
        <CheckCircleIcon 
          color="success" 
          sx={{ fontSize: 80, mb: 2 }} 
        />
        <Typography variant="h4" component="h1" gutterBottom>
          Thank You for Your Order!
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Your order #{order.orderNumber} has been placed successfully
        </Typography>
        <Typography color="text.secondary" paragraph>
          We've sent a confirmation email to {user?.email} with your order details.
        </Typography>
        
        <Box mt={4} display="flex" justifyContent="center" gap={2}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={handleTrackOrder}
            startIcon={<LocalShippingIcon />}
          >
            Track Order
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            size="large"
            onClick={handleViewOrder}
            startIcon={<ReceiptIcon />}
          >
            View Order
          </Button>
          <Button 
            variant="text" 
            color="primary" 
            size="large"
            onClick={handleBackToHome}
            startIcon={<HomeIcon />}
          >
            Back to Home
          </Button>
        </Box>
      </Box>

      {/* Order Status Stepper */}
      <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Order Status
        </Typography>
        
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel 
                StepIconProps={{
                  sx: {
                    '&.Mui-completed': {
                      color: 'success.main',
                    },
                    '&.Mui-active': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box textAlign="center" mt={2}>
          <Typography variant="body1" color="text.secondary">
            Estimated Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Order Summary */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <ShoppingBagIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Order Summary</Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {order.items.map((item, index) => (
                <Box key={index} mb={3}>
                  <Box display="flex" alignItems="flex-start">
                    <Box 
                      width={80} 
                      height={80} 
                      bgcolor="background.paper" 
                      borderRadius={1}
                      overflow="hidden"
                      mr={2}
                      sx={{
                        backgroundImage: `url(${item.image || '/placeholder-food.jpg'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <Box flex={1}>
                      <Typography variant="subtitle1">{item.name}</Typography>
                      {item.variant && (
                        <Typography variant="body2" color="text.secondary">
                          {item.variant.name}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Qty: {item.quantity}
                      </Typography>
                      {item.addons && item.addons.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Add-ons:
                          </Typography>
                          {item.addons.map((addon, idx) => (
                            <Typography key={idx} variant="caption" display="block" color="text.secondary">
                              • {addon.name} (x{addon.quantity}) - ₹{addon.price * addon.quantity}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="subtitle1">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                  {index < order.items.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Order Total */}
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal</Typography>
                  <Typography>₹{order.subtotal.toFixed(2)}</Typography>
                </Box>
                {order.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Discount</Typography>
                    <Typography color="success.main">-₹{order.discount.toFixed(2)}</Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Tax</Typography>
                  <Typography>₹{order.tax.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Delivery Fee</Typography>
                  <Typography>₹{order.deliveryFee.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6">₹{order.total.toFixed(2)}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Paid via {order.paymentMethod} (ID: {order.paymentId})
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Delivery Information */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <ShippingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Delivery Information</Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box mb={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Delivery Address
                </Typography>
                <Typography>{order.deliveryAddress.name}</Typography>
                <Typography>{order.deliveryAddress.line1}</Typography>
                {order.deliveryAddress.line2 && (
                  <Typography>{order.deliveryAddress.line2}</Typography>
                )}
                <Typography>
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
                </Typography>
                <Typography>Phone: {order.deliveryAddress.phone}</Typography>
                
                {order.deliveryAddress.instructions && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Delivery Instructions
                    </Typography>
                    <Typography>{order.deliveryAddress.instructions}</Typography>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Need Help?
                </Typography>
                <Typography variant="body2" paragraph>
                  If you have any questions about your order, please contact our customer support at:
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="medium">
                  support@makubang.com
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="medium">
                  +91 1234567890
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Box mt={3} textAlign="center">
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              onClick={handleBackToHome}
              startIcon={<HomeIcon />}
            >
              Continue Shopping
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PaymentSuccess;
