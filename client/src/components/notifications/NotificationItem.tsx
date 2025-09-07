import React from 'react';
import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Box, useTheme } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { Notification as NotificationType } from '../../types/notification';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  LocalShipping as ShippingIcon,
  Receipt as OrderIcon,
  Payment as PaymentIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';

interface NotificationItemProps {
  notification: NotificationType;
  onClick?: () => void;
  dense?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick,
  dense = false
}) => {
  const theme = useTheme();
  
  const getIcon = () => {
    switch (notification.type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
        return <OrderIcon color="primary" />;
      case 'PAYMENT_RECEIVED':
        return <PaymentIcon color="success" />;
      case 'PAYMENT_FAILED':
        return <PaymentIcon color="error" />;
      case 'DELIVERY_UPDATE':
        return <ShippingIcon color="info" />;
      case 'ACCOUNT_VERIFIED':
        return <CheckCircleIcon color="success" />;
      case 'ACCOUNT_ALERT':
        return <ErrorIcon color="warning" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getBgColor = () => {
    if (notification.read) return 'transparent';
    
    switch (notification.type) {
      case 'PAYMENT_FAILED':
        return theme.palette.error.light + '33';
      case 'ACCOUNT_ALERT':
        return theme.palette.warning.light + '33';
      default:
        return theme.palette.primary.light + '1a';
    }
  };

  return (
    <ListItem
      button
      onClick={onClick}
      sx={{
        borderRadius: 1,
        mb: 1,
        bgcolor: getBgColor(),
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: theme.palette.action.hover,
        },
        ...(dense ? { py: 0.5 } : { py: 1 }),
      }}
    >
      <ListItemAvatar sx={{ minWidth: 40 }}>
        <Avatar 
          sx={{ 
            bgcolor: notification.read ? 'action.selected' : 'primary.main',
            color: notification.read ? 'text.secondary' : 'primary.contrastText',
            width: 32,
            height: 32,
          }}
        >
          {getIcon()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography 
            variant="subtitle2" 
            color={notification.read ? 'text.secondary' : 'text.primary'}
            sx={{
              fontWeight: notification.read ? 'normal' : 'medium',
              lineHeight: 1.3,
            }}
          >
            {notification.title}
          </Typography>
        }
        secondary={
          <Box>
            <Typography
              variant="body2"
              color={notification.read ? 'text.secondary' : 'text.primary'}
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.4,
              }}
            >
              {notification.message}
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{
                display: 'block',
                mt: 0.5,
                fontSize: '0.7rem',
              }}
            >
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </Typography>
          </Box>
        }
        disableTypography
      />
    </ListItem>
  );
};

export default NotificationItem;
