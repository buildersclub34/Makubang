import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import RazorpayCheckout from './razorpay-checkout';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId: string;
  restaurantName: string;
}

interface CartManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: () => void;
}

export default function CartManagement({ isOpen, onClose, onOrderComplete }: CartManagementProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('makubang_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('makubang_cart', JSON.stringify(newCart));
  };

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(menuItemId);
      return;
    }

    const newCart = cart.map(item =>
      item.menuItemId === menuItemId
        ? { ...item, quantity: newQuantity }
        : item
    );
    saveCart(newCart);
  };

  const removeItem = (menuItemId: string) => {
    const newCart = cart.filter(item => item.menuItemId !== menuItemId);
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const createOrder = async () => {
    if (cart.length === 0) return;

    setIsCreatingOrder(true);

    try {
      // Group items by restaurant (for simplicity, assume single restaurant)
      const restaurantId = cart[0].restaurantId;
      const items = cart.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      }));

      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
          items,
          deliveryAddress: {
            street: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            country: 'India'
          },
          paymentMethod: 'online'
        })
      });

      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
        setShowCheckout(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order error:', error);
      alert('Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = (response: any) => {
    clearCart();
    setShowCheckout(false);
    setOrder(null);
    onOrderComplete();
    onClose();
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    alert('Payment failed. Please try again.');
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
  };

  if (!isOpen) return null;

  if (showCheckout && order) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Secure Checkout</h2>
            <Button variant="ghost" onClick={handlePaymentCancel}>×</Button>
          </div>
          <RazorpayCheckout
            order={order}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Your Cart ({cart.length} items)
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </CardHeader>

        {cart.length === 0 ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
              <p className="text-sm">Add items from the feed to get started</p>
            </div>
          </CardContent>
        ) : (
          <>
            <CardContent className="flex-1 overflow-auto space-y-4">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-4 p-4 border rounded-lg">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.restaurantName}</p>
                    <p className="font-medium">₹{item.price}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Badge variant="secondary" className="px-3">
                      {item.quantity}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.menuItemId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>

            <div className="p-6 border-t bg-muted/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Subtotal</span>
                <span className="text-xl font-bold">₹{calculateSubtotal()}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCart} className="flex-1">
                  Clear Cart
                </Button>
                <Button
                  onClick={createOrder}
                  disabled={isCreatingOrder}
                  className="flex-1"
                >
                  {isCreatingOrder ? 'Creating Order...' : 'Proceed to Checkout'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Helper function to add item to cart
export const addToCart = (item: Omit<CartItem, 'quantity'>) => {
  const savedCart = localStorage.getItem('makubang_cart');
  const cart: CartItem[] = savedCart ? JSON.parse(savedCart) : [];
  
  const existingItem = cart.find(cartItem => cartItem.menuItemId === item.menuItemId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  
  localStorage.setItem('makubang_cart', JSON.stringify(cart));
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
};
