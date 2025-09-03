import React from 'react';
import { 
  Box, 
  Divider, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Home as HomeIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart as OrdersIcon,
  Favorite as FavoritesIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Star as StarIcon,
  LocalOffer as OffersIcon,
  AccountCircle as ProfileIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface AppSidebarProps {
  onClose?: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ onClose }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);

  const handleClick = () => {
    setOpen(!open);
  };

  const navigateTo = (path: string) => {
    router.push(path);
    if (onClose) onClose();
  };

  const mainMenuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Restaurants', icon: <RestaurantIcon />, path: '/restaurants' },
    { text: 'My Orders', icon: <OrdersIcon />, path: '/orders' },
    { text: 'Favorites', icon: <FavoritesIcon />, path: '/favorites' },
  ];

  const accountMenuItems = [
    { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
    { text: 'Order History', icon: <HistoryIcon />, path: '/history' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const helpMenuItems = [
    { text: 'Help & Support', icon: <HelpIcon />, path: '/help' },
    { text: 'About Us', icon: <StarIcon />, path: '/about' },
    { text: 'Offers', icon: <OffersIcon />, path: '/offers' },
  ];

  const renderMenuItems = (items: { text: string; icon: React.ReactNode; path: string }[]) => (
    <List>
      {items.map((item) => (
        <ListItem 
          key={item.text} 
          disablePadding
          sx={{
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <ListItemButton 
            onClick={() => navigateTo(item.path)}
            selected={router.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.25),
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* User Profile Section */}
      {isAuthenticated && user && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Avatar
            alt={user.name}
            src={user.avatar}
            sx={{ width: 40, height: 40, mr: 2 }}
          />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {user.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {/* Main Menu */}
        {renderMenuItems(mainMenuItems)}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Account Section */}
        <List>
          <ListItemButton onClick={handleClick}>
            <ListItemText primary="Account" />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {renderMenuItems(accountMenuItems)}
          </Collapse>
        </List>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Help & Support */}
        {renderMenuItems(helpMenuItems)}
      </Box>
      
      {/* App Version */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Makubang v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default AppSidebar;
