import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { MapPin, Phone, Mail, Star, Clock, LogOut, ArrowLeft, Calendar, Users, Award } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import { trackSalonView } from '../utils/analytics';
import StrandsModal from '../components/StrandsModal';

export default function SalonDetail() {
  const { user, logout } = useContext(AuthContext);
  const { rewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const { salonId } = useParams();
  const [salon, setSalon] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchSalonDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        
        // Fetch salon and loyalty data in parallel
        const [salonResponse, loyaltyResponse] = await Promise.allSettled([
          fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/user/loyalty/view?salon_id=${salonId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ]);

        // Handle salon data
        if (salonResponse.status === 'fulfilled' && salonResponse.value.ok) {
          const salonData = await salonResponse.value.json();
          const salons = salonData.data || [];
          const foundSalon = salons.find(s => s.salon_id == salonId);
          
          if (!foundSalon) {
            throw new Error('Salon not found');
          }
          setSalon(foundSalon);
        } else {
          throw new Error('Failed to fetch salon details');
        }

        // Handle loyalty data (optional)
        if (loyaltyResponse.status === 'fulfilled' && loyaltyResponse.value.ok) {
          const loyaltyResult = await loyaltyResponse.value.json();
          setLoyaltyData({
            ...loyaltyResult.userData,
            userRewards: loyaltyResult.userRewards || []
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching salon details:', err);
        setError(err.message || 'Failed to load salon details.');
        setLoading(false);
      }
    };

    fetchSalonDetails();
    
    // Track salon view analytics (AFDV 1.1)
    if (user) {
      trackSalonView(salonId, user.user_id);
    }
  }, [user, navigate, salonId]);

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  const handleRedeemConfirm = () => {
    // TODO: Connect to backend redeem endpoint when available
    // For now just show success message to user
    Notifications.notifySuccess(
      `Reward redeemed! ${loyaltyData.discount_percentage || 10}% off will be applied to your next visit at ${salon.name}.`
    );
    setShowRedeemModal(false);
  };

  const isSalonOpen = () => {
    if (!salon || !salon.weekly_hours) return false;
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes; // Convert to minutes
    
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[dayOfWeek];
    const todayHours = salon.weekly_hours[today];
    
    if (!todayHours || !todayHours.is_open || !todayHours.start_time || !todayHours.end_time) {
      return false;
    }
    
    // Parse start and end times
    const [startHours, startMinutes] = todayHours.start_time.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = todayHours.end_time.split(':').map(Number);
    const endTime = endHours * 60 + endMinutes;
    
    return currentTime >= startTime && currentTime < endTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Alert className="max-w-md">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Salon not found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
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
              <Link to="/dashboard" className="flex items-center space-x-2">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Salons</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/loyalty-points"
                className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">{rewardsCount} rewards ready</span>
              </Link>
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

      {/* Navigation Bar */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Browse Salons</span>
            </Link>
            <Link
              to="/appointments"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>My Appointments</span>
            </Link>
            <Link
              to="/loyalty-points"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Loyalty Program</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>My Profile</span>
            </Link>
            <Link
              to="/reviews"
              className="flex items-center space-x-2 px-3 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Reviews</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Salon Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold">{salon.name}</CardTitle>
                    <CardDescription className="text-lg mt-2">{salon.category}</CardDescription>
                    <div className="flex items-center mt-4">
                      <Star className="w-5 h-5 text-yellow-500 fill-current" />
                      <span className="ml-2 text-lg font-semibold">4.8</span>
                      <span className="ml-1 text-muted-foreground">(24 reviews)</span>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${isSalonOpen() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {isSalonOpen() ? 'Open now' : 'Closed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">About</h3>
                  <p className="text-muted-foreground">{salon.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 text-muted-foreground mr-3" />
                      <span>{salon.address || [salon.city, salon.state, salon.postal_code].filter(Boolean).join(', ')}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-muted-foreground mr-3" />
                      <span>{salon.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-muted-foreground mr-3" />
                      <span>{salon.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Hours</h3>
                  <div className="space-y-2">
                    {salon.weekly_hours ? Object.entries(salon.weekly_hours).map(([day, hours]) => {
                      const dayName = day.charAt(0) + day.slice(1).toLowerCase();
                      const isOpen = hours.is_open && hours.start_time && hours.end_time;
                      return (
                        <div key={day} className="flex items-center">
                          <Clock className="w-4 h-4 text-muted-foreground mr-3" />
                          <span>
                            {dayName}: {isOpen 
                              ? `${hours.start_time} - ${hours.end_time}` 
                              : 'Closed'}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-muted-foreground mr-3" />
                        <span>N/A</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => navigate(`/salon/${salonId}/book`)}
                >
                  Book Appointment
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/appointments')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View My Appointments
                </Button>
              </CardContent>
            </Card>

            {/* Loyalty Program */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Loyalty Program
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loyaltyData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Your Progress</span>
                      <Badge 
                        className={loyaltyData.visits_count >= loyaltyData.target_visits 
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200" 
                          : "bg-orange-100 text-orange-800 border-orange-200"
                        }
                      >
                        {loyaltyData.visits_count >= loyaltyData.target_visits ? 'Gold Status' : 'Bronze Status'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Visits</span>
                        <span>{loyaltyData.visits_count || 0}/{loyaltyData.target_visits || 5}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(((loyaltyData.visits_count || 0) / (loyaltyData.target_visits || 5)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {loyaltyData.userRewards && loyaltyData.userRewards.length > 0 ? (
                      <div className="space-y-3">
                        {loyaltyData.userRewards
                          .filter(reward => reward.active === 1)
                          .map((reward) => (
                            <div key={reward.reward_id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Award className="w-4 h-4 text-green-600 mr-2" />
                                  <span className="text-sm font-medium text-green-800">
                                    {reward.discount_percentage}% off next visit available!
                                  </span>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                  onClick={() => setShowRedeemModal(true)}
                                >
                                  Redeem
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          {loyaltyData.target_visits - (loyaltyData.visits_count || 0)} more visits for {loyaltyData.discount_percentage || 10}% off
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/loyalty-points')}>
                          View All Rewards
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Book now to start earning rewards
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">2 days ago</span>
                      </div>
                      <p className="text-sm">"Great service and friendly staff!"</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">1 week ago</span>
                      </div>
                      <p className="text-sm">"Love the atmosphere here!"</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View All Reviews
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Custom Strands Modal */}
      <StrandsModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        onConfirm={handleRedeemConfirm}
        title="Redeem Reward"
        message={`Are you sure you want to redeem ${loyaltyData?.discount_percentage || 10}% off your next visit at ${salon?.name}?\n\nThis reward will be applied to your next booking.`}
        confirmText="Redeem"
        cancelText="Cancel"
        type="success"
      />
    </div>
  );
}