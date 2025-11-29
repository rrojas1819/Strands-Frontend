import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Menu, X, LogOut, Bell } from 'lucide-react';
import NotificationInbox from './NotificationInbox';
import { useNotifications } from '../hooks/useNotifications';

const NAV_ITEMS = [
  {
    key: 'salon-management',
    label: 'Salon Management',
    path: '/admin/salon-verification',
  },
  {
    key: 'loyalty-monitoring',
    label: 'Loyalty Monitoring',
    path: '/admin/loyalty-monitoring',
  },
  {
    key: 'user-analytics',
    label: 'User Analytics',
    path: '/dashboard?tab=user-analytics',
  },
  {
    key: 'business-insights',
    label: 'Business Insights',
    path: '/dashboard?tab=business-insights',
  },
  {
    key: 'revenue-analytics',
    label: 'Revenue Tracking',
    path: '/dashboard?tab=revenue-analytics',
  },
];

export default function AdminNavbar({ title, subtitle, activeKey, onLogout }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  const handleNavClick = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
    setMobileOpen(false);
  };

  const renderNavItems = (itemClass) => (
    NAV_ITEMS.map((item) => {
      const isActive = activeKey === item.key;
      const baseClass = 'py-3 px-3 border-b-2 font-medium text-sm transition-colors';
      const classes = isActive
        ? `${baseClass} border-primary text-primary`
        : `${baseClass} border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground`;

      return (
        <button
          key={item.key}
          onClick={() => handleNavClick(item.path)}
          className={`${classes} ${itemClass}`.trim()}
        >
          {item.label}
        </button>
      );
    })
  );

  return (
    <>
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png"
                alt="Strands Logo"
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer"
                onClick={() => navigate('/dashboard?tab=user-analytics')}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <Badge variant="secondary" className="bg-green-100 text-green-800 hidden sm:inline-flex">
                {user?.role || 'Admin'}
              </Badge>
              <Button
                id="admin-logout-button"
                variant="outline"
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="sm:hidden"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden sm:flex space-x-6 overflow-x-auto">
            {renderNavItems('px-1')}
          </div>
          {mobileOpen && (
            <div className="sm:hidden py-2 space-y-1">
              <div className="flex flex-col space-y-2">
                {renderNavItems('text-left w-full px-2')}
              </div>
              <Button
                id="admin-logout-button-mobile"
                variant="outline"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      </nav>
      <NotificationInbox isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}


