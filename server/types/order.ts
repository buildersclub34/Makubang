import { ObjectId } from 'mongodb';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  ASSIGNED = 'ASSIGNED'
}

export interface OrderItem {
  _id: ObjectId;
  menuItemId: ObjectId;
  quantity: number;
  price: string;
  specialInstructions?: string;
  menuItem?: {
    _id: ObjectId;
    name: string;
    description?: string;
  };
}

export interface OrderWithRelations {
  _id: ObjectId;
  id: string;
  userId: ObjectId | string;
  restaurantId: ObjectId | string;
  deliveryPartnerId: ObjectId | string | null;
  status: OrderStatus;
  totalAmount: string;
  deliveryFee: string;
  platformFee: string;
  taxes: string;
  discountAmount: string;
  deliveryAddress: any;
  pickupAddress: any;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  estimatedDeliveryTime: Date | null;
  actualDeliveryTime: Date | null;
  trackingData: {
    currentLocation?: {
      lat: number;
      lng: number;
    };
    locationHistory?: Array<{
      lat: number;
      lng: number;
      timestamp: Date;
    }>;
    updatedAt?: Date;
  };
  metadata?: Record<string, any>;
  rating: number | null;
  review: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    _id: ObjectId;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  restaurant: {
    _id: ObjectId;
    name: string;
    address: string;
    phone: string;
  } | null;
  items: OrderItem[];
}
