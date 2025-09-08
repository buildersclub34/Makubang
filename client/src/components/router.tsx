import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Layout components
import RootLayout from '@/components/layout/root-layout';
import ProtectedRoute from '@/components/protected-route';

// Pages
import Home from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Profile from '@/pages/profile';
import RestaurantDashboard from '@/pages/restaurant-dashboard';
import AdminDashboard from '@/pages/admin-dashboard';
import InfluencerDashboard from '@/pages/influencer-dashboard';
import AdminContentModeration from '@/pages/admin-content-moderation';
import CreatorStudio from '@/pages/creator-studio';
import CreatorProfile from '@/pages/creator-profile';
import CreatorMarketplace from '@/pages/creator-marketplace';
import CreateContent from '@/pages/create-content';
import OrderHistory from '@/pages/order-history';
import Settings from '@/pages/settings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'restaurant',
        element: (
          <ProtectedRoute roles={['restaurant', 'admin']}>
            <RestaurantDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/moderation',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminContentModeration />
          </ProtectedRoute>
        ),
      },
      {
        path: 'influencer',
        element: (
          <ProtectedRoute roles={['influencer', 'admin']}>
            <InfluencerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'creator',
        element: (
          <ProtectedRoute roles={['creator', 'influencer', 'admin']}>
            <CreatorStudio />
          </ProtectedRoute>
        ),
      },
      {
        path: 'creator/profile',
        element: (
          <ProtectedRoute>
            <CreatorProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'creator/marketplace',
        element: (
          <ProtectedRoute>
            <CreatorMarketplace />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <CreateContent />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrderHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}