import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartItem } from '../types/CartItem';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const navigation = useNavigation<CartScreenNavigationProp>();
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (itemId: string, change: number, currentQty: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQty);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart before checkout');
      return;
    }

    try {
      setLoading(true);
      
      // Group items by restaurant
      const itemsByRestaurant = items.reduce((acc, item) => {
        if (!acc[item.restaurantId]) {
          acc[item.restaurantId] = {
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            items: [],
            total: 0
          };
        }
        
        acc[item.restaurantId].items.push({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        });
        
        acc[item.restaurantId].total += item.price * item.quantity;
        
        return acc;
      }, {} as Record<string, any>);
      
      // For simplicity, we'll just handle the first restaurant's order
      // In a real app, you might want to handle multiple restaurant orders
      const restaurants = Object.values(itemsByRestaurant);
      
      if (restaurants.length > 1) {
        Alert.alert(
          'Multiple Restaurants', 
          'Your cart contains items from multiple restaurants. Currently, we only support checkout from one restaurant at a time.'
        );
        setLoading(false);
        return;
      }
      
      const orderData = {
        restaurantId: restaurants[0].restaurantId,
        restaurantName: restaurants[0].restaurantName,
        items: restaurants[0].items,
        total: restaurants[0].total,
        deliveryAddress: {
          address: '123 Main St',
          city: 'Bangalore',
          zipCode: '560102',
          instructions: 'Call when you arrive'
        },
        paymentMethod: 'card'
      };
      
      // Navigate to payment screen with order data
      navigation.navigate('Payment', { order: orderData });
      
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Something went wrong during checkout');
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemRestaurant}>{item.restaurantName}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.menuItemId, -1, item.quantity)}
        >
          <Ionicons name="remove" size={16} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.menuItemId, 1, item.quantity)}
        >
          <Ionicons name="add" size={16} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.clearCart}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {items.length > 0 ? (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.menuItemId}
            contentContainerStyle={styles.cartList}
          />
          
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total:</Text>
              <Text style={styles.totalPrice}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={handleCheckout}
              disabled={loading}
            >
              <Text style={styles.checkoutButtonText}>
                {loading ? 'Processing...' : 'Proceed to Checkout'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <TouchableOpacity 
            style={styles.continueShoppingButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearCart: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemRestaurant: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  continueShoppingButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});