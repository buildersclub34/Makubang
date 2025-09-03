export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED'
}

export interface OrderTrackingData {
  orderId: string;
  status: string;
  updatedAt: Date;
  estimatedDeliveryTime?: Date;
  deliveryPartner?: {
    id: string;
    name: string;
    phone: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  restaurantLocation?: {
    lat: number;
    lng: number;
  };
  customerLocation?: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, unknown>;
  deliveryAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  metadata?: Record<string, unknown>;
}
