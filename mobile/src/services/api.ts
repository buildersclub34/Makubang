import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use Replit server URL - adjust based on your Replit domain
const API_URL = Platform.select({
  android: 'http://0.0.0.0:5000/api',
  ios: 'http://0.0.0.0:5000/api', 
  default: 'http://0.0.0.0:5000/api',
});

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get token from secure storage
    const token = await SecureStore.getItemAsync('token');
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error status is 401 and there's no originalRequest._retry flag,
    // it means the token has expired and we need to refresh it
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from secure storage
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!refreshToken) {
          // No refresh token, redirect to login
          throw new Error('No refresh token available');
        }
        
        // Request new access token using refresh token
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });
        
        const { token, user } = response.data;
        
        // Store the new token
        await SecureStore.setItemAsync('token', token);
        
        // Update the authorization header
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (error) {
        // If refresh token is invalid, log the user out
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
        
        // You might want to redirect to login here
        // navigationRef.navigate('Auth');
        
        return Promise.reject(error);
      }
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

// API methods
export const auth = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData: any) => 
    api.post('/auth/register', userData),
  
  refreshToken: (refreshToken: string) => 
    api.post('/auth/refresh-token', { refreshToken }),
  
  forgotPassword: (email: string) => 
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) => 
    api.post('/auth/reset-password', { token, password }),
};

export const users = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (userData: any) => 
    api.patch('/users/me', userData),
  updateAvatar: (formData: FormData) => 
    api.patch('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export const restaurants = {
  getAll: (params?: any) => 
    api.get('/restaurants', { params }),
  
  getById: (id: string) => 
    api.get(`/restaurants/${id}`),
  
  getMenu: (restaurantId: string) => 
    api.get(`/restaurants/${restaurantId}/menu`),
  
  search: (query: string, params?: any) => 
    api.get('/restaurants/search', { params: { q: query, ...params } }),
};

export const orders = {
  create: (orderData: any) => 
    api.post('/orders', orderData),
  
  getAll: (params?: any) => 
    api.get('/orders', { params }),
  
  getById: (id: string) => 
    api.get(`/orders/${id}`),
  
  cancel: (id: string) => 
    api.patch(`/orders/${id}/cancel`),
  
  track: (id: string) => 
    api.get(`/orders/${id}/track`),
};

export const notifications = {
  getAll: (params?: any) => 
    api.get('/notifications', { params }),
  
  markAsRead: (ids: string[] | 'all') => 
    api.put('/notifications/read', { notificationIds: ids === 'all' ? undefined : ids, all: ids === 'all' }),
  
  delete: (ids: string[] | 'all') => 
    api.delete('/notifications', { data: { notificationIds: ids === 'all' ? undefined : ids, all: ids === 'all' } }),
  
  getUnreadCount: () => 
    api.get('/notifications/unread-count'),
  
  updatePreferences: (preferences: any) => 
    api.put('/notifications/preferences', { preferences }),
};

export default api;
