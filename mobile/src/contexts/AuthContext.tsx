import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { loginSuccess, logout as logoutAction } from '../store/slices/authSlice';
import api from '../services/api';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  // Load user from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await SecureStore.getItemAsync('user');
        const token = await SecureStore.getItemAsync('token');

        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          dispatch(loginSuccess({ user: parsedUser, token }));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('token', token);

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      dispatch(loginSuccess({ user, token }));
      
      // Navigate to home after successful login
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data;

      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('token', token);

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      dispatch(loginSuccess({ user, token }));
      
      // Navigate to home after successful registration
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear secure storage
      await Promise.all([
        SecureStore.deleteItemAsync('user'),
        SecureStore.deleteItemAsync('token'),
      ]);

      // Clear API headers
      delete api.defaults.headers.common['Authorization'];
      
      // Reset state
      setUser(null);
      
      // Dispatch logout action
      dispatch(logoutAction());
      
      // Navigate to login
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user) return;
      
      const updatedUser = { ...user, ...userData };
      
      // Update in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      // Update in Redux
      dispatch(loginSuccess({ user: updatedUser, token: await SecureStore.getItemAsync('token') || '' }));
      
      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
