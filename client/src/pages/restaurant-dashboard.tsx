
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  ChefHat, TrendingUp, Package, Users, DollarSign, Star,
  Plus, Edit, Trash2, Eye, Calendar, Clock, MapPin,
  Bell, Settings, LogOut, Download, Upload, Camera
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  spiceLevel: number;
  preparationTime: number;
  ingredients: string[];
  allergens: string[];
  isAvailable: boolean;
  customizations: any[];
}

interface Order {
  id: string;
  items: any[];
  subtotal: number;
  total: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  estimatedDelivery: string;
}

interface Analytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  rating: number;
  ordersToday: number;
  revenueToday: number;
  popularItems: { name: string; count: number }[];
  hourlyOrders: { hour: string; orders: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  categoryDistribution: { category: string; value: number }[];
}

export default function RestaurantDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { toast } = useToast();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch menu items
      const menuResponse = await fetch('/api/restaurant/menu');
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        setMenuItems(menuData);
      }

      // Fetch orders
      const ordersResponse = await fetch('/api/restaurant/orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData);
      }

      // Fetch analytics
      const analyticsResponse = await fetch('/api/restaurant/analytics');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus}`,
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const saveMenuItem = async (item: Partial<MenuItem>) => {
    try {
      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        const savedItem = await response.json();
        
        if (editingItem) {
          setMenuItems(menuItems.map(mi => mi.id === editingItem.id ? savedItem : mi));
        } else {
          setMenuItems([...menuItems, savedItem]);
        }

        setEditingItem(null);
        setIsAddingItem(false);
        toast({
          title: "Success",
          description: `Menu item ${editingItem ? 'updated' : 'created'} successfully`,
        });
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: "Error",
        description: "Failed to save menu item",
        variant: "destructive",
      });
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMenuItems(menuItems.filter(item => item.id !== itemId));
        toast({
          title: "Success",
          description: "Menu item deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-green-500';
      case 'picked_up': return 'bg-purple-500';
      case 'delivered': return 'bg-green-600';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-orange-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Restaurant Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{analytics?.ordersToday || 0} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics?.totalRevenue || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +₹{analytics?.revenueToday || 0} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics?.averageOrderValue || 0}</div>
                  <p className="text-xs text-muted-foreground">Per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.rating || 0}</div>
                  <p className="text-xs text-muted-foreground">Average rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest orders from your restaurant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <div>
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-500">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{order.total}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Manage incoming orders and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <div>
                            <h3 className="font-medium">Order #{order.id.slice(0, 8)}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{order.total}</p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                                <DialogDescription>
                                  Order #{selectedOrder?.id.slice(0, 8)}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedOrder && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Customer</Label>
                                      <p>{selectedOrder.customerName}</p>
                                    </div>
                                    <div>
                                      <Label>Phone</Label>
                                      <p>{selectedOrder.customerPhone}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <Label>Delivery Address</Label>
                                      <p>{selectedOrder.deliveryAddress}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Items</Label>
                                    <div className="space-y-2 mt-2">
                                      {selectedOrder.items.map((item, index) => (
                                        <div key={index} className="flex justify-between border-b pb-2">
                                          <span>{item.name} x{item.quantity}</span>
                                          <span>₹{item.price * item.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>₹{selectedOrder.total}</span>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{order.customerName}</span>
                          <MapPin className="h-4 w-4 ml-4" />
                          <span>{order.deliveryAddress.slice(0, 30)}...</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                            >
                              Start Preparing
                            </Button>
                          )}
                          {order.status === 'preparing' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                            >
                              Mark Ready
                            </Button>
                          )}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Menu Management</CardTitle>
                  <CardDescription>Add, edit, and manage your menu items</CardDescription>
                </div>
                <Button onClick={() => setIsAddingItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-video bg-gray-200 relative">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Camera className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={(checked) => {
                              saveMenuItem({ ...item, isAvailable: checked });
                            }}
                          />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-green-600">₹{item.price}</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">{item.preparationTime}m</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.isVegetarian && (
                            <Badge variant="outline" className="text-green-600">Veg</Badge>
                          )}
                          {item.isVegan && (
                            <Badge variant="outline" className="text-green-600">Vegan</Badge>
                          )}
                          {item.isGlutenFree && (
                            <Badge variant="outline" className="text-blue-600">Gluten Free</Badge>
                          )}
                          {item.spiceLevel > 0 && (
                            <Badge variant="outline" className="text-red-600">
                              🌶️ {item.spiceLevel}/5
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMenuItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add/Edit Menu Item Dialog */}
            <MenuItemDialog
              item={editingItem}
              isOpen={isAddingItem || !!editingItem}
              onClose={() => {
                setIsAddingItem(false);
                setEditingItem(null);
              }}
              onSave={saveMenuItem}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Hourly Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.hourlyOrders || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Daily Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.dailyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Popular Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.popularItems || []} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.categoryDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analytics?.categoryDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <RestaurantSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Menu Item Dialog Component
function MenuItemDialog({ item, isOpen, onClose, onSave }: {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<MenuItem>) => void;
}) {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    preparationTime: 0,
    spiceLevel: 0,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isAvailable: true,
    ingredients: [],
    allergens: [],
    customizations: []
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: '',
        preparationTime: 0,
        spiceLevel: 0,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isAvailable: true,
        ingredients: [],
        allergens: [],
        customizations: []
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appetizers">Appetizers</SelectItem>
                  <SelectItem value="mains">Main Course</SelectItem>
                  <SelectItem value="desserts">Desserts</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                  <SelectItem value="sides">Sides</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="spiceLevel">Spice Level (0-5)</Label>
              <Select value={formData.spiceLevel?.toString()} onValueChange={(value) => setFormData({ ...formData, spiceLevel: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select spice level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Not Spicy</SelectItem>
                  <SelectItem value="1">1 - Mild</SelectItem>
                  <SelectItem value="2">2 - Medium</SelectItem>
                  <SelectItem value="3">3 - Hot</SelectItem>
                  <SelectItem value="4">4 - Very Hot</SelectItem>
                  <SelectItem value="5">5 - Extremely Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="vegetarian"
                checked={formData.isVegetarian}
                onCheckedChange={(checked) => setFormData({ ...formData, isVegetarian: checked })}
              />
              <Label htmlFor="vegetarian">Vegetarian</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="vegan"
                checked={formData.isVegan}
                onCheckedChange={(checked) => setFormData({ ...formData, isVegan: checked })}
              />
              <Label htmlFor="vegan">Vegan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="glutenFree"
                checked={formData.isGlutenFree}
                onCheckedChange={(checked) => setFormData({ ...formData, isGlutenFree: checked })}
              />
              <Label htmlFor="glutenFree">Gluten Free</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="available"
                checked={formData.isAvailable}
                onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
              />
              <Label htmlFor="available">Available</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {item ? 'Update' : 'Create'} Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Restaurant Settings Component
function RestaurantSettings() {
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    cuisine: [],
    address: '',
    phone: '',
    email: '',
    operatingHours: {},
    deliveryRadius: 5,
    minimumOrder: 200,
    deliveryFee: 40,
    averageDeliveryTime: 30,
    acceptingOrders: true,
    autoAcceptOrders: false,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
          <CardDescription>Update your restaurant details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Settings</CardTitle>
          <CardDescription>Configure delivery options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="delivery-radius">Delivery Radius (km)</Label>
              <Input
                id="delivery-radius"
                type="number"
                value={settings.deliveryRadius}
                onChange={(e) => setSettings({ ...settings, deliveryRadius: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="minimum-order">Minimum Order (₹)</Label>
              <Input
                id="minimum-order"
                type="number"
                value={settings.minimumOrder}
                onChange={(e) => setSettings({ ...settings, minimumOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="delivery-fee">Delivery Fee (₹)</Label>
              <Input
                id="delivery-fee"
                type="number"
                value={settings.deliveryFee}
                onChange={(e) => setSettings({ ...settings, deliveryFee: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="accepting-orders"
                checked={settings.acceptingOrders}
                onCheckedChange={(checked) => setSettings({ ...settings, acceptingOrders: checked })}
              />
              <Label htmlFor="accepting-orders">Currently Accepting Orders</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-accept"
                checked={settings.autoAcceptOrders}
                onCheckedChange={(checked) => setSettings({ ...settings, autoAcceptOrders: checked })}
              />
              <Label htmlFor="auto-accept">Auto Accept Orders</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
