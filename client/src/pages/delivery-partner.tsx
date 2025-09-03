import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  Truck, MapPin, Clock, DollarSign, Star, TrendingUp, 
  Package, CheckCircle, Navigation, Phone, User 
} from "lucide-react";

export default function DeliveryPartner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState("delivery");
  const [location, setLocation] = useState({ lat: 0, lng: 0 });

  // Get delivery partner profile
  const { data: partner } = useQuery({
    queryKey: ["/api/delivery-partners/me"],
  });

  // Get active deliveries
  const { data: deliveries = [] } = useQuery({
    queryKey: ["/api/delivery-partners", partner?.id, "deliveries"],
    enabled: !!partner?.id,
  });

  // Get earnings
  const { data: earnings = [] } = useQuery({
    queryKey: ["/api/delivery-partners", partner?.id, "earnings"],
    enabled: !!partner?.id,
  });

  // Update availability
  const availabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      return apiRequest("PATCH", `/api/delivery-partners/${partner?.id}/availability`, {
        isAvailable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-partners/me"] });
      toast({
        title: isAvailable ? "You're Online!" : "You're Offline",
        description: isAvailable 
          ? "You'll receive delivery requests now" 
          : "You won't receive new delivery requests",
      });
    },
  });

  // Update location
  const locationMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      return apiRequest("PATCH", `/api/delivery-partners/${partner?.id}/location`, {
        currentLat: lat,
        currentLng: lng,
      });
    },
  });

  // Update delivery status
  const statusMutation = useMutation({
    mutationFn: async ({ trackingId, status, notes }: any) => {
      return apiRequest("PATCH", `/api/delivery-tracking/${trackingId}/status`, {
        status,
        currentLat: location.lat,
        currentLng: location.lng,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-partners", partner?.id, "deliveries"] });
      toast({
        title: "Status Updated",
        description: "Delivery status has been updated successfully",
      });
    },
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          
          if (partner?.id) {
            locationMutation.mutate({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, [partner?.id]);

  const handleAvailabilityToggle = (isAvailable: boolean) => {
    availabilityMutation.mutate(isAvailable);
  };

  const handleStatusUpdate = (trackingId: string, status: string) => {
    statusMutation.mutate({ trackingId, status });
  };

  const activeDeliveries = deliveries.filter((d: any) => 
    ['assigned', 'picked_up', 'in_transit'].includes(d.status)
  );

  const totalEarnings = earnings.reduce((sum: number, earning: any) => 
    sum + parseFloat(earning.totalAmount || 0), 0
  );

  const todayEarnings = earnings
    .filter((earning: any) => {
      const today = new Date().toDateString();
      const earningDate = new Date(earning.createdAt).toDateString();
      return today === earningDate;
    })
    .reduce((sum: number, earning: any) => sum + parseFloat(earning.totalAmount || 0), 0);

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Truck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Join as Delivery Partner</h2>
            <p className="text-muted-foreground mb-6">
              Start earning by delivering food orders in your area. Flexible hours, competitive rates!
            </p>
            <Button className="bg-primary hover:bg-primary/90">
              Register as Partner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-primary">Delivery Partner</h1>
            <Badge className={partner.isAvailable ? "bg-accent text-accent-foreground" : "bg-secondary"}>
              {partner.isAvailable ? "Online" : "Offline"}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Available</span>
            <Switch
              checked={partner.isAvailable}
              onCheckedChange={handleAvailabilityToggle}
              disabled={availabilityMutation.isPending}
            />
          </div>
        </div>
      </header>

      <main className="pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-primary/20">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">₹{totalEarnings.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
            
            <Card className="border-accent/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-accent">₹{todayEarnings.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Today's Earnings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold">{partner.totalDeliveries}</p>
                <p className="text-xs text-muted-foreground">Total Deliveries</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{partner.rating}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Deliveries */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Navigation className="w-5 h-5" />
                <span>Active Deliveries ({activeDeliveries.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeDeliveries.length > 0 ? (
                <div className="space-y-4">
                  {activeDeliveries.map((delivery: any) => (
                    <Card key={delivery.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">Order #{delivery.orderId.slice(0, 8)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {delivery.status === 'assigned' && 'Ready for pickup'}
                              {delivery.status === 'picked_up' && 'En route to customer'}
                              {delivery.status === 'in_transit' && 'On the way'}
                            </p>
                          </div>
                          <Badge 
                            className={
                              delivery.status === 'assigned' 
                                ? 'bg-yellow-500/20 text-yellow-700' 
                                : 'bg-accent/20 text-accent-foreground'
                            }
                          >
                            {delivery.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Pickup: Restaurant Address</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="w-4 h-4 text-accent" />
                            <span>Drop: Customer Address</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Estimated: {delivery.estimatedTime || 30} mins</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {delivery.status === 'assigned' && (
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => handleStatusUpdate(delivery.id, 'picked_up')}
                              disabled={statusMutation.isPending}
                            >
                              Mark Picked Up
                            </Button>
                          )}
                          {delivery.status === 'picked_up' && (
                            <Button 
                              size="sm" 
                              className="bg-accent hover:bg-accent/90"
                              onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                              disabled={statusMutation.isPending}
                            >
                              Mark Delivered
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-1" />
                            Call Customer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active deliveries</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {partner.isAvailable 
                      ? "You'll receive notifications for new orders" 
                      : "Turn on availability to receive orders"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Recent Earnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length > 0 ? (
                <div className="space-y-3">
                  {earnings.slice(0, 5).map((earning: any) => (
                    <div key={earning.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{earning.orderId.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(earning.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{earning.totalAmount}</p>
                        <Badge 
                          className={
                            earning.status === 'paid' 
                              ? 'bg-accent/20 text-accent-foreground' 
                              : 'bg-yellow-500/20 text-yellow-700'
                          }
                        >
                          {earning.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No earnings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete deliveries to start earning!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation currentSection={currentSection} onSectionChange={setCurrentSection} />
    </div>
  );
}