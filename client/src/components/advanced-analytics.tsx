
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  PlayCircle, 
  Heart, 
  Share2, 
  ShoppingCart,
  Clock,
  MapPin,
  Star,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    customerRetention: number;
    growthRate: number;
  };
  videos: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    conversionRate: number;
    topPerformingVideos: Array<{
      id: string;
      title: string;
      views: number;
      orders: number;
      revenue: number;
    }>;
  };
  customers: {
    newCustomers: number;
    returningCustomers: number;
    avgSessionTime: number;
    topLocations: Array<{
      area: string;
      orders: number;
      revenue: number;
    }>;
  };
  trends: {
    dailyOrders: Array<{
      date: string;
      orders: number;
      revenue: number;
    }>;
    popularItems: Array<{
      item: string;
      orders: number;
      revenue: number;
    }>;
    peakHours: Array<{
      hour: number;
      orders: number;
    }>;
  };
}

interface AdvancedAnalyticsProps {
  restaurantId?: string;
  dateRange?: string;
  className?: string;
}

export function AdvancedAnalytics({ restaurantId, dateRange = '30d', className }: AdvancedAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [restaurantId, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API call
      const mockData: AnalyticsData = {
        overview: {
          totalRevenue: 125000,
          totalOrders: 342,
          avgOrderValue: 365,
          customerRetention: 68,
          growthRate: 24.5,
        },
        videos: {
          totalViews: 1250000,
          totalLikes: 85000,
          totalShares: 12000,
          conversionRate: 3.2,
          topPerformingVideos: [
            { id: '1', title: 'Butter Chicken Special', views: 125000, orders: 45, revenue: 16425 },
            { id: '2', title: 'Biryani Making Process', views: 89000, orders: 38, revenue: 13870 },
            { id: '3', title: 'Street Style Chaat', views: 67000, orders: 29, revenue: 10585 },
          ]
        },
        customers: {
          newCustomers: 156,
          returningCustomers: 186,
          avgSessionTime: 4.2,
          topLocations: [
            { area: 'Koramangala', orders: 89, revenue: 32450 },
            { area: 'Indiranagar', orders: 67, revenue: 24455 },
            { area: 'Whitefield', orders: 54, revenue: 19710 },
          ]
        },
        trends: {
          dailyOrders: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            orders: Math.floor(Math.random() * 20) + 5,
            revenue: Math.floor(Math.random() * 8000) + 2000,
          })),
          popularItems: [
            { item: 'Butter Chicken', orders: 89, revenue: 32450 },
            { item: 'Biryani', orders: 67, revenue: 24455 },
            { item: 'Masala Dosa', orders: 54, revenue: 10800 },
          ],
          peakHours: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            orders: hour >= 11 && hour <= 14 || hour >= 19 && hour <= 22 
              ? Math.floor(Math.random() * 25) + 10
              : Math.floor(Math.random() * 10) + 1,
          })),
        }
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analyticsData) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { overview, videos, customers, trends } = analyticsData;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Revenue</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">₹{overview.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                +{overview.growthRate}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Orders</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{overview.totalOrders}</div>
              <div className="text-xs text-muted-foreground">
                ₹{overview.avgOrderValue} avg
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Video Views</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{(videos.totalViews / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">
                {videos.conversionRate}% conversion
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Engagement</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{(videos.totalLikes / 1000).toFixed(0)}K</div>
              <div className="text-xs text-muted-foreground">
                {videos.totalShares} shares
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium">Retention</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{overview.customerRetention}%</div>
              <div className="text-xs text-muted-foreground">
                {customers.returningCustomers} returning
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-center">
                  <BarChart3 className="w-16 h-16 text-green-600 mb-8" />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Revenue chart would be rendered here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-t from-blue-50 to-transparent rounded-lg flex items-center justify-center">
                  <PieChart className="w-16 h-16 text-blue-600" />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Order distribution chart would be rendered here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {videos.topPerformingVideos.map((video, idx) => (
                  <div key={video.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{idx + 1}</Badge>
                      <div className="w-16 h-12 bg-gray-200 rounded" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{video.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{video.views.toLocaleString()} views</span>
                        <span>{video.orders} orders</span>
                        <span>₹{video.revenue.toLocaleString()} revenue</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {((video.orders / video.views) * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">conversion</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Customers</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${(customers.newCustomers / (customers.newCustomers + customers.returningCustomers)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{customers.newCustomers}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Returning Customers</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-600 rounded-full" 
                          style={{ width: `${(customers.returningCustomers / (customers.newCustomers + customers.returningCustomers)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{customers.returningCustomers}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Delivery Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customers.topLocations.map((location, idx) => (
                    <div key={location.area} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <MapPin className="w-3 h-3" />
                        <span>{location.area}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{location.orders} orders</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{location.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-1 h-32">
                  {trends.peakHours.map(({ hour, orders }) => {
                    const maxOrders = Math.max(...trends.peakHours.map(h => h.orders));
                    const height = (orders / maxOrders) * 100;
                    
                    return (
                      <div key={hour} className="flex flex-col items-center gap-1">
                        <div 
                          className={cn(
                            "w-full rounded-t transition-all",
                            orders > maxOrders * 0.7 ? "bg-red-500" :
                            orders > maxOrders * 0.5 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {hour.toString().padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Orders by hour of day
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trends.popularItems.map((item, idx) => (
                    <div key={item.item} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <span className="font-medium">{item.item}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">{item.orders} orders</div>
                        <div className="text-muted-foreground">₹{item.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
