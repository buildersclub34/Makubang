import React from 'react';
import { Badge, BadgeProps, styled } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const StyledBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: 3,
    top: 8,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
  },
}));

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count = 0,
  onClick,
  size = 'medium',
  color = 'error',
}) => {
  const iconSize = {
    small: 'small',
    medium: 'medium',
    large: 'large',
  }[size];

  return (
    <StyledBadge
      badgeContent={count}
      color={color}
      max={99}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8,
        },
      }}
    >
      {count > 0 ? (
        <NotificationsActiveIcon fontSize={iconSize} />
      ) : (
        <NotificationsIcon fontSize={iconSize} />
      )}
    </StyledBadge>
  );
};

export default NotificationBadge;
