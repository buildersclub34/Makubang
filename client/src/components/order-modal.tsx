import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Star, Clock, Plus, Minus, X, ShoppingBag } from "lucide-react";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  onOrderComplete: () => void;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export default function OrderModal({ isOpen, onClose, video, onOrderComplete }: OrderModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const { data: restaurant } = useQuery({
    queryKey: ["/api/restaurants", video?.restaurantId],
    enabled: !!video?.restaurantId,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/restaurants", video?.restaurantId, "menu"],
    enabled: !!video?.restaurantId,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      onOrderComplete();
      setCartItems([]);
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been confirmed and is being prepared.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToCart = (menuItem: any) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === menuItem.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          id: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity: 1,
          imageUrl: menuItem.imageUrl,
        }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter(item => item.id !== itemId);
      }
    });
  };

  const getCartTotal = () => {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 40;
    const gst = (subtotal + deliveryFee) * 0.05;
    return {
      subtotal,
      deliveryFee,
      gst,
      total: subtotal + deliveryFee + gst,
    };
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before ordering.",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, deliveryFee, gst, total } = getCartTotal();
    
    const orderData = {
      restaurantId: video?.restaurantId,
      videoId: video?.id,
      items: cartItems.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      gst: gst.toFixed(2),
      total: total.toFixed(2),
      deliveryAddress: "123 Main Street, City", // In real app, get from user profile
      customerPhone: user?.email || "9999999999", // In real app, get from user profile
    };

    createOrderMutation.mutate(orderData);
  };

  const { subtotal, deliveryFee, gst, total } = getCartTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={restaurant?.imageUrl || "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=48&h=48&fit=crop"} 
                alt={restaurant?.name} 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <DialogTitle className="text-lg font-bold">{restaurant?.name}</DialogTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{restaurant?.rating || "4.8"}</span>
                  <span>•</span>
                  <Clock className="w-4 h-4" />
                  <span>{restaurant?.deliveryTime || "25-30 min"}</span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4">
          {/* Menu Items */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-lg">Featured Items</h4>
            
            {menuItems.length > 0 ? (
              menuItems.map((item: any) => {
                const cartItem = cartItems.find(ci => ci.id === item.id);
                const quantity = cartItem?.quantity || 0;
                
                return (
                  <Card key={item.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop"} 
                          alt={item.name} 
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h5 className="font-semibold">{item.name}</h5>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                          <p className="text-primary font-bold text-lg">₹{item.price}</p>
                        </div>
                        
                        {quantity === 0 ? (
                          <Button 
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => addToCart(item)}
                            data-testid={`button-add-${item.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => removeFromCart(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-medium w-8 text-center">{quantity}</span>
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => addToCart(item)}
                              data-testid={`button-add-more-${item.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No menu items available</p>
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cartItems.length > 0 && (
            <>
              <Separator className="my-6" />
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Order Summary</span>
                      <span className="text-xl font-bold text-primary">₹{total.toFixed(0)}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>₹{deliveryFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (5%)</span>
                        <span>₹{gst.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Checkout Button */}
          <Button 
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-lg py-6"
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || createOrderMutation.isPending}
            data-testid="button-checkout"
          >
            {createOrderMutation.isPending ? (
              "Placing Order..."
            ) : cartItems.length === 0 ? (
              "Add Items to Order"
            ) : (
              `Proceed to Checkout • ₹${total.toFixed(0)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
