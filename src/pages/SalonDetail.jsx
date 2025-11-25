import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { MapPin, Phone, Mail, Star, Clock, Calendar, Users, Award, Edit, Trash2, Scissors } from 'lucide-react';
import { Notifications, notifyError, notifySuccess } from '../utils/notifications';
import { trackSalonView } from '../utils/analytics';
import StrandsModal from '../components/StrandsModal';
import SalonReviews from '../components/SalonReviews';
import { Textarea } from '../components/ui/textarea';
import UserNavbar from '../components/UserNavbar';
import HaircutGalleryModal from '../components/HaircutGalleryModal';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function SalonDetail() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { salonId } = useParams();
  const [salon, setSalon] = useState(null);
  const [salonPhotoUrl, setSalonPhotoUrl] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState({ avg_rating: null, total: 0 });
  const [myReview, setMyReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({});
  const [hoverRating, setHoverRating] = useState(0);
  const [showHaircutGallery, setShowHaircutGallery] = useState(false);

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
        
        // Fetch salon, loyalty, and reviews data in parallel
        const fetchPromises = [
          fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/user/loyalty/view?salon_id=${salonId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/reviews/salon/${salonId}/all?limit=1&offset=0`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ];

        // Only fetch myReview if user is a CUSTOMER
        if (user?.role === 'CUSTOMER') {
          fetchPromises.push(
            fetch(`${apiUrl}/reviews/salon/${salonId}/myReview`, {
              headers: { 'Authorization': `Bearer ${token}` },
            })
          );
        }

        const responses = await Promise.allSettled(fetchPromises);
        const salonResponse = responses[0];
        const loyaltyResponse = responses[1];
        const reviewsResponse = responses[2];
        const myReviewResponse = user?.role === 'CUSTOMER' ? responses[3] : null;

        // Handle salon data
        if (salonResponse.status === 'fulfilled' && salonResponse.value.ok) {
          const salonData = await salonResponse.value.json();
          const salons = salonData.data || [];
          const foundSalon = salons.find(s => s.salon_id == salonId);
          
          if (!foundSalon) {
            throw new Error('Salon not found');
          }
          setSalon(foundSalon);
          
          // Fetch salon photo
          try {
            const photoResponse = await fetch(`${apiUrl}/file/get-salon-photo?salon_id=${salonId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (photoResponse.ok) {
              const photoData = await photoResponse.json();
              setSalonPhotoUrl(photoData.url || null);
            }
          } catch (err) {
            // Silently fail - photo is optional
          }
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

        if (reviewsResponse && reviewsResponse.status === 'fulfilled' && reviewsResponse.value) {
          try {
            if (reviewsResponse.value.ok) {
              const reviewsResult = await reviewsResponse.value.json();
              setReviewsMeta({
                avg_rating: reviewsResult.meta?.avg_rating || null,
                total: reviewsResult.meta?.total || 0
              });
            }
          } catch (err) {
          }
        }

        if (user?.role === 'CUSTOMER' && myReviewResponse && myReviewResponse.status === 'fulfilled' && myReviewResponse.value) {
          try {
            if (myReviewResponse.value.ok) {
              const myReviewResult = await myReviewResponse.value.json();
              if (myReviewResult.data) {
                setMyReview(myReviewResult.data);
                setReviewRating(myReviewResult.data.rating);
                setReviewMessage(myReviewResult.data.message || '');
              }
            }
          } catch (err) {
          }
        }
        
        setLoading(false);
      } catch (err) {
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

  const handleRedeemConfirm = () => {
    // Navigate to booking page - reward will be selected during payment
    navigate(`/salon/${salonId}/book`);
    setShowRedeemModal(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating <= 0) {
      notifyError('Please select a rating');
      setShowConfirmModal(false);
      return;
    }
    
    setReviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      if (myReview) {
        // Update existing review
        const response = await fetch(`${apiUrl}/reviews/update/${myReview.review_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: parseFloat(reviewRating),
            message: reviewMessage && reviewMessage.trim() ? reviewMessage.trim() : null
          })
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorData = {};
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
          }
          
          let errorMessage = errorData.message || 'Failed to update review';
          if (response.status === 500) {
            errorMessage = 'Server error occurred. Please check the backend logs for details.';
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();

        notifySuccess('Review updated successfully!');
        setMyReview(data.data);
        setShowReviewForm(false);
        setShowConfirmModal(false);
      } else {
        const requestBody = {
          salon_id: parseInt(salonId),
          rating: parseFloat(reviewRating),
          message: reviewMessage && reviewMessage.trim() ? reviewMessage.trim() : null
        };
        
        const ratingNum = parseFloat(reviewRating);
        if (ratingNum < 0.5 || ratingNum > 5 || (ratingNum * 2) % 1 !== 0) {
          notifyError('Invalid rating. Please select a valid rating between 0.5 and 5.0');
          setShowConfirmModal(false);
          setReviewLoading(false);
          return;
        }
        
        const response = await fetch(`${apiUrl}/reviews/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          let errorData = {};
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
          }
          
          let errorMessage = errorData.message || 'Failed to create review';
          if (response.status === 403) {
            errorMessage = 'You must complete a visit to this salon before leaving a review.';
          } else if (response.status === 409) {
            errorMessage = 'You have already reviewed this salon. Please update your existing review instead.';
          } else if (response.status === 400) {
            errorMessage = errorData.message || 'Invalid review data. Please check your rating and try again.';
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please check the backend logs for details.';
          }
          
          throw new Error(errorMessage);
        }
        
        const data = JSON.parse(responseText);

        notifySuccess('Review submitted successfully!');
        setMyReview(data.data);
        setShowReviewForm(false);
        setShowConfirmModal(false);
      }

      // Refresh reviews meta
      const reviewsResponse = await fetch(`${apiUrl}/reviews/salon/${salonId}/all?limit=1&offset=0`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (reviewsResponse.ok) {
        const reviewsResult = await reviewsResponse.json();
        setReviewsMeta({
          avg_rating: reviewsResult.meta?.avg_rating || null,
          total: reviewsResult.meta?.total || 0
        });
      }

      window.location.reload();
    } catch (err) {
      notifyError(err.message || 'Failed to submit review');
      setShowConfirmModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    setReviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/reviews/delete/${myReview.review_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete review');
      }

      notifySuccess('Review deleted successfully!');
      setMyReview(null);
      setReviewRating(0);
      setReviewMessage('');
      setShowReviewForm(false);
      setShowConfirmModal(false);

      // Refresh reviews meta
      const reviewsResponse = await fetch(`${apiUrl}/reviews/salon/${salonId}/all?limit=1&offset=0`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (reviewsResponse.ok) {
        const reviewsResult = await reviewsResponse.json();
        setReviewsMeta({
          avg_rating: reviewsResult.meta?.avg_rating || null,
          total: reviewsResult.meta?.total || 0
        });
      }

      window.location.reload();
    } catch (err) {
      notifyError(err.message || 'Failed to delete review');
      setShowConfirmModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const formatTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const hours12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
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

  if (error && !salon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <UserNavbar activeTab="dashboard" title="Salon Details" subtitle="View salon information" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Alert className="max-w-md mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!salon && !loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <UserNavbar activeTab="dashboard" title="Salon Details" subtitle="View salon information" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Salon not found</h2>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar 
        activeTab="dashboard" 
        title={salon?.name || 'Salon Details'} 
        subtitle={salon?.category || 'View salon information'} 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : salon ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Salon Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {salonPhotoUrl ? (
                      <img 
                        src={salonPhotoUrl} 
                        alt={salon.name}
                        className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                        onError={(e) => {
                          e.target.src = strandsLogo;
                        }}
                      />
                    ) : (
                      <img 
                        src={strandsLogo} 
                        alt="Strands"
                        className="w-20 h-20 object-contain rounded-lg border flex-shrink-0 bg-gray-50 p-2"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-3xl font-bold">{salon.name}</CardTitle>
                      <CardDescription className="text-lg mt-2">
                        <span className="whitespace-nowrap">{salon.category}</span>
                      </CardDescription>
                      <div className="flex items-center mt-4">
                        {reviewsMeta.avg_rating ? (
                          <>
                            <Star className="w-5 h-5 text-yellow-500 fill-current" />
                            <span className="ml-2 text-lg font-semibold">{reviewsMeta.avg_rating}</span>
                            <span className="ml-1 text-muted-foreground">({reviewsMeta.total} {reviewsMeta.total === 1 ? 'review' : 'reviews'})</span>
                          </>
                        ) : (
                          <>
                            <Star className="w-5 h-5 text-gray-300" />
                            <span className="ml-2 text-lg font-semibold text-muted-foreground">No ratings yet</span>
                          </>
                        )}
                      </div>
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
                              ? `${formatTo12Hour(hours.start_time)} - ${formatTo12Hour(hours.end_time)}` 
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

            {/* Reviews Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <SalonReviews 
                  salonId={salon?.salon_id || salonId}
                  salonName={salon?.name}
                  onError={(error) => {
                    setError(error);
                  }}
                />
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/products/${salonId}`)}
                >
                  View Products
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/appointments')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View My Appointments
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowHaircutGallery(true)}
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  View Haircuts
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

            {/* Write Review */}
            {user?.role === 'CUSTOMER' && (
              <Card>
                <CardHeader>
                  <CardTitle>{myReview ? 'Edit Your Review' : 'Write a Review'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {showReviewForm ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating</label>
                        <div 
                          className="flex"
                          style={{ gap: '4px', margin: 0, padding: 0 }}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          {[1, 2, 3, 4, 5].map((star) => {
                            const activeRating = hoverRating > 0 ? hoverRating : reviewRating;
                            const fullStars = Math.floor(activeRating);
                            const hasHalfStar = activeRating % 1 === 0.5 && Math.ceil(activeRating) === star;
                            const isFull = star <= fullStars;
                            const isHalf = hasHalfStar;
                            
                            return (
                              <div
                                key={star}
                                className="relative"
                                style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  flexShrink: 0,
                                  isolation: 'isolate',
                                  overflow: 'hidden',
                                  margin: 0,
                                  padding: 0,
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Background star (always gray) */}
                                <Star className="w-6 h-6 text-gray-300 absolute pointer-events-none" style={{ left: 0, top: 0, margin: 0 }} />
                                {/* Foreground star (colored portion) */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ margin: 0, padding: 0 }}>
                                  <Star
                                    className="w-6 h-6 text-yellow-500 fill-current"
                                    style={{
                                      left: 0,
                                      top: 0,
                                      margin: 0,
                                      clipPath: isHalf 
                                        ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' 
                                        : isFull 
                                        ? 'none' 
                                        : 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="absolute focus:outline-none z-20 bg-transparent border-0 cursor-pointer"
                                  style={{ 
                                    left: 0, 
                                    top: 0, 
                                    width: '50%', 
                                    height: '100%',
                                    margin: 0,
                                    padding: 0,
                                    minWidth: 0,
                                    minHeight: 0
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoverRating(star - 0.5);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewRating(star - 0.5);
                                  }}
                                  aria-label={`${star - 0.5} stars`}
                                />
                                <button
                                  type="button"
                                  className="absolute focus:outline-none z-20 bg-transparent border-0 cursor-pointer"
                                  style={{ 
                                    left: '50%', 
                                    top: 0, 
                                    width: '50%', 
                                    height: '100%',
                                    margin: 0,
                                    padding: 0,
                                    minWidth: 0,
                                    minHeight: 0
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoverRating(star);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewRating(star);
                                  }}
                                  aria-label={`${star} stars`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
                        <Textarea
                          value={reviewMessage}
                          onChange={(e) => setReviewMessage(e.target.value)}
                          placeholder="Share your experience..."
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          className="flex-1 bg-primary hover:bg-primary/90"
                          onClick={() => {
                            if (!reviewRating || reviewRating <= 0) {
                              notifyError('Please select a rating');
                              return;
                            }
                            setConfirmModalConfig({
                              title: myReview ? 'Update Review' : 'Submit Review',
                              message: myReview 
                                ? 'Are you sure you want to update your review?'
                                : 'Are you sure you want to submit this review?',
                              type: 'info',
                              onConfirm: () => {
                                handleSubmitReview();
                              }
                            });
                            setShowConfirmModal(true);
                          }}
                          disabled={reviewLoading}
                        >
                          {myReview ? 'Update Review' : 'Submit Review'}
                        </Button>
                        {myReview && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setConfirmModalConfig({
                                title: 'Delete Review',
                                message: 'Are you sure you want to delete your review? This action cannot be undone.',
                                type: 'warning',
                                onConfirm: () => {
                                  handleDeleteReview();
                                }
                              });
                              setShowConfirmModal(true);
                            }}
                            disabled={reviewLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewForm(false);
                            if (myReview) {
                              setReviewRating(myReview.rating);
                              setReviewMessage(myReview.message || '');
                            } else {
                              setReviewRating(0);
                              setReviewMessage('');
                            }
                          }}
                          disabled={reviewLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : myReview ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isFullStar = myReview.rating >= star;
                              const isHalfStar = myReview.rating === star - 0.5;
                              return (
                                <div key={star} className="relative">
                                  <Star className="w-4 h-4 text-gray-300" />
                                  {isFullStar || isHalfStar ? (
                                    <div className="absolute inset-0 overflow-hidden">
                                      <Star
                                        className={`w-4 h-4 text-yellow-500 fill-current ${
                                          isHalfStar ? 'opacity-50' : ''
                                        }`}
                                        style={{
                                          clipPath: isHalfStar 
                                            ? 'inset(0 50% 0 0)' 
                                            : 'none'
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {myReview.message || 'No comment'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowReviewForm(true)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setConfirmModalConfig({
                            title: 'Delete Review',
                            message: 'Are you sure you want to delete your review? This action cannot be undone.',
                            type: 'warning',
                            onConfirm: () => handleDeleteReview()
                          });
                          setShowConfirmModal(true);
                        }}
                        disabled={reviewLoading}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Review
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowReviewForm(true)}
                    >
                      Write a Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        ) : null}
      </main>

      {/* Custom Strands Modal - Redeem */}
      <StrandsModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        onConfirm={handleRedeemConfirm}
        title="Redeem Reward"
        message={`Redeem ${loyaltyData?.discount_percentage || 10}% off your next visit at ${salon?.name}?\n\nYou'll be able to apply this reward when you complete your booking.`}
        confirmText="Redeem"
        cancelText="Cancel"
        type="success"
      />

      {/* Custom Strands Modal - Review Confirmation */}
      <StrandsModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          if (confirmModalConfig.onConfirm) {
            confirmModalConfig.onConfirm();
          } else {
            setShowConfirmModal(false);
          }
        }}
        title={confirmModalConfig.title || 'Confirm'}
        message={confirmModalConfig.message || ''}
        confirmText="Confirm"
        cancelText="Cancel"
        type={confirmModalConfig.type || 'info'}
      />

      {/* Haircut Gallery Modal */}
      <HaircutGalleryModal
        isOpen={showHaircutGallery}
        onClose={() => setShowHaircutGallery(false)}
        salonId={salonId}
        salonName={salon?.name}
      />
    </div>
  );
}