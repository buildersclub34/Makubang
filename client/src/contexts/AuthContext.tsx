import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'restaurant' | 'delivery';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEmailVerified = user?.isVerified ?? false;

  // Check if user is logged in on initial load
  const { isLoading: isSessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<{ user: User | null }> => {
      try {
        const data = await apiRequest<{ user: User | null }>('GET', '/api/auth/session');
        setUser(data.user);
        return data;
      } catch (error) {
        setUser(null);
        return { user: null };
      } finally {
        setIsLoading(false);
      }
    },
    refetchOnWindowFocus: false,
    retry: 1
  });

  const loginMutation = useMutation<{ user: User }, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      const response = await apiRequest<{ user: User }>('POST', '/api/auth/login', { email, password });
      return response;
    },
    onSuccess: (data) => {
      if (data?.user) {
        setUser(data.user);
        queryClient.invalidateQueries({ queryKey: ['session'] });
        router.push('/feed');
      }
    },
  });

  const registerMutation = useMutation<{ user: User }, Error, RegisterData>({
    mutationFn: async (data) => {
      const response = await apiRequest<{ user: User }>('POST', '/api/auth/register', data);
      return response;
    },
    onSuccess: (data) => {
      if (data?.user) {
        setUser(data.user);
        queryClient.invalidateQueries({ queryKey: ['session'] });
        router.push('/onboarding');
      }
    },
  });

  const logoutMutation = useMutation<void, Error>({
    mutationFn: () => apiRequest('POST', '/api/auth/logout'),
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      router.push('/login');
    },
  });

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiRequest<{ user: User }>('GET', '/api/auth/session');
      if (response?.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/resend-verification', { email });
      return { success: true, message: 'Verification email sent successfully' };
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to resend verification email' 
      };
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isEmailVerified,
    isLoading: isLoading || isSessionLoading,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    register: async (data: RegisterData) => {
      await registerMutation.mutateAsync(data);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    sendPasswordResetEmail: async (email: string) => {
      await apiRequest('POST', '/api/auth/forgot-password', { email });
    },
    resetPassword: async (token: string, newPassword: string) => {
      await apiRequest('POST', '/api/auth/reset-password', { token, newPassword });
    },
    resendVerificationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
