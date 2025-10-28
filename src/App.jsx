import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Components
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import SalonOwnerDashboard from './pages/SalonOwnerDashboard';
import SalonVerification from './pages/SalonVerification';
import SalonBrowser from './pages/SalonBrowser';
import SalonDetail from './pages/SalonDetail';
import LoyaltyPoints from './pages/LoyaltyPoints';
import LoyaltyMonitoring from './pages/LoyaltyMonitoring';
import HairstylistDashboard from './pages/HairstylistDashboard';
import BookingPage from './pages/BookingPage';
import Appointments from './pages/Appointments';

// Context
import { AuthContext, RewardsContext } from './context/AuthContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewardsCount, setRewardsCount] = useState(0);

  // Fetch rewards count for user
  const fetchRewardsCount = async (userId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Get all approved salons first
      const salonsResponse = await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!salonsResponse.ok) return;

      const salonsData = await salonsResponse.json();
      const salons = salonsData.data || [];
      
      let totalRewards = 0;
      
      // Check loyalty data for each salon
      for (const salon of salons) {
        try {
          const loyaltyResponse = await fetch(`${apiUrl}/user/loyalty/view?salon_id=${salon.salon_id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (loyaltyResponse.ok) {
            const loyaltyData = await loyaltyResponse.json();
            const userRewards = loyaltyData.userRewards || [];
            const activeRewards = userRewards.filter(reward => reward.active === 1);
            totalRewards += activeRewards.length;
          }
        } catch (err) {
          // Skip this salon if there's an error
          continue;
        }
      }

      setRewardsCount(totalRewards);
    } catch (error) {
      console.error('Error fetching rewards count:', error);
    }
  };

  // Check auth on load
  useEffect(() => {
    const initializeAuth = () => {
      const savedUser = localStorage.getItem('user_data');
      const savedToken = localStorage.getItem('auth_token');
      
      // Check for cookie as backup
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
      
      if (savedUser && (savedToken || cookieToken)) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Fetch rewards count for existing user
        fetchRewardsCount(userData.user_id);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // UAR 1.1: Signup functionality - Updated to auto-login after signup
  const register = async (userData) => {
    try {
      console.log('Sending signup request to backend:', userData);
      
      const signupResponse = await fetch(`${import.meta.env.VITE_API_URL}/user/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role
        }),
      });

      console.log('Signup response status:', signupResponse.status);
      const signupData = await signupResponse.json();
      console.log('Signup response data:', signupData);

      if (signupResponse.ok && signupData.message === "User signed up successfully") {
        // After successful signup, automatically log in the user
        console.log('Signup successful, now logging in user...');
        
        const loginResponse = await fetch(`${import.meta.env.VITE_API_URL}/user/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password
          }),
        });

        console.log('Auto-login response status:', loginResponse.status);
        const loginData = await loginResponse.json();
        console.log('Auto-login response data:', loginData);

        if (loginResponse.ok && loginData.message === "Login successful") {
          const userInfo = {
            user_id: loginData.data.user_id,
            full_name: loginData.data.full_name,
            role: loginData.data.role,
            email: userData.email
          };
          
          // Store token in both localStorage and cookie
          localStorage.setItem('auth_token', loginData.data.token);
          localStorage.setItem('user_data', JSON.stringify(userInfo));
          
          // Set HTTP-only cookie for token (more secure)
          document.cookie = `auth_token=${loginData.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`;
          
          setUser(userInfo);
          
          // Fetch rewards count for the newly registered user
          fetchRewardsCount(userInfo.user_id);
          
          // Redirect to dashboard after successful registration and login
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 100);
          
          return { success: true, user: userInfo };
        } else {
          // Signup succeeded but auto-login failed
          return { success: false, error: 'Account created but login failed. Please try logging in manually.' };
        }
      }
      return { success: false, error: signupData.message || 'Registration failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  // UAR 1.2: Login functionality
  const login = async (userData) => {
    try {
      console.log('Sending login request to backend:', userData);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password
        }),
      });

      console.log('Backend response status:', response.status);
      const data = await response.json();
      console.log('Backend response data:', data);

      if (response.ok && data.message === "Login successful") {
        const userInfo = {
          user_id: data.data.user_id,
          full_name: data.data.full_name,
          role: data.data.role,
          email: userData.email
        };
        
        // Store token in both localStorage and cookie
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_data', JSON.stringify(userInfo));
        
        // Set HTTP-only cookie for token (more secure)
        document.cookie = `auth_token=${data.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`;
        
        setUser(userInfo);
        
        // Fetch rewards count for the logged-in user
        fetchRewardsCount(userInfo.user_id);
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
        
        return { success: true, user: userInfo };
      }
      return { success: false, error: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      // Get the current token for the logout API call
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        console.log('Calling backend logout endpoint...');
        
        // Call backend logout endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        console.log('Logout response status:', response.status);
        const data = await response.json();
        console.log('Logout response data:', data);
      }
      
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Clear cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Clear user state
      setUser(null);
      
      // Redirect to landing page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API fails, still clear local state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setUser(null);
      window.location.href = '/';
    }
  };

  const authValue = {
    user,
    register, // UAR 1.1: Signup functionality
    login,    // UAR 1.2: Login functionality
    logout,
    loading,
  };

  // Role-based dashboard routing
  const getDashboardComponent = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    if (!user) return <Navigate to="/" replace />;
    
    // Role-based dashboard routing
    if (user.role === 'ADMIN') {
      return <AdminDashboard />;
    }
    
    if (user.role === 'OWNER') {
      return <SalonOwnerDashboard />;
    }
    
    // UAR-1.8: Route EMPLOYEE role to HairstylistDashboard
    if (user.role === 'EMPLOYEE') {
      return <HairstylistDashboard />;
    }
    
    // Default dashboard for other roles (CUSTOMER, OWNER) - Show salon browser directly
    return <SalonBrowser />;
  };

  if (loading) {
  return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <RewardsContext.Provider value={{ rewardsCount, setRewardsCount }}>
        <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route 
              path="/" 
              element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
            />
            <Route 
              path="/signup" 
              element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/login" 
              element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/auth" 
              element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/dashboard" 
              element={getDashboardComponent()} 
            />
            <Route 
              path="/admin/salon-verification" 
              element={user && user.role === 'ADMIN' ? <SalonVerification /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/loyalty-monitoring" 
              element={user && user.role === 'ADMIN' ? <LoyaltyMonitoring /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/loyalty-points" 
              element={user ? <LoyaltyPoints /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/salon/:salonId" 
              element={user ? <SalonDetail /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/salon/:salonId/book" 
              element={user ? <BookingPage /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/appointments" 
              element={user ? <Appointments /> : <Navigate to="/login" replace />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
      </div>
      </Router>
      </RewardsContext.Provider>
    </AuthContext.Provider>
  );
}