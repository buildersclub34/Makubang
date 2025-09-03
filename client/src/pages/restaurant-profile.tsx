import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, DollarSign, TrendingUp, Users, ShoppingCart } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useState as useStateHook } from "react";

export default function RestaurantProfile() {
  const { id } = useParams();
  const [currentSection, setCurrentSection] = useStateHook("restaurant");

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["/api/restaurants", id],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/restaurants", id, "analytics"],
    enabled: !!id,
  });

  const { data: menuItems } = useQuery({
    queryKey: ["/api/restaurants", id, "menu"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Restaurant Not Found</h2>
          <p className="text-muted-foreground">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Restaurant Profile</h1>
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Back
          </Button>
        </div>
      </header>

      <main className="pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Restaurant Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <img 
                  src={restaurant.imageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&h=150&fit=crop"} 
                  alt={restaurant.name} 
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{restaurant.name}</h2>
                  <p className="text-muted-foreground mb-3">{restaurant.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{restaurant.rating}</span>
                      <span className="text-muted-foreground">• 2.3k reviews</span>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{restaurant.deliveryTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>{restaurant.priceRange}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground p-4 rounded-lg text-center">
                  <p className="font-semibold">Premium Plan</p>
                  <p className="text-sm opacity-90">₹1,000/month</p>
                  <p className="text-xs opacity-75">{restaurant.ordersThisMonth}/20 orders used</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Video Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Views</span>
                    <span className="font-semibold">{analytics.videos?.totalViews || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-semibold text-accent">
                      {analytics.videos?.totalViews > 0 
                        ? ((analytics.videos.totalOrdersFromVideos / analytics.videos.totalViews) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders from Videos</span>
                    <span className="font-semibold">{analytics.videos?.totalOrdersFromVideos || 0}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Revenue Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-semibold text-primary">₹{analytics.orders?.totalRevenue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Order Value</span>
                    <span className="font-semibold">₹{analytics.orders?.avgOrderValue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span className="font-semibold">{analytics.orders?.totalOrders || 0}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Popular Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {menuItems && menuItems.length > 0 ? (
                    <div className="space-y-2">
                      {menuItems.slice(0, 3).map((item: any, index: number) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-sm">{item.name}</span>
                          <span className="text-sm font-medium">{45 - index * 10}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No menu items available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Menu Items */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              {menuItems && menuItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map((item: any) => (
                    <div 
                      key={item.id} 
                      className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:shadow-md transition-all"
                    >
                      <img 
                        src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop"} 
                        alt={item.name} 
                        className="w-16 h-16 rounded-lg object-cover" 
                      />
                      <div className="flex-1">
                        <h5 className="font-semibold">{item.name}</h5>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        <p className="text-primary font-bold text-lg">₹{item.price}</p>
                      </div>
                      <Badge variant={item.isAvailable ? "default" : "secondary"}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No menu items available</p>
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
