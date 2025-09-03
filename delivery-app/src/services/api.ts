
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  
  updateProfile: async (profileData: any) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },
};

export const deliveryAPI = {
  registerPartner: async (partnerData: any) => {
    const response = await api.post('/delivery/register', partnerData);
    return response.data;
  },
  
  updateAvailability: async (isAvailable: boolean, currentLocation: any) => {
    const response = await api.post('/delivery/availability', {
      isAvailable,
      currentLocation,
    });
    return response.data;
  },
  
  getAvailableOrders: async () => {
    const response = await api.get('/delivery/orders');
    return response.data;
  },
  
  acceptOrder: async (orderId: string) => {
    const response = await api.post(`/delivery/orders/${orderId}/accept`);
    return response.data;
  },
  
  updateOrderStatus: async (orderId: string, status: string, location?: any) => {
    const response = await api.put(`/delivery/orders/${orderId}/status`, {
      status,
      location,
    });
    return response.data;
  },
  
  getOrderHistory: async (page = 1, limit = 20) => {
    const response = await api.get(`/delivery/orders/history?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getEarnings: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/delivery/earnings?${params.toString()}`);
    return response.data;
  },
};

export const walletAPI = {
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },
  
  getTransactions: async (page = 1, limit = 20) => {
    const response = await api.get(`/wallet/transactions?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  withdraw: async (amount: number, bankDetails: any) => {
    const response = await api.post('/wallet/withdraw', {
      amount,
      bankDetails,
    });
    return response.data;
  },
  
  addMoney: async (amount: number, paymentMethodId: string) => {
    const response = await api.post('/wallet/add-money', {
      amount,
      paymentMethodId,
    });
    return response.data;
  },
};

export const notificationAPI = {
  getNotifications: async (page = 1, limit = 20) => {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  
  updatePushToken: async (token: string) => {
    const response = await api.post('/notifications/push-token', { token });
    return response.data;
  },
};

export const trackingAPI = {
  getOrderLocation: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}/location`);
    return response.data;
  },
  
  updateLocation: async (orderId: string, location: any) => {
    const response = await api.post(`/orders/${orderId}/location`, { location });
    return response.data;
  },
};

export default api;
