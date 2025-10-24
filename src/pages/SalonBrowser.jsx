import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { MapPin, Phone, Mail, Star, Clock, LogOut, Search, Filter } from 'lucide-react';
import { Notifications } from '../utils/notifications';

export default function SalonBrowser() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Salon categories
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'HAIR SALON', label: 'Hair Salon' },
    { value: 'NAIL SALON', label: 'Nail Salon' },
    { value: 'SPA & WELLNESS', label: 'Spa & Wellness' },
    { value: 'BARBERSHOP', label: 'Barbershop' },
    { value: 'EYELASH STUDIO', label: 'Eyelash Studio' },
    { value: 'FULL SERVICE BEAUTY', label: 'Full Service Beauty' }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchSalons = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch salons');
        }

        const data = await response.json();
        setSalons(data.data);
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError(err.message || 'Failed to load salons.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, [user, navigate]);

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  const filteredSalons = salons.filter(salon => {
    const matchesSearch = salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         salon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         salon.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || salon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category) => {
    const categoryMap = {
      'HAIR SALON': { label: 'Hair Salon' },
      'NAIL SALON': { label: 'Nail Salon' },
      'SPA & WELLNESS': { label: 'Spa & Wellness' },
      'BARBERSHOP': { label: 'Barbershop' },
      'EYELASH STUDIO': { label: 'Eyelash Studio' },
      'FULL SERVICE BEAUTY': { label: 'Full Service Beauty' }
    };
    
    const categoryInfo = categoryMap[category] || { label: category };
    return (
      <Badge variant="secondary">
        {categoryInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png" 
                alt="Strands Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Salon Browser</h1>
                <p className="text-sm text-muted-foreground">Find And Book With Salons</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {user?.role || 'User'}
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar - Condensed and logical */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {/* Current: Browse Salons */}
            <button className="py-4 px-1 border-b-2 border-primary text-primary font-medium text-sm">
              Browse Salons
            </button>
            
            {/* Booking & Appointments */}
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              My Appointments
            </button>
            
            {/* Loyalty & Rewards */}
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              Loyalty Points
            </button>
            
            {/* Profile & History */}
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              My Profile
            </button>
            
            {/* Reviews & Feedback */}
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              Reviews
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filter Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Available Salons</h2>
          <p className="text-muted-foreground mb-6">Browse verified salons in your area</p>
          
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search salons, services, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground mb-6">
            Showing {filteredSalons.length} of {salons.length} salons
          </div>
        </div>

        {/* Salon Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => (
            <Card key={salon.salon_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{salon.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getCategoryBadge(salon.category)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{salon.address}, {salon.city}, {salon.state}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{salon.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{salon.email}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{salon.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Open now</span>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90">
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSalons.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No salons found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No approved salons are available at the moment.'}
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
