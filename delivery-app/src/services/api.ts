
const BASE_URL = 'http://localhost:5000'; // Update for production

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface DashboardStats {
  todayEarnings: number;
  todayDeliveries: number;
  weeklyEarnings: number;
  weeklyDeliveries: number;
  averageTime: number;
  weeklyRating: number;
  rating: number;
  completionRate: number;
  isOnline: boolean;
}

interface WalletData {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  weeklyEarnings: number;
  weeklyDeliveries: number;
  averageTime: number;
  weeklyRating: number;
}

class DeliveryAPI {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Dashboard APIs
  async getDashboardStats(): Promise<DashboardStats> {
    return this.makeRequest<DashboardStats>('/api/delivery-partners/me/stats');
  }

  async getActiveOrders() {
    return this.makeRequest('/api/delivery-partners/me/active-orders');
  }

  async updateOnlineStatus(isOnline: boolean, location?: { latitude: number; longitude: number }) {
    return this.makeRequest('/api/delivery-partners/me/online-status', {
      method: 'PATCH',
      body: JSON.stringify({ isOnline, location }),
    });
  }

  // Wallet APIs
  async getWalletData(): Promise<WalletData> {
    return this.makeRequest<WalletData>('/api/delivery-partners/me/wallet');
  }

  async getWalletTransactions() {
    return this.makeRequest('/api/delivery-partners/me/wallet/transactions');
  }

  async getWithdrawalMethods() {
    return this.makeRequest('/api/delivery-partners/me/withdrawal-methods');
  }

  async requestWithdrawal(amount: string, methodId: string) {
    return this.makeRequest('/api/delivery-partners/me/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, methodId }),
    });
  }

  async addWithdrawalMethod(methodData: any) {
    return this.makeRequest('/api/delivery-partners/me/withdrawal-methods', {
      method: 'POST',
      body: JSON.stringify(methodData),
    });
  }

  // Order Management APIs
  async updateOrderStatus(trackingId: string, status: string, location?: any, notes?: string) {
    return this.makeRequest(`/api/delivery-tracking/${trackingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, currentLat: location?.latitude, currentLng: location?.longitude, notes }),
    });
  }

  async getOrderDetails(orderId: string) {
    return this.makeRequest(`/api/orders/${orderId}`);
  }

  async updateLocation(location: { latitude: number; longitude: number }) {
    return this.makeRequest('/api/delivery-partners/me/location', {
      method: 'PATCH',
      body: JSON.stringify({ currentLat: location.latitude, currentLng: location.longitude }),
    });
  }

  // Analytics APIs
  async getEarningsHistory(period: 'week' | 'month' | 'year' = 'month') {
    return this.makeRequest(`/api/delivery-partners/me/earnings?period=${period}`);
  }

  async getPerformanceMetrics() {
    return this.makeRequest('/api/delivery-partners/me/performance');
  }

  // Profile APIs
  async updateProfile(profileData: any) {
    return this.makeRequest('/api/delivery-partners/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  async uploadDocument(type: string, file: any) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);

    return this.makeRequest('/api/delivery-partners/me/documents', {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  }

  // Notification APIs
  async getNotifications() {
    return this.makeRequest('/api/delivery-partners/me/notifications');
  }

  async markNotificationRead(notificationId: string) {
    return this.makeRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  // Support APIs
  async createSupportTicket(subject: string, description: string, priority: string = 'medium') {
    return this.makeRequest('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, description, priority, type: 'delivery_partner' }),
    });
  }

  async getSupportTickets() {
    return this.makeRequest('/api/support/tickets');
  }
}

export const deliveryAPI = new DeliveryAPI();
