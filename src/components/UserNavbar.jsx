import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, Star, Menu, X, Mail } from 'lucide-react';
import NotificationInbox from './NotificationInbox';
import { useNotifications } from '../hooks/useNotifications';

export default function UserNavbar({ activeTab, title, subtitle }) {
  const { user, logout } = useContext(AuthContext);
  const { rewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    logout();
  };

  const getActiveClass = (tab) => {
    return activeTab === tab
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground';
  };

  return (
    <>
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png" 
                alt="Strands Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/dashboard')}
              />
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/loyalty-points"
                className="hidden sm:flex items-center space-x-2 px-2 sm:px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-xs sm:text-sm font-medium text-yellow-800">{rewardsCount} rewards</span>
              </Link>
              <Button
                id="user-inbox-button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="relative hidden sm:flex"
              >
                <Mail className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm hidden sm:inline-flex">
                {user?.role || 'User'}
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm px-2 sm:px-4">
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
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
            <Link
              to="/loyalty-points"
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Loyalty Program ({rewardsCount} rewards)</span>
            </Link>
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
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {user?.role || 'User'}
              </Badge>
              <Button variant="outline" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden sm:flex space-x-4 lg:space-x-8 overflow-x-auto">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${getActiveClass('dashboard')}`}
            >
              Browse Salons
            </button>
            
            <button 
              onClick={() => navigate('/appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${getActiveClass('appointments')}`}
            >
              My Appointments
            </button>
            
            <Link
              to="/loyalty-points"
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${getActiveClass('loyalty')}`}
            >
              Loyalty Program
            </Link>

            <button 
              onClick={() => navigate('/order-history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${getActiveClass('orders')}`}
            >
              Order History
            </button>
            
            <button 
              onClick={() => navigate('/settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${getActiveClass('settings')}`}
            >
              Settings
            </button>
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="sm:hidden py-2 space-y-1">
              <button 
                onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('dashboard')}`}
              >
                Browse Salons
              </button>
              <button 
                onClick={() => { navigate('/appointments'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('appointments')}`}
              >
                My Appointments
              </button>
              <Link
                to="/loyalty-points"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('loyalty')}`}
              >
                Loyalty Program
              </Link>
              <button 
                onClick={() => { navigate('/order-history'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('orders')}`}
              >
                Order History
              </button>
              <button 
                onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-4 border-b-2 font-medium text-sm ${getActiveClass('settings')}`}
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </nav>
      <NotificationInbox isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

