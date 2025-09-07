
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LiveMapScreen from '../screens/LiveMapScreen';
import WalletScreen from '../screens/WalletScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Orders':
            iconName = 'local-shipping';
            break;
          case 'Earnings':
            iconName = 'attach-money';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: '#666',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Orders" component={OrdersScreen} />
    <Tab.Screen name="Earnings" component={EarningsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen 
            name="LiveMap" 
            component={LiveMapScreen}
            options={{ 
              headerShown: true,
              title: 'Live Delivery',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="Wallet" 
            component={WalletScreen}
            options={{ 
              headerShown: true,
              title: 'Wallet',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="OrderHistory" 
            component={OrderHistoryScreen}
            options={{ 
              headerShown: true,
              title: 'Order History',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ 
              headerShown: true,
              title: 'Notifications',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ 
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
