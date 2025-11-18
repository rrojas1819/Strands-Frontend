import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, Mail } from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { toast } from 'sonner';
import NotificationInbox from './NotificationInbox';
import { useNotifications } from '../hooks/useNotifications';

export default function OwnerNavbar({ salonStatus, activeTab, onTabChange, handleLogout }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  const handleNavClick = (tab, path) => {
    if (onTabChange && location.pathname === '/dashboard') {
      // If we're on the dashboard and have onTabChange, use it
      onTabChange(tab);
    } else if (path === '/dashboard') {
      // Navigate to dashboard with tab as query param
      navigate(`/dashboard?tab=${tab}`);
    } else {
      // Otherwise navigate to the path
      navigate(path);
    }
  };

  const isActive = (tab, path) => {
    if (path === '/owner/order-history') {
      return location.pathname === '/owner/order-history';
    }
    if (path === '/dashboard') {
      if (location.pathname === '/dashboard') {
        return activeTab === tab;
      }
      return false;
    }
    return location.pathname === path;
  };

  const getActiveClass = (tab, path) => {
    return isActive(tab, path)
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground';
  };

  return (
    <>
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src={strandsLogo} 
                alt="Strands" 
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/')}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Salon Owner Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your salon business</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Mail className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Owner
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => handleNavClick('overview', '/dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('overview', '/dashboard')}`}
            >
              Overview
            </button>
            {salonStatus === 'APPROVED' && (
              <>
                <button 
                  onClick={() => handleNavClick('staff-services', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('staff-services', '/dashboard')}`}
                >
                  Staff
                </button>
                <button 
                  onClick={() => handleNavClick('products', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('products', '/dashboard')}`}
                >
                  Products
                </button>
                <button 
                  onClick={() => handleNavClick('customers', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('customers', '/dashboard')}`}
                >
                  Customers
                </button>
                <button 
                  onClick={() => navigate('/owner/order-history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass(null, '/owner/order-history')}`}
                >
                  Order History
                </button>
                <button 
                  onClick={() => handleNavClick('reviews', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('reviews', '/dashboard')}`}
                >
                  Reviews
                </button>
                <button 
                  onClick={() => handleNavClick('revenue', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('revenue', '/dashboard')}`}
                >
                  Revenue
                </button>
                <button 
                  onClick={() => handleNavClick('loyalty', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('loyalty', '/dashboard')}`}
                >
                  Loyalty
                </button>
                <button 
                  onClick={() => toast.info('Promotions coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Promotions
                </button>
                <button 
                  onClick={() => handleNavClick('settings', '/dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('settings', '/dashboard')}`}
                >
                  Settings
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <NotificationInbox isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

