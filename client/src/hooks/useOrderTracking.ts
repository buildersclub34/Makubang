import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

declare global {
  interface Window {
    WebSocket: typeof WebSocket;
  }
}

interface OrderTrackingData {
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
  metadata?: Record<string, any>;
}

interface UseOrderTrackingProps {
  orderId?: string;
  onStatusUpdate?: (data: OrderTrackingData) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

export function useOrderTracking({
  orderId,
  onStatusUpdate,
  onError,
  autoConnect = true,
}: UseOrderTrackingProps = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [trackingData, setTrackingData] = useState<OrderTrackingData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!orderId || !session?.accessToken) {
      return;
    }

    // Close existing connection if any
    if (ws.current) {
      ws.current.close();
    }

    try {
      // Create WebSocket connection
      const wsUrl = new URL(
        '/api/ws/orders',
        typeof window !== 'undefined' 
          ? window.location.origin.replace('http', 'ws') 
          : 'ws://localhost:3000'
      );
      wsUrl.searchParams.append('orderId', orderId);
      
      if (session?.accessToken) {
        wsUrl.searchParams.append('token', session.accessToken as string);
      }

      ws.current = new (globalThis.WebSocket || WebSocket)(wsUrl.toString());

    ws.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ORDER_UPDATE') {
          const orderData = {
            ...data.payload,
            updatedAt: new Date(data.payload.updatedAt),
            estimatedDeliveryTime: data.payload.estimatedDeliveryTime 
              ? new Date(data.payload.estimatedDeliveryTime) 
              : undefined,
          };
          setTrackingData(orderData);
          onStatusUpdate?.(orderData);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    ws.current.onclose = (event) => {
      setIsConnected(false);
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        // Attempt to reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current += 1;
        
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };

    ws.current.onerror = (event) => {
      const error = new Error('WebSocket error');
      setError(error);
      onError?.(error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [orderId, session?.accessToken, onStatusUpdate, onError]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  // Auto-connect when component mounts or dependencies change
  useEffect(() => {
    if (autoConnect && orderId) {
      connect();
    }
    
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [orderId, autoConnect, connect]);

  // Manually trigger a reconnection
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // Get the estimated time remaining until delivery
  const getTimeRemaining = useCallback(() => {
    if (!trackingData?.estimatedDeliveryTime) return null;
    
    const now = new Date();
    const deliveryTime = new Date(trackingData.estimatedDeliveryTime);
    const diffMs = deliveryTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return { minutes: 0, seconds: 0 };
    
    return {
      minutes: Math.floor(diffMs / (1000 * 60)),
      seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
    };
  }, [trackingData?.estimatedDeliveryTime]);

  // Get the order status with user-friendly display text
  const getStatusDisplay = useCallback(() => {
    if (!trackingData?.status) return 'Unknown';
    
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Order Confirmed',
      preparing: 'Preparing Your Food',
      ready_for_pickup: 'Ready for Pickup',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
    };
    
    return statusMap[trackingData.status] || trackingData.status;
  }, [trackingData?.status]);

  // Check if the order is in progress
  const isOrderInProgress = useCallback(() => {
    if (!trackingData?.status) return false;
    
    const inProgressStatuses = [
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
    ];
    
    return inProgressStatuses.includes(trackingData.status);
  }, [trackingData?.status]);

  return {
    isConnected,
    trackingData,
    error,
    connect,
    disconnect,
    reconnect,
    getTimeRemaining,
    getStatusDisplay,
    isOrderInProgress: isOrderInProgress(),
  };
}

// Helper hook for tracking multiple orders
export function useMultipleOrderTracking(orderIds: string[]) {
  const [trackingData, setTrackingData] = useState<Record<string, OrderTrackingData>>({});
  
  const handleStatusUpdate = useCallback((orderId: string, data: OrderTrackingData) => {
    setTrackingData(prev => ({
      ...prev,
      [orderId]: data,
    }));
  }, []);
  
  // Create a tracker for each order
  const trackers = orderIds.map(orderId => ({
    orderId,
    ...useOrderTracking({
      orderId,
      onStatusUpdate: (data) => handleStatusUpdate(orderId, data),
      autoConnect: true,
    }),
  }));
  
  // Get a specific order's tracking data
  const getOrderTracking = useCallback((orderId: string) => {
    return trackingData[orderId] || null;
  }, [trackingData]);
  
  // Check if any order is in progress
  const isAnyOrderInProgress = useCallback(() => {
    return trackers.some(tracker => tracker.isOrderInProgress);
  }, [trackers]);
  
  return {
    trackers,
    trackingData,
    getOrderTracking,
    isAnyOrderInProgress,
  };
}
