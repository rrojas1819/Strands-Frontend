import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { MapPin, Phone, Mail, Star, Clock, LogOut, Search, Filter, ChevronDown, Check, Menu, X } from 'lucide-react';
import { Notifications } from '../utils/notifications';

export default function SalonBrowser() {
  const { user, logout } = useContext(AuthContext);
  const { rewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.relative')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  // Helper function to format time to 12-hour AM/PM format
  const formatTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const hours12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Helper function to get short day names
  const getShortDayName = (day) => {
    const dayMap = {
      'sunday': 'Sun',
      'monday': 'Mon',
      'tuesday': 'Tue',
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat'
    };
    return dayMap[day.toLowerCase()] || day;
  };

  // Helper function to group and format hours
  const formatHours = (weeklyHours) => {
    if (!weeklyHours) return [];
    
    // Group days by hours
    const hoursMap = {};
    Object.entries(weeklyHours).forEach(([day, hours]) => {
      const dayName = getShortDayName(day.charAt(0) + day.slice(1).toLowerCase());
      const isOpen = hours.is_open && hours.start_time && hours.end_time;
      const key = isOpen ? `${formatTo12Hour(hours.start_time)} - ${formatTo12Hour(hours.end_time)}` : 'closed';
      
      if (!hoursMap[key]) {
        hoursMap[key] = { days: [], hours };
      }
      hoursMap[key].days.push(dayName);
    });

    // Format grouped hours
    const formatted = [];
    Object.entries(hoursMap).forEach(([key, data]) => {
      const daysStr = data.days.join(', ');
      const hoursStr = key === 'closed' ? 'Closed' : key;
      formatted.push(`${daysStr}: ${hoursStr}`);
    });

    return formatted;
  };

  // Function to check if salon is currently open
  const isSalonOpen = (salon) => {
    if (!salon?.weekly_hours) return null; // No data available

    const now = currentTime;
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinutes;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[dayOfWeek];
    const todayHours = salon.weekly_hours[today];

    if (!todayHours || !todayHours.is_open || !todayHours.start_time || !todayHours.end_time) {
      return false;
    }

    const [startHours, startMinutes] = todayHours.start_time.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;

    const [endHours, endMinutes] = todayHours.end_time.split(':').map(Number);
    const endTime = endHours * 60 + endMinutes;

    return currentTimeMinutes >= startTime && currentTimeMinutes < endTime;
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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png" 
                alt="Strands Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
              />
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Salon Browser</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Find And Book With Salons</p>
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

      {/* Navigation Bar - Condensed and logical */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden sm:flex space-x-4 lg:space-x-8 overflow-x-auto">
            {/* Current: Browse Salons */}
            <button className="py-4 px-1 border-b-2 border-primary text-primary font-medium text-sm whitespace-nowrap">
              Browse Salons
            </button>
            
            {/* Booking & Appointments */}
            <button 
              onClick={() => navigate('/appointments')}
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm whitespace-nowrap"
            >
              My Appointments
            </button>
            
            {/* Loyalty & Rewards */}
            <Link
              to="/loyalty-points"
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm whitespace-nowrap"
            >
              Loyalty Program
            </Link>
            
            {/* Profile & History */}
            <button onClick={() => navigate('/profile')} className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm whitespace-nowrap">
              My Profile
            </button>
            
            {/* Reviews & Feedback */}
            <button onClick={() => navigate('/reviews')} className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm whitespace-nowrap">
              Reviews
            </button>
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="sm:hidden py-2 space-y-1">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); }}
                className="w-full text-left py-3 px-4 border-b-2 border-primary text-primary font-medium text-sm"
              >
                Browse Salons
              </button>
              <button 
                onClick={() => { navigate('/appointments'); setIsMobileMenuOpen(false); }}
                className="w-full text-left py-3 px-4 border-b-2 border-transparent text-muted-foreground font-medium text-sm"
              >
                My Appointments
              </button>
              <Link
                to="/loyalty-points"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-3 px-4 border-b-2 border-transparent text-muted-foreground font-medium text-sm"
              >
                Loyalty Program
              </Link>
              <button 
                onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }} 
                className="w-full text-left py-3 px-4 border-b-2 border-transparent text-muted-foreground font-medium text-sm"
              >
                My Profile
              </button>
              <button 
                onClick={() => { navigate('/reviews'); setIsMobileMenuOpen(false); }} 
                className="w-full text-left py-3 px-4 border-b-2 border-transparent text-muted-foreground font-medium text-sm"
              >
                Reviews
              </button>
            </div>
          )}
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
                className="w-full pl-10 pr-4 py-3 sm:py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between px-3 py-3 sm:py-2 border border-input rounded-md bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:min-w-[180px] text-base sm:text-sm"
                >
                  <span>{categories.find(cat => cat.value === selectedCategory)?.label || 'All Categories'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => {
                          setSelectedCategory(category.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 sm:py-2 text-left hover:bg-accent hover:text-accent-foreground text-base sm:text-sm ${
                          selectedCategory === category.value ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <span>{category.label}</span>
                        {selectedCategory === category.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <Card key={salon.salon_id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
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
              <CardContent className="flex flex-col h-full">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{salon.address || [salon.city, salon.state].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{salon.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{salon.email}</span>
                  </div>
                  <div className="flex items-start text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      {salon.weekly_hours ? formatHours(salon.weekly_hours).map((hoursText, idx) => (
                        <div key={idx}>{hoursText}</div>
                      )) : <div>N/A</div>}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t mt-4">
                  <p className="text-sm text-muted-foreground">{salon.description}</p>
                </div>

                {/* Bottom section with status and buttons - perfectly aligned */}
                <div className="flex items-center justify-between pt-4 mt-auto border-t">
                  <div className={`flex items-center text-sm font-medium ${
                    isSalonOpen(salon) === null ? 'text-gray-500' : 
                    isSalonOpen(salon) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="whitespace-nowrap">{isSalonOpen(salon) === null ? 'N/A' : isSalonOpen(salon) ? 'Open now' : 'Closed'}</span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/salon/${salon.salon_id}`)}
                      className="flex-shrink-0"
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 flex-shrink-0"
                      onClick={() => navigate(`/salon/${salon.salon_id}/book`)}
                    >
                      Book Now
                    </Button>
                  </div>
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