import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Button, 
  Avatar, 
  Menu, 
  MenuItem, 
  useTheme, 
  useMediaQuery,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import Link from 'next/link';

const AppHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.push('/login');
  };

  const menuId = 'primary-search-account-menu';
  const isMenuOpen = Boolean(anchorEl);

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem 
        onClick={() => {
          handleMenuClose();
          router.push('/profile');
        }}
      >
        Profile
      </MenuItem>
      <MenuItem 
        onClick={() => {
          handleMenuClose();
          router.push('/settings');
        }}
      >
        Settings
      </MenuItem>
      <MenuItem onClick={handleLogout}>Logout</MenuItem>
    </Menu>
  );

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
      elevation={0}
    >
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Link href="/" passHref>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              display: 'flex',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'primary.main',
              textDecoration: 'none',
              cursor: 'pointer',
              mr: 2,
            }}
          >
            Makubang
          </Typography>
        </Link>

        <Box sx={{ flexGrow: 1 }} />

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Search Button - Only show on desktop */}
            <Tooltip title="Search">
              <IconButton
                size="large"
                aria-label="search"
                color="inherit"
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <Tooltip title={user?.name || 'Account'}>
                <IconButton
                  edge="end"
                  aria-label="account of current user"
                  aria-controls={menuId}
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                  size="large"
                >
                  {user?.avatar ? (
                    <Avatar
                      alt={user.name}
                      src={user.avatar}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <AccountCircle />
                  )}
                </IconButton>
              </Tooltip>
              {!isMobile && (
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {user?.name || 'User'}
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Button 
              color="inherit" 
              onClick={() => router.push('/login')}
              sx={{ mr: 1 }}
            >
              Login
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/register')}
              sx={{ color: 'white' }}
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Toolbar>
      {renderMenu}
    </AppBar>
  );
};

export default AppHeader;
