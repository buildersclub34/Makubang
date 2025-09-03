export interface RelatedEntity {
  type: 'order' | 'user' | 'restaurant' | 'delivery' | 'payment' | 'system';
  id: string;
  name?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  relatedTo?: RelatedEntity;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  category?: 'order' | 'payment' | 'delivery' | 'account' | 'promotion' | 'system';
}

export type NotificationType = 
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'DELIVERY_STARTED'
  | 'DELIVERY_UPDATED'
  | 'DELIVERY_COMPLETED'
  | 'ACCOUNT_VERIFIED'
  | 'ACCOUNT_UPDATED'
  | 'PROMOTION_AVAILABLE'
  | 'SYSTEM_ALERT';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms?: boolean;
  categories: {
    order: boolean;
    payment: boolean;
    delivery: boolean;
    account: boolean;
    promotion: boolean;
    system: boolean;
  };
}

export interface MarkAsReadInput {
  notificationIds: string[];
  all?: boolean;
}

export interface NotificationFilter {
  read?: boolean;
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}
