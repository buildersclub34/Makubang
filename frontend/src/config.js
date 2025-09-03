// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

// App Configuration
export const APP_NAME = 'Makubang';
export const APP_DESCRIPTION = 'Discover and order food from your favorite creators';

// Pagination
export const ITEMS_PER_PAGE = 10;

// Map Configuration
export const MAPS_API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY || 'YOUR_MAPS_API_KEY';

// Payment Configuration
export const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY || 'YOUR_RAZORPAY_KEY';

// Social Logins
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

// Notification Configuration
export const NOTIFICATION_CHANNEL_ID = 'makubang-notifications';
export const NOTIFICATION_CHANNEL_NAME = 'Makubang Notifications';

// Cache Configuration
export const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Form Validation
// Add any form validation constants here if needed

export default {
  API_URL,
  APP_NAME,
  APP_DESCRIPTION,
  ITEMS_PER_PAGE,
  MAPS_API_KEY,
  RAZORPAY_KEY,
  GOOGLE_WEB_CLIENT_ID,
  FACEBOOK_APP_ID,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  CACHE_TIMEOUT,
};
