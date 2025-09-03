import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, ShoppingBag } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useState } from "react";

export default function UserProfile() {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState("profile");

  const { data: orders } = useQuery({
    queryKey: ["/api/user/orders"],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Profile</h1>
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="pt-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face"} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <div>
                      <span className="font-medium">{user?.followingCount || 0}</span>
                      <span className="text-muted-foreground ml-1">Following</span>
                    </div>
                    <div>
                      <span className="font-medium">{user?.followersCount || 0}</span>
                      <span className="text-muted-foreground ml-1">Followers</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-edit-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              {/* Food Preferences */}
              <div>
                <h5 className="font-semibold mb-3">Food Preferences</h5>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-accent text-accent-foreground">Japanese</Badge>
                  <Badge variant="secondary">Spicy Food</Badge>
                  <Badge variant="secondary">Vegetarian</Badge>
                  <Badge variant="secondary">Street Food</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order: any) => (
                    <div 
                      key={order.id} 
                      className="flex items-center space-x-4 p-4 border border-border rounded-lg"
                    >
                      <img 
                        src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=48&h=48&fit=crop" 
                        alt="Order" 
                        className="w-12 h-12 rounded-lg object-cover" 
                      />
                      <div className="flex-1">
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{order.total}</p>
                        <Badge 
                          className={
                            order.status === 'delivered' 
                              ? 'bg-accent text-accent-foreground' 
                              : order.status === 'cancelled'
                              ? 'bg-destructive text-destructive-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-4">
                    <Button variant="outline">View All Orders</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start exploring videos and place your first order!
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
