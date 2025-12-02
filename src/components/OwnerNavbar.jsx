import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, Mail, Menu, X } from 'lucide-react';
import NotificationInbox from './NotificationInbox';
import { useNotifications } from '../hooks/useNotifications';

export default function OwnerNavbar({ salonStatus, handleLogout }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <img 
                src="/strands-logo-new.png" 
                alt="Strands" 
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/')}
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">Salon Owner Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your salon business</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="relative h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm hidden sm:inline-flex">
                Owner
              </Badge>
              <Button variant="outline" onClick={handleLogoutClick} className="flex items-center space-x-1 sm:space-x-2 h-9 sm:h-10 px-2 sm:px-3 hidden sm:flex">
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline text-xs sm:text-sm">Logout</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="bg-background border-b sm:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
            <Button
              variant="outline"
              onClick={() => { setShowNotifications(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <div className="flex items-center justify-between px-3 py-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                Owner
              </Badge>
              <Button variant="outline" onClick={() => { handleLogoutClick(); setIsMobileMenuOpen(false); }} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="hidden sm:flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto -mx-3 sm:-mx-4 lg:mx-0 px-3 sm:px-4 lg:px-0">
            <button 
              onClick={() => navigate('/owner/overview')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/overview')}`}
            >
              Overview
            </button>
            {salonStatus === 'APPROVED' && (
              <>
                <button 
                  onClick={() => navigate('/owner/staff')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/staff')}`}
                >
                  Staff
                </button>
                <button 
                  onClick={() => navigate('/owner/products')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/products')}`}
                >
                  Products
                </button>
                <button 
                  onClick={() => navigate('/owner/customers')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/customers')}`}
                >
                  Customers
                </button>
                <button 
                  onClick={() => navigate('/owner/order-history')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/order-history')}`}
                >
                  Order History
                </button>
                <button 
                  onClick={() => navigate('/owner/reviews')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/reviews')}`}
                >
                  Reviews
                </button>
                <button 
                  onClick={() => navigate('/owner/revenue')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/revenue')}`}
                >
                  Revenue
                </button>
                <button 
                  onClick={() => navigate('/owner/loyalty')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/loyalty')}`}
                >
                  <span className="hidden sm:inline">Loyalty & Promotions</span>
                  <span className="sm:hidden">Loyalty</span>
                </button>
                <button 
                  onClick={() => navigate('/owner/settings')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${getActiveClass('/owner/settings')}`}
                >
                  Settings
                </button>
              </>
            )}
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="sm:hidden py-2 space-y-1">
              <button 
                onClick={() => { navigate('/owner/overview'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/overview')}`}
              >
                Overview
              </button>
              {salonStatus === 'APPROVED' && (
                <>
                  <button 
                    onClick={() => { navigate('/owner/staff'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/staff')}`}
                  >
                    Staff
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/products'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/products')}`}
                  >
                    Products
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/customers'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/customers')}`}
                  >
                    Customers
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/order-history'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/order-history')}`}
                  >
                    Order History
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/reviews'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/reviews')}`}
                  >
                    Reviews
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/revenue'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/revenue')}`}
                  >
                    Revenue
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/loyalty'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/loyalty')}`}
                  >
                    Loyalty & Promotions
                  </button>
                  <button 
                    onClick={() => { navigate('/owner/settings'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('/owner/settings')}`}
                  >
                    Settings
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
      <NotificationInbox isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

