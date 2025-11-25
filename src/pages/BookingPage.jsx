import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Clock, Users, Check, X, Menu, Eye, Star } from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../utils/notifications';
import { trackSalonView, trackBooking } from '../utils/analytics';
import { localWallClockToUtcIso, cmpUtc, todayYmdInZone, isSameSalonLocalDate, formatInZone } from '../utils/time';
import { DateTime } from 'luxon';
import StrandsModal from '../components/StrandsModal';
import UserNavbar from '../components/UserNavbar';
import StaffReviews from '../components/StaffReviews';

export default function BookingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { salonId } = useParams();
  const location = useLocation();
  
  const [salon, setSalon] = useState(null);
  const [stylists, setStylists] = useState([]);
  const [allStylists, setAllStylists] = useState([]); // All stylists from backend
  const [services, setServices] = useState([]); // Services for selected stylist
  const [selectedStylist, setSelectedStylist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [timeSlots, setTimeSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isReschedule, setIsReschedule] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('');
  const [stylistRatings, setStylistRatings] = useState({});
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedStylistForReviews, setSelectedStylistForReviews] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchSalonData();
    
    // Track salon view analytics (AFDV 1.1)
    trackSalonView(salonId, user.user_id);
  }, [user, navigate, salonId]);

  // Pre-fill reschedule data when location.state changes
  useEffect(() => {
    if (location.state?.reschedule && location.state?.appointment && stylists.length > 0) {
      const appointment = location.state.appointment;
      
      // Check if appointment is today - cannot reschedule same day
      const appointmentDate = new Date(appointment.appointment?.scheduled_start || appointment.scheduled_start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate.getTime() === today.getTime()) {
        notifyError('Cannot reschedule appointments on the day of the appointment. Please contact the salon directly.');
        navigate('/appointments');
        return;
      }
      
      setIsReschedule(true);
      
      // Find and set the stylist from the appointment
      if (appointment.stylists && appointment.stylists.length > 0) {
        const stylistId = appointment.stylists[0].employee_id;
        const foundStylist = stylists.find(s => s.employee_id === stylistId);
        if (foundStylist) {
          setSelectedStylist(foundStylist);
          // Fetch services for the stylist
          fetchStylistServices(foundStylist.employee_id);
        }
      }
      
      // Find and select the services from the appointment
      if (appointment.services && appointment.services.length > 0) {
        // We'll set the services after they're loaded
        setTimeout(() => {
          const servicesToSelect = services.filter(s => 
            appointment.services.some(apptService => 
              apptService.service_id === s.service_id || apptService.service_name === s.name
            )
          );
          setSelectedServices(servicesToSelect);
        }, 1000); // Wait for services to load
      }
    }
  }, [location.state, stylists, services, navigate]);

  // Fetch time slots when stylist and services are selected
  useEffect(() => {
    if (selectedStylist && selectedServices.length > 0) {
      fetchTimeSlots(selectedStylist, selectedServices);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStylist, selectedServices]);

  const fetchSalonData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Fetch salon and stylists only
      const timestamp = Date.now();
      const [salonResponse, stylistsResponse] = await Promise.allSettled([
        fetch(`${apiUrl}/salons/browse?status=APPROVED&_t=${timestamp}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/salons/${salonId}/stylists?_t=${timestamp}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      // Handle salon data
      if (salonResponse.status === 'fulfilled' && salonResponse.value.ok) {
        const salonData = await salonResponse.value.json();
        const salons = salonData.data || [];
        const foundSalon = salons.find(s => s.salon_id == salonId);
        if (foundSalon) {
          setSalon(foundSalon);
        } else {
          throw new Error(`Salon with ID ${salonId} not found. Please ensure you're booking from an approved salon.`);
        }
      } else {
        throw new Error('Failed to fetch salon data from backend');
      }

      // Handle stylists data
      if (stylistsResponse.status === 'fulfilled' && stylistsResponse.value.ok) {
        const stylistsData = await stylistsResponse.value.json();
        const fetchedStylists = stylistsData.data?.stylists || [];
        setAllStylists(fetchedStylists);
        setStylists(fetchedStylists); // Initially show all stylists
        
        // Fetch ratings for all stylists
        fetchStylistRatings(fetchedStylists);
      }

      // Services will be loaded when a stylist is selected
      setServices([]); // Start with empty services

      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load booking information.');
      setLoading(false);
    }
  };

  // Fetch stylist ratings
  const fetchStylistRatings = async (stylistsList) => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const ratingsMap = {};
      const ratingPromises = stylistsList.map(async (stylist) => {
        try {
          const ratingResponse = await fetch(
            `${apiUrl}/staff-reviews/employee/${stylist.employee_id}/all?limit=1&offset=0`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );
          if (ratingResponse.ok) {
            try {
              const ratingData = await ratingResponse.json();
              ratingsMap[stylist.employee_id] = {
                avg_rating: ratingData.meta?.avg_rating || null,
                total: ratingData.meta?.total || 0
              };
            } catch (parseErr) {
            }
          }
        } catch (err) {
        }
      });
      await Promise.allSettled(ratingPromises);
      setStylistRatings(ratingsMap);
    } catch (err) {
    }
  };

  // Fetch stylist services
  const fetchStylistServices = async (stylistId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const timestamp = Date.now();
      const response = await fetch(
        `${apiUrl}/salons/${salonId}/stylists/${stylistId}/services?_t=${timestamp}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const stylistServices = data.data?.services || [];
        console.log('Fetched services for stylist:', stylistServices.length, 'services');
        setServices(stylistServices);
      } else {
        console.error('Failed to fetch stylist services');
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching stylist services:', err);
      setServices([]);
    }
  };


  const fetchTimeSlots = async (stylist, services = []) => {
    if (!stylist || !stylist.employee_id) return;

    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Calculate total duration needed for selected services
      const totalDuration = services.reduce((sum, service) => sum + (service.duration_minutes || 30), 0);
      
      // Calculate start and end dates (today + 7 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `${apiUrl}/salons/${salonId}/stylists/${stylist.employee_id}/timeslots?start_date=${startDateStr}&end_date=${endDateStr}&service_duration=${totalDuration}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.data?.daily_slots || {});
      } else {
        setTimeSlots({});
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setTimeSlots({});
    }
  };

  const handleLogout = () => {
    notifyInfo('Logged out', 'You have been successfully logged out.', 2000);
    logout();
  };

  const handleBookClick = () => {
    try {
      if (!selectedStylist || !selectedDate || !selectedTimeSlot || selectedServices.length === 0) {
        notifyError('Please select a stylist, date, time, and at least one service');
        return;
      }
      setShowConfirmModal(true);
    } catch (error) {
      notifyError('An error occurred. Please try again.');
    }
  };

  const handleConfirmBooking = async () => {
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Validate selectedTimeSlot is an object with start_time and end_time
      if (!selectedTimeSlot || typeof selectedTimeSlot !== 'object' || !selectedTimeSlot.start_time || !selectedTimeSlot.end_time) {
        notifyError('Please select a valid time slot');
        setBookingLoading(false);
        return;
      }

      if (selectedTimeSlot.available === false) {
        notifyError('The selected time slot is no longer available. Please select a different time.');
        setBookingLoading(false);
        return;
      }

      // Get salon timezone (default to America/New_York if not set)
      const salonTimezone = salon?.timezone || 'America/New_York';
      
      // Check if slot has UTC ISO strings (from backend) or HH:MM strings (legacy)
      let scheduledStartIso, scheduledEndIso;
      
      if (selectedTimeSlot.start_time.includes('T') && selectedTimeSlot.start_time.includes('Z')) {
        // Backend provided UTC ISO strings - use directly
        scheduledStartIso = selectedTimeSlot.start_time;
        scheduledEndIso = selectedTimeSlot.end_time;
      } else {
        // Legacy HH:MM format - convert to UTC using salon timezone with Luxon
        const [startHours, startMinutes] = selectedTimeSlot.start_time.split(':').map(Number);
        const [endHours, endMinutes] = selectedTimeSlot.end_time.split(':').map(Number);
        
        const startDateTime = DateTime.fromObject(
          {
            year: parseInt(selectedDate.split('-')[0]),
            month: parseInt(selectedDate.split('-')[1]),
            day: parseInt(selectedDate.split('-')[2]),
            hour: startHours,
            minute: startMinutes,
            second: 0
          },
          { zone: salonTimezone }
        );
        
        const endDateTime = DateTime.fromObject(
          {
            year: parseInt(selectedDate.split('-')[0]),
            month: parseInt(selectedDate.split('-')[1]),
            day: parseInt(selectedDate.split('-')[2]),
            hour: endHours,
            minute: endMinutes,
            second: 0
          },
          { zone: salonTimezone }
        );
        
        scheduledStartIso = startDateTime.toUTC().toISO();
        scheduledEndIso = endDateTime.toUTC().toISO();
      }
      
      // Validate time is not in the past using Luxon for consistent timezone handling
      const nowUtc = DateTime.now().toUTC();
      const scheduledStartUtc = DateTime.fromISO(scheduledStartIso, { zone: 'utc' });
      
      if (scheduledStartUtc.isValid && nowUtc.isValid && scheduledStartUtc.valueOf() < nowUtc.valueOf()) {
        notifyError('Cannot book appointments in the past. Please select a time that is at or after the current time.');
        setBookingLoading(false);
        return;
      }

      let response;
      let data;

      // Use the new reschedule endpoint if rescheduling
      if (isReschedule && location.state?.bookingId) {
        // Double-check same-day restriction before sending request (in salon timezone)
        const originalAppointmentUtc = location.state?.appointment?.appointment?.scheduled_start || location.state?.appointment?.scheduled_start;
        const todayInSalonZone = todayYmdInZone(salonTimezone);
        const bookingDateInSalonZone = selectedDate; // selectedDate is already in YYYY-MM-DD format
        
        if (isSameSalonLocalDate(originalAppointmentUtc, todayInSalonZone, salonTimezone)) {
          notifyError('Cannot reschedule appointments on the day of the appointment. Please contact the salon directly.');
          setBookingLoading(false);
          return;
        }
        
        // Reschedule endpoint: cancel + create in one call
        response = await fetch(`${apiUrl}/bookings/reschedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            booking_id: location.state.bookingId,
            // send explicit offset/Z as per backend contract
            scheduled_start: scheduledStartIso,
            notes: location.state?.appointment?.notes || ''
          })
        });

        data = await response.json();

        if (response.ok) {
          notifySuccess('Appointment rescheduled successfully!');
          navigate('/appointments');
          
          // Track reschedule analytics (non-blocking)
          trackBooking(
            salonId,
            selectedStylist.employee_id,
            selectedServices.map(s => s.service_id),
            user.user_id
          ).catch(err => console.error('Analytics tracking failed:', err));
        } else {
          // Handle reschedule-specific errors
          const errorMessage = data.message || 'Failed to reschedule appointment';
          
          if (response.status === 409) {
            notifyError('The selected time slot is no longer available. Please select a different time.');
          } else if (response.status === 404) {
            notifyError('Appointment not found or cannot be rescheduled.');
          } else if (response.status === 400) {
            // Check for same-day error message from backend
            if (errorMessage.includes('day') || errorMessage.includes('today')) {
              notifyError('Cannot reschedule appointments on the day of the appointment. Please contact the salon directly.');
            } else {
              notifyError(errorMessage);
            }
          } else {
            notifyError(errorMessage || 'Failed to reschedule appointment. Please try again.');
          }
        }
      } else {
        // New booking flow - create pending booking and redirect to payment
        response = await fetch(`${apiUrl}/salons/${salonId}/stylists/${selectedStylist.employee_id}/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            // send explicit offset/Z as per backend contract
            scheduled_start: scheduledStartIso,
            scheduled_end: scheduledEndIso,
            services: selectedServices.map(s => ({ service_id: s.service_id })),
            notes: ''
          })
        });

        data = await response.json();

        if (response.ok) {
          // Calculate total amount from selected services
          const totalAmount = selectedServices.reduce((sum, service) => {
            const price = typeof service.price === 'number' ? service.price : parseFloat(service.price || 0);
            return sum + price;
          }, 0);
          
          // Navigate to payment page with booking details
          navigate('/payment', {
            state: {
              bookingId: data.data?.booking_id || data.booking_id,
              salonId: salonId,
              amount: totalAmount,
              bookingDetails: {
                salon: salon?.name || '',
                stylist: selectedStylist?.full_name || '',
                date: selectedDate,
                time: selectedTimeSlot.start_time,
                services: selectedServices.map(s => s.name)
              }
            }
          });
        } else {
          // Handle booking errors
          const errorMessage = data.message || 'Booking failed';
          notifyError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      notifyError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
      setShowConfirmModal(false);
    }
  };

  // Helper function to format time to 12-hour AM/PM format
  const formatTo12Hour = (timeInput) => {
    if (!timeInput) return '';
    
    // Check if it's an ISO 8601 string (has 'T' and timezone indicator: Z, +HH:MM, or -HH:MM)
    // The regex checks for timezone offset pattern at the end: -05:00 or +05:00
    if (timeInput.includes('T') && (
      timeInput.includes('Z') || 
      timeInput.includes('+') || 
      /[+-]\d{2}:\d{2}$/.test(timeInput) // Matches timezone offset like -05:00 or +05:00 at the end
    )) {
      const salonTimezone = salon?.timezone || 'America/New_York';
      return formatInZone(timeInput, salonTimezone, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Legacy HH:MM format
    const [hours, minutes] = timeInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '';
    const hours12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getAvailableDates = () => {
    // Only show dates that have availability data from backend (7 days including today)
    // Use the timeSlots keys which represent dates with actual availability data
    if (Object.keys(timeSlots).length > 0) {
      return Object.keys(timeSlots)
        .map(dateStr => {
          const date = new Date(dateStr + 'T00:00:00');
          return isNaN(date.getTime()) ? null : date;
        })
        .filter(date => date !== null)
        .sort((a, b) => a - b);
    }
    
    // Fallback: if no timeSlots yet, return empty array (dates will show after selection)
    return [];
  };

  // Group dates by month for calendar display
  const getGroupedDates = () => {
    const dates = getAvailableDates();
    const grouped = {};
    dates.forEach(date => {
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!grouped[key]) {
        grouped[key] = { month: date.toLocaleString('default', { month: 'long' }), year: date.getFullYear(), dates: [] };
      }
      grouped[key].dates.push(date);
    });
    return grouped;
  };

  if (error && !salon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <UserNavbar 
          activeTab="booking" 
          title="Book Appointment" 
          subtitle="Select salon services and time" 
        />
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
        <UserNavbar 
          activeTab="booking" 
          title="Book Appointment" 
          subtitle="Select salon services and time" 
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Alert className="max-w-md mx-auto">
              <AlertDescription>Salon not found</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
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
        activeTab="booking" 
        title="Book Appointment" 
        subtitle={salon?.name || 'Select salon services and time'} 
      />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : salon ? (
          <>
            <p className="text-muted-foreground mb-4 hidden sm:block">{isReschedule ? 'Reschedule your appointment' : 'Complete your booking'}</p>
            {isReschedule && (
              <Alert className="mb-8 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  Note: Appointments cannot be cancelled or rescheduled on the day of the appointment. Please contact the salon directly for same-day changes.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Step 1: Select Stylist */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Select Stylist {isReschedule && <span className="text-xs text-muted-foreground font-normal">(Locked for Reschedule)</span>}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stylists.map((stylist) => {
                  const rating = stylistRatings[stylist.employee_id];
                  const isSelected = selectedStylist?.employee_id === stylist.employee_id;
                  
                  return (
                    <div key={stylist.employee_id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          className="flex-1 justify-start"
                          onClick={() => {
                            if (!isReschedule) {
                              // If clicking the same stylist, deselect them
                              if (selectedStylist?.employee_id === stylist.employee_id) {
                                setSelectedStylist(null);
                                setServices([]);
                                setSelectedServices([]);
                                setSelectedDate(null);
                                setSelectedTimeSlot(null);
                                setTimeSlots({});
                                setUseCustomTime(false);
                                setCustomStartTime('');
                              } else {
                                setSelectedStylist(stylist);
                                setSelectedServices([]);
                                setSelectedDate(null);
                                setSelectedTimeSlot(null);
                                setTimeSlots({});
                                setUseCustomTime(false);
                                setCustomStartTime('');
                                fetchStylistServices(stylist.employee_id);
                              }
                            }
                          }}
                          disabled={isReschedule}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          <div className="flex-1 text-left flex items-center justify-between">
                            <div className="font-medium">{stylist.full_name} - {stylist.title}</div>
                            {rating?.avg_rating && (
                              <div className="flex items-center space-x-1 ml-2">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-xs font-medium">{rating.avg_rating}</span>
                                <span className="text-xs text-muted-foreground">({rating.total})</span>
                              </div>
                            )}
                          </div>
                        </Button>
                        {isSelected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStylistForReviews(stylist);
                              setShowReviewsModal(true);
                            }}
                            className="flex-shrink-0 text-xs px-2"
                          >
                            Reviews
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Services */}
          <Card>
            <CardHeader>
              <CardTitle>2. Select Services {isReschedule && <span className="text-xs text-muted-foreground font-normal">(Locked for Reschedule)</span>}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {!selectedStylist ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Select a Stylist First</p>
                    <p className="text-sm">Choose a stylist to see their available services</p>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No Services Available</p>
                    <p className="text-sm">This stylist doesn't have any services configured yet</p>
                  </div>
                ) : (
                  services.map((service) => {
                  const isSelected = selectedServices.some(s => 
                    s.service_id === service.service_id || 
                    (s.name === service.name && s.description === service.description && s.duration_minutes === service.duration_minutes && s.price === service.price)
                  );
                  return (
                    <div
                      key={`${service.service_id}-${service.name}`}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => {
                        if (isReschedule) return; // Disable service selection during reschedule
                        let newSelectedServices;
                        if (isSelected) {
                          newSelectedServices = selectedServices.filter(s => 
                            s.service_id !== service.service_id
                          );
                        } else {
                          newSelectedServices = [...selectedServices, service];
                        }
                        setSelectedServices(newSelectedServices);
                        // Clear time and date when services change since availability changes
                        setSelectedTimeSlot(null);
                        setSelectedDate(null);
                        setUseCustomTime(false);
                        setCustomStartTime('');
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description} - <span className="text-blue-600 font-medium">{(service.duration_minutes || 30)} min</span></p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-green-800">${typeof service.price === 'number' ? service.price.toFixed(2) : parseFloat(service.price || 0).toFixed(2)}</span>
                          {isSelected && <Check className="w-5 h-5 text-primary" />}
                        </div>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Select Date */}
          <Card>
            <CardHeader>
              <CardTitle>3. Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(getGroupedDates()).map((group, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">{group.month} {group.year}</h4>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {group.dates.map((date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = selectedDate === dateStr;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const hasAvailability = timeSlots[dateStr] !== undefined;
                        
                        return (
                          <Button
                            key={dateStr}
                            variant={isSelected ? 'default' : 'outline'}
                            className={isToday ? 'ring-2 ring-primary' : ''}
                            disabled={!hasAvailability}
                            onClick={() => {
                              if (hasAvailability) {
                                setSelectedDate(dateStr);
                                setSelectedTimeSlot(null);
                                setUseCustomTime(false);
                                setCustomStartTime('');
                              }
                            }}
                          >
                            {date.getDate()}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Select Time */}
          <Card>
            <CardHeader>
              <CardTitle>4. Select Time</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate && timeSlots[selectedDate] ? (
                <div className="space-y-4">
                  {/* Toggle between predefined slots and custom time */}
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <Button
                      variant={!useCustomTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUseCustomTime(false);
                        setCustomStartTime('');
                        setSelectedTimeSlot(null);
                      }}
                      className="flex-1"
                    >
                      Predefined Slots
                    </Button>
                    <Button
                      variant={useCustomTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUseCustomTime(true);
                        setSelectedTimeSlot(null);
                      }}
                      className="flex-1"
                    >
                      Custom Time
                    </Button>
                  </div>

                  {!useCustomTime ? (
                    // Predefined time slots
                    timeSlots[selectedDate].available_slots?.length > 0 ? (
                      timeSlots[selectedDate].available_slots
                        .filter(slot => {
                          const salonTimezone = salon?.timezone || 'America/New_York';
                          const todayInSalonZone = todayYmdInZone(salonTimezone);
                          const isToday = selectedDate === todayInSalonZone;
                          
                          if (isToday) {
                            // Use UTC start_time for filtering past slots
                            let slotUtcIso;
                            if (slot.start_time && slot.start_time.includes('T') && slot.start_time.includes('Z')) {
                              slotUtcIso = slot.start_time;
                            } else if (slot.start_time) {
                              slotUtcIso = localWallClockToUtcIso(selectedDate, slot.start_time, salonTimezone);
                            } else {
                              return true; // If no start_time, show it
                            }
                            const nowUtcIso = new Date().toISOString();
                            return cmpUtc(slotUtcIso, nowUtcIso) >= 0; 
                          }
                          return true;
                        })
                        .map((slot) => {
                          const isSelected = selectedTimeSlot?.start_time === slot.start_time && selectedTimeSlot?.end_time === slot.end_time;
                          const isAvailable = slot.available === true; // Explicitly check for true
                          
                          const displayStart = slot.display_start_time || slot.start_time;
                          const displayEnd = slot.display_end_time || slot.end_time;
                          
                          const unavailableReason = slot.unavailable_reason || slot.reason || slot.status;
                          const unavailableLabel = !isAvailable 
                            ? (unavailableReason === 'booked' || unavailableReason === 'Booked' 
                                ? '(Booked)' 
                                : unavailableReason === 'blocked' || unavailableReason === 'Blocked'
                                ? '(Blocked)'
                                : '(Unavailable)')
                            : '';
                          
                          return (
                            <Button
                              key={`${slot.start_time}-${slot.end_time}`}
                              variant={isSelected && isAvailable ? 'default' : 'outline'}
                              className={`w-full ${
                                !isAvailable 
                                  ? 'cursor-not-allowed' 
                                  : ''
                              }`}
                              style={!isAvailable ? {
                                backgroundColor: '#e5e7eb',
                                color: '#6b7280',
                                borderColor: '#d1d5db',
                                opacity: 0.7
                              } : undefined}
                              disabled={!isAvailable}
                              onClick={() => {
                                if (isAvailable) {
                                  setSelectedTimeSlot(slot);
                                }
                              }}
                            >
                              {formatTo12Hour(displayStart)} - {formatTo12Hour(displayEnd)}
                              {unavailableLabel && <span className="ml-2 text-xs">{unavailableLabel}</span>}
                            </Button>
                          );
                        })
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground font-medium">
                          {new Date(selectedDate + 'T00:00:00').getDay() === 0 || new Date(selectedDate + 'T00:00:00').getDay() === 6 
                            ? 'Salon closed' 
                            : 'Stylist unavailable or booked all day'}
                        </p>
                      </div>
                    )
                  ) : (
                    // Custom time input
                    <div className="space-y-3">
                      {selectedServices.length === 0 ? (
                        <p className="text-muted-foreground">Please select services first to use custom time</p>
                      ) : (
                        <div>
                          <Label htmlFor="custom-start-time">Start Time</Label>
                          <Input
                            id="custom-start-time"
                            type="time"
                            value={customStartTime}
                            onChange={(e) => {
                              setCustomStartTime(e.target.value);
                              // Auto-calculate end time based on total duration using Luxon for proper timezone handling
                              if (e.target.value && selectedServices.length > 0) {
                              const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration_minutes || 30), 0);
                              const salonTimezone = salon?.timezone || 'America/New_York';
                              
                              // Use Luxon to create DateTime in salon's timezone
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const startDateTime = DateTime.fromObject(
                                {
                                  year: parseInt(selectedDate.split('-')[0]),
                                  month: parseInt(selectedDate.split('-')[1]),
                                  day: parseInt(selectedDate.split('-')[2]),
                                  hour: hours,
                                  minute: minutes,
                                  second: 0
                                },
                                { zone: salonTimezone }
                              );
                              
                              // Add duration and get end time in salon's timezone
                              const endDateTime = startDateTime.plus({ minutes: totalDuration });
                              const endTimeStr = `${String(endDateTime.hour).padStart(2, '0')}:${String(endDateTime.minute).padStart(2, '0')}`;
                              
                              const todayInSalonZone = todayYmdInZone(salonTimezone);
                              const isToday = selectedDate === todayInSalonZone;
                              
                              // Use Luxon for validation to ensure consistency with timezone handling
                              if (isToday) {
                                // Compare using Luxon's DateTime objects directly
                                const customSlotUtc = startDateTime.toUTC();
                                const nowUtc = DateTime.now().toUTC();
                                
                                // Use Luxon's comparison
                                if (customSlotUtc.valueOf() < nowUtc.valueOf()) {
                                  console.log(customSlotUtc.valueOf())
                                  console.log(nowUtc.valueOf())
                                  notifyError('Cannot book appointments in the past. Please select a time that is at or after the current time.');
                                  setSelectedTimeSlot(null);
                                  setCustomStartTime('');
                                  return;
                                }
                              }
                              
                              setSelectedTimeSlot({
                                start_time: e.target.value,
                                end_time: endTimeStr
                              });
                            }
                          }}
                          className="mt-1"
                        />
                          {customStartTime && selectedServices.length > 0 && selectedTimeSlot && (
                            <p className="text-sm text-muted-foreground mt-2">
                              End time: {formatTo12Hour(selectedTimeSlot.end_time)} 
                              <span className="ml-2 text-xs">
                                (Duration: {selectedServices.reduce((sum, service) => sum + (service.duration_minutes || 30), 0)} minutes)
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedStylist && selectedServices.length > 0 ? (
                <p className="text-muted-foreground">Select a date to see available time slots</p>
              ) : selectedStylist ? (
                <p className="text-muted-foreground">Select services first to see available time slots</p>
              ) : (
                <p className="text-muted-foreground">Select a stylist, services, and date to see available times</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        {selectedStylist && selectedServices.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Stylist:</span>
                  <span className="font-semibold">{selectedStylist.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Services:</span>
                  <span className="font-semibold">{selectedServices.map(s => s.name).join(', ')}</span>
                </div>
                {selectedDate && (
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-semibold">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                {selectedTimeSlot && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-semibold">
                      {selectedTimeSlot.start_time && selectedTimeSlot.end_time 
                        ? `${formatTo12Hour(selectedTimeSlot.display_start_time || selectedTimeSlot.start_time)} - ${formatTo12Hour(selectedTimeSlot.display_end_time || selectedTimeSlot.end_time)}`
                        : 'N/A'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-green-800">
                    ${selectedServices.reduce((sum, service) => {
                      const price = typeof service.price === 'number' ? service.price : parseFloat(service.price || 0);
                      return sum + price;
                    }, 0).toFixed(2)}
                  </span>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleBookClick}
                  disabled={!selectedTimeSlot}
                >
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        ) : null}
      </main>

      {/* Confirmation Modal */}
      <StrandsModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmBooking}
        title={isReschedule ? "Confirm Reschedule" : "Confirm Booking"}
        message={(() => {
          try {
            const displayStart = selectedTimeSlot?.display_start_time || selectedTimeSlot?.start_time;
            const displayEnd = selectedTimeSlot?.display_end_time || selectedTimeSlot?.end_time;
            return `Are you sure you want to ${isReschedule ? 'reschedule' : 'book'} this appointment?\n\nStylist: ${selectedStylist?.full_name || 'N/A'}\nServices: ${selectedServices?.map(s => s?.name || '').filter(Boolean).join(', ') || 'N/A'}\nDate: ${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}\nTime: ${displayStart && displayEnd ? `${formatTo12Hour(displayStart)} - ${formatTo12Hour(displayEnd)}` : 'TBD'}`;
          } catch (e) {
            return `Are you sure you want to ${isReschedule ? 'reschedule' : 'book'} this appointment?`;
          }
        })()}
        confirmText={isReschedule ? "Reschedule" : "Confirm"}
        cancelText="Cancel"
        type="success"
      />

      {/* Reviews Modal */}
      {showReviewsModal && selectedStylistForReviews && !showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedStylistForReviews.full_name} - Reviews
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedStylistForReviews.title}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReviewsModal(false);
                    setSelectedStylistForReviews(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {selectedStylistForReviews?.employee_id ? (
                  <StaffReviews
                    employeeId={selectedStylistForReviews.employee_id}
                    canReview={false}
                    onError={(error) => {
                      notifyError(error);
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
