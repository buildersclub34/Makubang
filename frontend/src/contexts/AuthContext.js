import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setToken(token);
          // Fetch user data
          await fetchUser(token);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Set up axios default headers
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Fetch user data
  const fetchUser = async (token) => {
    try {
      setAuthToken(token);
      const { data } = await axios.get(`${API_URL}/api/auth/me`);
      setUser(data.data);
    } catch (err) {
      console.error('Failed to fetch user', err);
      await AsyncStorage.removeItem('token');
      setUser(null);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      const { data } = await axios.post(`${API_URL}/api/auth/register`, userData);
      
      // Save token to storage
      await AsyncStorage.setItem('token', data.token);
      setToken(data.token);
      setAuthToken(data.token);
      
      // Fetch user data
      await fetchUser(data.token);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      // Save token to storage
      await AsyncStorage.setItem('token', data.token);
      setToken(data.token);
      setAuthToken(data.token);
      
      // Fetch user data
      await fetchUser(data.token);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.get(`${API_URL}/api/auth/logout`);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear storage and state
      await AsyncStorage.removeItem('token');
      setUser(null);
      setToken(null);
      setAuthToken(null);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/api/auth/updatedetails`,
        userData
      );
      setUser(data.data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to update profile',
      };
    }
  };

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put(`${API_URL}/api/auth/updatepassword`, {
        currentPassword,
        newPassword,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to update password',
      };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      await axios.post(`${API_URL}/api/auth/forgotpassword`, { email });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to send reset email',
      };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      await axios.put(`${API_URL}/api/auth/resetpassword/${token}`, {
        password,
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to reset password',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        token,
        register,
        login,
        logout,
        updateProfile,
        updatePassword,
        forgotPassword,
        resetPassword,
        setError,
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
