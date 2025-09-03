import React, { useCallback, useMemo } from 'react';
import { useOrderTracking } from '../hooks/useOrderTracking';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  styled,
  useTheme,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  DeliveryDining as DeliveryIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

export interface OrderTrackingProps {
  orderId: string;
  showDetails?: boolean;
  onStatusChange?: (status: string) => void;
  className?: string;
}

const statusIcons = {
  pending: <AccessTimeIcon color="warning" />,
  confirmed: <CheckCircleIcon color="info" />,
  preparing: <RestaurantIcon color="primary" />,
  ready_for_pickup: <CheckCircleIcon color="info" />,
  out_for_delivery: <DeliveryIcon color="primary" />,
  delivered: <CheckCircleIcon color="success" />,
  cancelled: <ErrorIcon color="error" />,
  rejected: <ErrorIcon color="error" />,
};

const statusSteps = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
];

const StyledProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  margin: theme.spacing(2, 0),
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    backgroundColor: theme.palette.primary.main,
  },
}));

const StatusStep = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'completed',
})<{ active?: boolean; completed?: boolean }>(({ theme, active, completed }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flex: 1,
  position: 'relative',
  '&:not(:last-child)::after': {
    content: '""',
    position: 'absolute',
    top: '12px',
    left: 'calc(50% + 16px)',
    right: 'calc(-50% + 16px)',
    height: '2px',
    backgroundColor: completed 
      ? theme.palette.primary.main 
      : active 
        ? theme.palette.grey[400] 
        : theme.palette.grey[200],
  },
}));

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  orderId,
  showDetails = true,
  onStatusChange,
  className,
}) => {
  const theme = useTheme();
  const {
    isConnected,
    trackingData,
    error,
    reconnect,
    getTimeRemaining,
    getStatusDisplay,
    isOrderInProgress,
  } = useOrderTracking({
    orderId,
    onStatusUpdate: (data) => onStatusChange?.(data.status),
  });

  // Calculate progress percentage based on order status
  const progress = useMemo(() => {
    if (!trackingData?.status) return 0;
    
    const currentStep = statusSteps.indexOf(trackingData.status);
    if (currentStep === -1) return 0;
    
    return (currentStep / (statusSteps.length - 1)) * 100;
  }, [trackingData?.status]);

  // Format time remaining
  const timeRemaining = useMemo(() => {
    if (!isOrderInProgress) return null;
    
    const remaining = getTimeRemaining();
    if (!remaining) return null;
    
    if (remaining.minutes <= 0 && remaining.seconds <= 0) {
      return 'Arriving soon';
    }
    
    return `${remaining.minutes}m ${remaining.seconds}s remaining`;
  }, [getTimeRemaining, isOrderInProgress]);

  // Format last updated time
  const lastUpdated = useMemo(() => {
    if (!trackingData?.updatedAt) return null;
    
    return `Updated ${formatDistanceToNow(new Date(trackingData.updatedAt), { addSuffix: true })}`;
  }, [trackingData?.updatedAt]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    reconnect();
  }, [reconnect]);

  if (error) {
    return (
      <Paper className={className} sx={{ p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error loading order status
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {error.message || 'Failed to load order tracking information.'}
        </Typography>
        <Chip
          icon={<RefreshIcon />}
          label="Try Again"
          onClick={handleRefresh}
          variant="outlined"
          color="primary"
          clickable
        />
      </Paper>
    );
  }

  if (!trackingData) {
    return (
      <Paper className={className} sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading order status...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Paper>
    );
  }

  const currentStatusIndex = statusSteps.indexOf(trackingData.status);

  return (
    <Paper className={className} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Order #{orderId.slice(-6).toUpperCase()}
        </Typography>
        <Box display="flex" alignItems="center">
          <Chip
            label={isConnected ? 'Live' : 'Offline'}
            color={isConnected ? 'success' : 'default'}
            size="small"
            sx={{ mr: 1 }}
          />
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh} disabled={!isConnected}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Status Progress */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" color="textSecondary">
            {getStatusDisplay()}
          </Typography>
          {timeRemaining && (
            <Typography variant="caption" color="primary">
              {timeRemaining}
            </Typography>
          )}
        </Box>
        <StyledProgressBar variant="determinate" value={progress} />
        
        {/* Status Steps */}
        <Box display="flex" justifyContent="space-between" mt={2}>
          {statusSteps.map((step, index) => {
            const isActive = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            
            return (
              <StatusStep 
                key={step} 
                active={isActive}
                completed={index < currentStatusIndex}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isActive 
                      ? theme.palette.primary.main 
                      : theme.palette.grey[200],
                    color: isActive 
                      ? theme.palette.common.white 
                      : theme.palette.text.secondary,
                    mb: 1,
                    position: 'relative',
                    zIndex: 1,
                    ...(isCurrent && {
                      border: `2px solid ${theme.palette.primary.main}`,
                      transform: 'scale(1.2)',
                      bgcolor: theme.palette.common.white,
                      color: theme.palette.primary.main,
                    }),
                  }}
                >
                  {statusIcons[step as keyof typeof statusIcons] || (
                    <Typography variant="caption">{index + 1}</Typography>
                  )}
                </Box>
                <Typography 
                  variant="caption" 
                  align="center"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: isCurrent ? 'bold' : 'normal',
                    color: isActive 
                      ? theme.palette.text.primary 
                      : theme.palette.text.secondary,
                  }}
                >
                  {step.replace(/_/g, ' ')}
                </Typography>
              </StatusStep>
            );
          })}
        </Box>
      </Box>

      {showDetails && (
        <>
          <Divider sx={{ my: 2 }} />
          
          {/* Delivery Partner Info */}
          {trackingData.deliveryPartner && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                <DeliveryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Delivery Partner
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonIcon color="action" sx={{ mr: 1 }} />
                <Typography>{trackingData.deliveryPartner.name}</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <PhoneIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  {trackingData.deliveryPartner.phone}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Location Info */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              <LocationIcon color="action" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Delivery Location
            </Typography>
            <Typography variant="body2">
              {trackingData.deliveryAddress?.addressLine1}
            </Typography>
            {trackingData.deliveryAddress?.addressLine2 && (
              <Typography variant="body2">
                {trackingData.deliveryAddress.addressLine2}
              </Typography>
            )}
            <Typography variant="body2" color="textSecondary">
              {trackingData.deliveryAddress?.city}, {trackingData.deliveryAddress?.state} {trackingData.deliveryAddress?.postalCode}
            </Typography>
          </Box>
        </>
      )}

      {lastUpdated && (
        <Typography variant="caption" color="textSecondary" display="block" textAlign="right">
          {lastUpdated}
        </Typography>
      )}
    </Paper>
  );
};

export default OrderTracking;
