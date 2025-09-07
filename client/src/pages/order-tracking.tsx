
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveTrackingMap from "@/components/live-tracking-map";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  MapPin, Clock, Phone, MessageCircle, Star, 
  CheckCircle, Package, Truck, Navigation 
} from "lucide-react";

export default function OrderTracking() {
  const { orderId } = useParams();
  const [currentSection, setCurrentSection] = useState("orders");

  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
    refetchInterval: 10000, // Update every 10 seconds
  });

  const { data: tracking } = useQuery({
    queryKey: ["/api/orders", orderId, "tracking"],
    enabled: !!orderId,
    refetchInterval: 5000, // Update every 5 seconds for live tracking
  });

  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0, timestamp: new Date() });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!orderId) return;

    const ws = new WebSocket(`ws://localhost:5000/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'track_order', orderId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'partner_location_update' && data.partnerId === tracking?.deliveryPartnerId) {
        setCurrentLocation({
          lat: data.location.latitude,
          lng: data.location.longitude,
          timestamp: new Date(data.timestamp),
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [orderId, tracking?.deliveryPartnerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order || !tracking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground">
              The order you're looking for doesn't exist or tracking is not available yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'assigned':
        return {
          icon: Package,
          title: 'Order Assigned',
          description: 'Your order has been assigned to a delivery partner',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
        };
      case 'picked_up':
        return {
          icon: CheckCircle,
          title: 'Order Picked Up',
          description: 'Your order has been collected from the restaurant',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        };
      case 'in_transit':
        return {
          icon: Truck,
          title: 'On the Way',
          description: 'Your order is being delivered to you',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
        };
      case 'delivered':
        return {
          icon: CheckCircle,
          title: 'Delivered',
          description: 'Your order has been delivered successfully',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      default:
        return {
          icon: Package,
          title: 'Processing',
          description: 'Your order is being processed',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
    }
  };

  const statusDetails = getStatusDetails(tracking.status);
  const StatusIcon = statusDetails.icon;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Order Tracking</h1>
            <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
          </div>
          <Badge className={statusDetails.bgColor + " " + statusDetails.color}>
            {tracking.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </header>

      <main className="pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Status Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${statusDetails.bgColor}`}>
                  <StatusIcon className={`w-6 h-6 ${statusDetails.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{statusDetails.title}</h3>
                  <p className="text-muted-foreground">{statusDetails.description}</p>
                  {tracking.estimatedTime && tracking.status !== 'delivered' && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        ETA: {tracking.estimatedTime} minutes
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Map */}
          {tracking.status !== 'delivered' && tracking.deliveryPartner && (
            <div className="mb-6">
              <LiveTrackingMap
                orderId={order.id}
                deliveryPartnerId={tracking.deliveryPartnerId}
                pickupLocation={{
                  lat: tracking.pickupLat,
                  lng: tracking.pickupLng,
                  address: order.restaurant.address,
                }}
                deliveryLocation={{
                  lat: tracking.dropoffLat,
                  lng: tracking.dropoffLng,
                  address: order.deliveryAddress,
                }}
                currentLocation={currentLocation}
                estimatedTime={tracking.estimatedTime}
                status={tracking.status}
                partnerInfo={tracking.deliveryPartner}
              />
            </div>
          )}

          {/* Order Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Restaurant Info */}
                <div className="flex items-center space-x-4">
                  <img 
                    src={order.restaurant.imageUrl || "/api/placeholder/60/60"} 
                    alt={order.restaurant.name}
                    className="w-15 h-15 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{order.restaurant.name}</h4>
                    <p className="text-sm text-muted-foreground">{order.restaurant.address}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">{order.restaurant.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h5 className="font-medium">Items Ordered:</h5>
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bill Summary */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>₹{order.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST</span>
                    <span>₹{order.gst}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>₹{order.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Delivery Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  icon={Package}
                  title="Order Placed"
                  time={new Date(order.createdAt).toLocaleTimeString()}
                  isCompleted={true}
                  isActive={false}
                />
                <TimelineItem
                  icon={CheckCircle}
                  title="Order Confirmed"
                  time={order.confirmedAt ? new Date(order.confirmedAt).toLocaleTimeString() : undefined}
                  isCompleted={!!order.confirmedAt}
                  isActive={tracking.status === 'confirmed'}
                />
                <TimelineItem
                  icon={Truck}
                  title="Out for Pickup"
                  time={tracking.assignedAt ? new Date(tracking.assignedAt).toLocaleTimeString() : undefined}
                  isCompleted={['picked_up', 'in_transit', 'delivered'].includes(tracking.status)}
                  isActive={tracking.status === 'assigned'}
                />
                <TimelineItem
                  icon={Navigation}
                  title="Order Picked Up"
                  time={tracking.pickedUpAt ? new Date(tracking.pickedUpAt).toLocaleTimeString() : undefined}
                  isCompleted={['in_transit', 'delivered'].includes(tracking.status)}
                  isActive={tracking.status === 'picked_up'}
                />
                <TimelineItem
                  icon={MapPin}
                  title="Out for Delivery"
                  time={tracking.status === 'in_transit' ? 'Now' : undefined}
                  isCompleted={tracking.status === 'delivered'}
                  isActive={tracking.status === 'in_transit'}
                />
                <TimelineItem
                  icon={CheckCircle}
                  title="Delivered"
                  time={tracking.deliveredAt ? new Date(tracking.deliveredAt).toLocaleTimeString() : undefined}
                  isCompleted={tracking.status === 'delivered'}
                  isActive={tracking.status === 'delivered'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Support Actions */}
          {tracking.status !== 'delivered' && (
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Call Support</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat Support</span>
                  </Button>
                  {tracking.deliveryPartner && (
                    <>
                      <Button variant="outline" className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>Call Delivery Partner</span>
                      </Button>
                      <Button variant="outline" className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Message Partner</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomNavigation currentSection={currentSection} onSectionChange={setCurrentSection} />
    </div>
  );
}

interface TimelineItemProps {
  icon: any;
  title: string;
  time?: string;
  isCompleted: boolean;
  isActive: boolean;
}

function TimelineItem({ icon: Icon, title, time, isCompleted, isActive }: TimelineItemProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className={`p-2 rounded-full ${
        isCompleted 
          ? 'bg-green-100 text-green-600' 
          : isActive 
          ? 'bg-blue-100 text-blue-600' 
          : 'bg-gray-100 text-gray-400'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className={`font-medium ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-600'}`}>
          {title}
        </p>
        {time && (
          <p className="text-sm text-muted-foreground">{time}</p>
        )}
      </div>
      {isCompleted && (
        <CheckCircle className="w-5 h-5 text-green-600" />
      )}
    </div>
  );
}
