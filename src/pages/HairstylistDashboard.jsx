import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scissors, LogOut, Calendar, Users, Star, User, AlertCircle } from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function HairstylistDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schedule');
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStylistSalon();
  }, []);

  const fetchStylistSalon = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      console.log('Fetching stylist salon data...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/stylist/getSalon`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Stylist salon response status:', response.status);
      const data = await response.json();
      console.log('Stylist salon response data:', data);
      console.log('API URL used:', `${import.meta.env.VITE_API_URL}/user/stylist/getSalon`);

      if (response.ok) {
        setSalonData(data.data);
      } else if (response.status === 404) {
        setError('You are not an employee of any salon');
      } else {
        setError(data.message || 'Failed to fetch salon data');
      }
    } catch (err) {
      console.error('Stylist salon fetch error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError('Failed to fetch salon data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authContext?.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'customers', label: 'Customers' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'profile', label: 'Profile' }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state - employee not assigned to any salon
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="bg-background border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={strandsLogo} 
                  alt="Strands" 
                  className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate('/')}
                />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Hairstylist Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Employee Portal</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Hairstylist
                </Badge>
                <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Salon Assignment</h2>
            <p className="text-muted-foreground mb-6">
              You are not currently assigned to any salon. Please contact your salon owner.
            </p>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  // Success state - employee has salon assignment
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src={strandsLogo} 
                alt="Strands" 
                className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/')}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{salonData?.employee_title || 'Hairstylist'}</h1>
                <p className="text-sm text-muted-foreground">{salonData?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Hairstylist
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar - Hairstylist Sections */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
           <h2 className="text-3xl font-bold text-foreground mb-2">
             Welcome, {authContext.user?.full_name}!
           </h2>
          <p className="text-muted-foreground">
            Manage your appointments, customers, and professional profile at {salonData?.name}.
          </p>
          <div className="mt-4">
            <Button onClick={fetchStylistSalon} variant="outline" size="sm">
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">Schedule Tab</h3>
            <p className="text-sm text-muted-foreground">
              Schedule content will be implemented here.
            </p>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">Customers Tab</h3>
            <p className="text-sm text-muted-foreground">
              Customer content will be implemented here.
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">Reviews Tab</h3>
            <p className="text-sm text-muted-foreground">
              Reviews content will be implemented here.
            </p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">Profile Tab</h3>
            <p className="text-sm text-muted-foreground">
              Profile content will be implemented here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}