import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/routing/PrivateRoute';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoDetail from './pages/VideoDetail';
import Profile from './pages/Profile';
import UploadVideo from './pages/UploadVideo';
import RestaurantDashboard from './pages/restaurant/Dashboard';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Router>
            <CssBaseline />
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/videos/:id" element={<VideoDetail />} />
                  <Route path="/users/:username" element={<Profile />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/upload"
                    element={
                      <PrivateRoute>
                        <UploadVideo />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/restaurant/dashboard"
                    element={
                      <PrivateRoute roles={['restaurant', 'admin']}>
                        <RestaurantDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <PrivateRoute>
                        <Checkout />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/order/success/:orderId"
                    element={
                      <PrivateRoute>
                        <OrderSuccess />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
