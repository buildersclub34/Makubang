import { Dimensions, Platform } from 'react-native';

export const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary colors
  primary: '#FF6B6B',
  primaryLight: '#FF8E8E',
  primaryDark: '#E64A4A',
  
  // Secondary colors
  secondary: '#4ECDC4',
  secondaryLight: '#7FFFD4',
  secondaryDark: '#3DA69F',
  
  // Status colors
  success: '#4CAF50',
  info: '#2196F3',
  warning: '#FFC107',
  error: '#F44336',
  
  // Grayscale
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  lightGray2: '#EEEEEE',
  gray: '#9E9E9E',
  darkGray: '#424242',
  black: '#000000',
  
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F9FA',
  
  // Text
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  
  // Borders
  border: '#E0E0E0',
  
  // Social
  facebook: '#3B5998',
  google: '#DB4437',
  apple: '#000000',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 8,
  padding: 20,
  margin: 20,
  
  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body1: 16,
  body2: 14,
  body3: 12,
  body4: 10,
  body5: 8,
  
  // App dimensions
  width,
  height,
};

export const FONTS = {
  h1: { fontSize: SIZES.h1, lineHeight: 36, fontWeight: 'bold' },
  h2: { fontSize: SIZES.h2, lineHeight: 30, fontWeight: 'bold' },
  h3: { fontSize: SIZES.h3, lineHeight: 26, fontWeight: '600' },
  h4: { fontSize: SIZES.h4, lineHeight: 24, fontWeight: '600' },
  h5: { fontSize: SIZES.h5, lineHeight: 22, fontWeight: '600' },
  body1: { fontSize: SIZES.body1, lineHeight: 24 },
  body2: { fontSize: SIZES.body2, lineHeight: 22 },
  body3: { fontSize: SIZES.body3, lineHeight: 20 },
  body4: { fontSize: SIZES.body4, lineHeight: 18 },
  body5: { fontSize: SIZES.body5, lineHeight: 16 },
};

// Icons mapping
export const icons = {
  // Tab Icons
  home: require('../../assets/icons/home.png'),
  home_filled: require('../../assets/icons/home-filled.png'),
  explore: require('../../assets/icons/explore.png'),
  explore_filled: require('../../assets/icons/explore-filled.png'),
  add: require('../../assets/icons/add.png'),
  add_filled: require('../../assets/icons/add-filled.png'),
  cart: require('../../assets/icons/cart.png'),
  cart_filled: require('../../assets/icons/cart-filled.png'),
  profile: require('../../assets/icons/profile.png'),
  profile_filled: require('../../assets/icons/profile-filled.png'),
  
  // Common Icons
  back: require('../../assets/icons/back.png'),
  close: require('../../assets/icons/close.png'),
  search: require('../../assets/icons/search.png'),
  filter: require('../../assets/icons/filter.png'),
  heart: require('../../assets/icons/heart.png'),
  heart_filled: require('../../assets/icons/heart-filled.png'),
  share: require('../../assets/icons/share.png'),
  more: require('../../assets/icons/more.png'),
  
  // Auth Icons
  email: require('../../assets/icons/email.png'),
  lock: require('../../assets/icons/lock.png'),
  eye: require('../../assets/icons/eye.png'),
  eye_off: require('../../assets/icons/eye-off.png'),
  person: require('../../assets/icons/person.png'),
  google: require('../../assets/icons/google.png'),
  facebook: require('../../assets/icons/facebook.png'),
  apple: require('../../assets/icons/apple.png'),
  
  // Profile Icons
  settings: require('../../assets/icons/settings.png'),
  orders: require('../../assets/icons/orders.png'),
  favorites: require('../../assets/icons/favorites.png'),
  address: require('../../assets/icons/address.png'),
  payment: require('../../assets/icons/payment.png'),
  help: require('../../assets/icons/help.png'),
  logout: require('../../assets/icons/logout.png'),
  
  // Food Icons
  restaurant: require('../../assets/icons/restaurant.png'),
  food: require('../../assets/icons/food.png'),
  drink: require('../../assets/icons/drink.png'),
  dessert: require('../../assets/icons/dessert.png'),
  
  // Order Status
  order_placed: require('../../assets/icons/order-placed.png'),
  order_confirmed: require('../../assets/icons/order-confirmed.png'),
  order_cooking: require('../../assets/icons/order-cooking.png'),
  order_ready: require('../../assets/icons/order-ready.png'),
  order_picked: require('../../assets/icons/order-picked.png'),
  order_delivered: require('../../assets/icons/order-delivered.png'),
};

// Images mapping
export const images = {
  logo: require('../../assets/images/logo.png'),
  logo_text: require('../../assets/images/logo-text.png'),
  splash: require('../../assets/images/splash.png'),
  onboarding1: require('../../assets/images/onboarding1.png'),
  onboarding2: require('../../assets/images/onboarding2.png'),
  onboarding3: require('../../assets/images/onboarding3.png'),
  placeholder: require('../../assets/images/placeholder.jpg'),
  avatar: require('../../assets/images/avatar.png'),
  empty_cart: require('../../assets/images/empty-cart.png'),
  empty_orders: require('../../assets/images/empty-orders.png'),
  empty_favorites: require('../../assets/images/empty-favorites.png'),
  payment_success: require('../../assets/images/payment-success.png'),
  payment_failed: require('../../assets/images/payment-failed.png'),
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.gray,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.gray,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  dark: {
    shadowColor: COLORS.gray,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.41,
    shadowRadius: 9.11,
    elevation: 14,
  },
};

// Platform specific styles
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export default {
  COLORS,
  SIZES,
  FONTS,
  icons,
  images,
  SHADOWS,
  isIOS,
  isAndroid,
};
