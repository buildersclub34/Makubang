import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

type CartAction =
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<CartContextType | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_CART': {
      const items = action.payload;
      return {
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    }

    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.menuItemId === action.payload.menuItemId
      );

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }];
      }

      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.menuItemId === action.payload.menuItemId
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);

      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.menuItemId !== action.payload);
      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    }

    case 'CLEAR_CART':
      return {
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };

    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });

  // Load cart from storage on mount
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    saveCartToStorage();
  }, [state.items]);

  const loadCartFromStorage = async () => {
    try {
      const cartData = await AsyncStorage.getItem('makubang_cart');
      if (cartData) {
        const items = JSON.parse(cartData);
        dispatch({ type: 'SET_CART', payload: items });
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  };

  const saveCartToStorage = async () => {
    try {
      await AsyncStorage.setItem('makubang_cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } });
  };

  const removeItem = (menuItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: menuItemId });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalPrice = () => {
    return state.totalPrice;
  };

  const value: CartContextType = {
    items: state.items,
    totalItems: state.totalItems,
    totalPrice: state.totalPrice,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
