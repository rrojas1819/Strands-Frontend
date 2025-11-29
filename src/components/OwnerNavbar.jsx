import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, Mail } from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import NotificationInbox from './NotificationInbox';
import { useNotifications } from '../hooks/useNotifications';

export default function OwnerNavbar({ salonStatus, handleLogout }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount, onCountChange } = useNotifications();

  // Listen for count changes
  useEffect(() => {
    const unsubscribe = onCountChange(() => {
      // Badge will update automatically via state
    });
    return unsubscribe;
  }, [onCountChange]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getActiveClass = (path) => {
    return isActive(path)
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground';
  };

  const handleLogoutClick = () => {
    if (handleLogout) {
      handleLogout();
    } else {
      logout();
    }
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
                id="owner-inbox-button"
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
              {/* <Button id="owner-logout-button" variant="outline" onClick={handleLogout} className="flex items-center space-x-2"> */ /*OLD CODE HERE */}
              <Button variant="outline" onClick={handleLogoutClick} className="flex items-center space-x-2">
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
              onClick={() => navigate('/owner/overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/overview')}`}
            >
              Overview
            </button>
            {salonStatus === 'APPROVED' && (
              <>
                <button
                  onClick={() => navigate('/owner/staff')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/staff')}`}
                >
                  Staff
                </button>
                <button
                  onClick={() => navigate('/owner/products')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/products')}`}
                >
                  Products
                </button>
                <button
                  onClick={() => navigate('/owner/customers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/customers')}`}
                >
                  Customers
                </button>
                <button
                  onClick={() => navigate('/owner/order-history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/order-history')}`}
                >
                  Order History
                </button>
                <button
                  onClick={() => navigate('/owner/reviews')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/reviews')}`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => navigate('/owner/revenue')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/revenue')}`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => navigate('/owner/loyalty')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/loyalty')}`}
                >
                  Loyalty & Promotions
                </button>
                <button
                  onClick={() => navigate('/owner/settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${getActiveClass('/owner/settings')}`}
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

