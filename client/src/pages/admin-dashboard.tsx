import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard/admin/summary', { credentials: 'include' });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{data?.users || 0}</div></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Restaurants</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{data?.restaurants || 0}</div></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Videos</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-bold">{data?.videos || 0}</div></CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xl">Count: {data?.orders?.count || 0}</div>
          <div className="text-xl">Revenue: ₹{data?.orders?.revenue || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Store, TrendingUp, Video, CheckCircle, XCircle } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useState } from "react";

export default function AdminDashboard() {
  const [currentSection, setCurrentSection] = useState("admin");

  const { data: analytics } = useQuery({
    queryKey: ["/api/admin/analytics"],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
          <Button variant="ghost" onClick={() => window.location.href = '/api/logout'}>
            Logout
          </Button>
        </div>
      </header>

      <main className="pt-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Platform Overview</h2>
            <p className="text-muted-foreground">Monitor and manage the Makubang platform</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Users</p>
                    <p className="text-2xl font-bold">{analytics?.users || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-accent mt-2">↗ +12% this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active Restaurants</p>
                    <p className="text-2xl font-bold">{analytics?.restaurants || 0}</p>
                  </div>
                  <Store className="w-8 h-8 text-accent" />
                </div>
                <p className="text-sm text-accent mt-2">↗ +8% this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{analytics?.orders?.totalRevenue || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-accent mt-2">↗ +25% this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Published Videos</p>
                    <p className="text-2xl font-bold">{analytics?.videos || 0}</p>
                  </div>
                  <Video className="w-8 h-8 text-accent" />
                </div>
                <p className="text-sm text-accent mt-2">↗ +18% this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Content & Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Content Moderation Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Content Moderation Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                    <img 
                      src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=64&h=64&fit=crop" 
                      alt="Content" 
                      className="w-16 h-16 rounded-lg object-cover" 
                    />
                    <div className="flex-1">
                      <p className="font-medium">Spicy Korean Mukbang</p>
                      <p className="text-sm text-muted-foreground">@spicy_eats_ko</p>
                      <Badge variant="destructive" className="text-xs mt-1">
                        Flagged: Language concerns
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-accent hover:bg-accent/90">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                    <img 
                      src="https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=64&h=64&fit=crop" 
                      alt="Content" 
                      className="w-16 h-16 rounded-lg object-cover" 
                    />
                    <div className="flex-1">
                      <p className="font-medium">Pizza Making Tutorial</p>
                      <p className="text-sm text-muted-foreground">@pizza_master</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        Pending Review
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-accent hover:bg-accent/90">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <Button variant="outline">View All Pending Content</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Real-time Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Active Orders</p>
                    <p className="text-2xl font-bold text-primary">{analytics?.realtime?.activeOrders || 0}</p>
                  </div>
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Online Partners</p>
                    <p className="text-2xl font-bold text-accent">{analytics?.realtime?.onlinePartners || 0}</p>
                  </div>
                </div>

                {/* Revenue Chart */}
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Revenue Trend (Last 6 months)</p>
                  <div className="flex items-end space-x-2 h-32">
                    {analytics?.revenue?.monthlyData?.map((value: number, index: number) => (
                      <div 
                        key={index}
                        className="bg-gradient-to-t from-accent to-accent/70 w-8 rounded-t" 
                        style={{height: `${(value / Math.max(...(analytics?.revenue?.monthlyData || [1]))) * 100}%`}}
                        title={`₹${value.toLocaleString()}`}
                      />
                    )) || Array.from({length: 6}).map((_, index) => (
                      <div key={index} className="bg-gradient-to-t from-accent to-accent/70 w-8 rounded-t" style={{height: `${60 + Math.random() * 40}%`}} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
                </div>
                
                {/* Top Performing Content */}
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Top Performing Videos This Week</p>
                  <div className="space-y-2">
                    {analytics?.topVideos?.map((video: any) => (
                      <div key={video.id} className="flex justify-between text-sm">
                        <span className="truncate flex-1">{video.title}</span>
                        <span className="font-medium ml-2">{video.views.toLocaleString()} views</span>
                      </div>
                    )) || (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Korean BBQ Mukbang</span>
                          <span className="font-medium">2.4M views</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Pizza Making Master Class</span>
                          <span className="font-medium">1.8M views</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Street Food Tour Mumbai</span>
                          <span className="font-medium">1.2M views</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Delivery Partner Performance */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Top Delivery Partners</p>
                  <div className="space-y-2">
                    {analytics?.topPartners?.map((partner: any) => (
                      <div key={partner.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">{partner.name}</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs">{partner.rating}</span>
                          </div>
                        </div>
                        <span className="text-muted-foreground">{partner.deliveries} deliveries</span>
                      </div>
                    )) || (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">Rajesh Kumar</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs">4.9</span>
                            </div>
                          </div>
                          <span className="text-muted-foreground">47 deliveries</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">Amit Singh</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs">4.8</span>
                            </div>
                          </div>
                          <span className="text-muted-foreground">42 deliveries</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNavigation currentSection={currentSection} onSectionChange={setCurrentSection} />
    </div>
  );
}
