import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Calendar, Clock, X, Edit2, Star, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { notifySuccess, notifyError } from '../utils/notifications';
import { cmpUtc, formatLocal, todayYmdInZone } from '../utils/time';
import StrandsModal from '../components/StrandsModal';
import UserNavbar from '../components/UserNavbar';
import StaffReviews from '../components/StaffReviews';
import PrivateNoteCard from '../components/PrivateNoteCard';

export default function Appointments() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'scheduled', 'past', 'cancelled'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStylistForReview, setSelectedStylistForReview] = useState(null);
  const [stylistReviews, setStylistReviews] = useState({}); // Map of employee_id -> hasReview
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalState, setPhotoModalState] = useState({
    bookingId: null,
    beforePhotoUrl: null,
    afterPhotoUrl: null
  });
  const loadingPhotosRef = useRef(false);
  const reviewFetchAbortControllerRef = useRef(null);
  const [privateNotes, setPrivateNotes] = useState({}); // Map of booking_id -> note data
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    limit: 10,
    offset: 0,
    has_next_page: false,
    has_prev_page: false
  });
  const [pageInputValue, setPageInputValue] = useState('1');

  const formatStatusLabel = (status = '') => {
    if (!status) return '';
    const normalized = status.toString().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Reset to page 1 when filter changes
    setPagination(prev => ({ ...prev, current_page: 1 }));
    setPageInputValue('1');
    fetchAppointments(1, 10, filter);
    // Refetch appointments when navigating back to this page (e.g., after rescheduling)
  }, [user, navigate, location.pathname, filter]);

  const fetchAppointments = async (page = 1, limit = 10, filterParam = null) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Use provided filterParam or current filter state to avoid stale closures
      const currentFilter = filterParam !== null ? filterParam : filter;
      
      // Build query parameters - backend expects page and limit
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add filter parameter based on current filter
      // Backend expects: filter=canceled, filter=upcoming, or filter=past
      if (currentFilter === 'scheduled') {
        // Upcoming: only show SCHEDULED appointments
        params.append('filter', 'upcoming');
      } else if (currentFilter === 'past') {
        // Past: only show COMPLETED appointments
        params.append('filter', 'past');
      } else if (currentFilter === 'cancelled') {
        // Cancelled: only show CANCELED appointments
        params.append('filter', 'canceled');
      }
      // filter === 'all' means no filter parameter - backend returns all appointments
      
      const response = await fetch(`${apiUrl}/bookings/myAppointments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const appointmentsList = Array.isArray(data.data) ? data.data : [];
        
        // Backend has already filtered by status, so we use the response directly
        setAppointments(appointmentsList);
        
        // Don't clear notes - keep cached notes to avoid refetching
        // Only fetch notes for appointments we don't have yet
        
        // Update pagination from backend response
        if (data.pagination) {
          const newPagination = {
            current_page: data.pagination.current_page || parseInt(data.pagination.page) || page,
            total_pages: data.pagination.total_pages || 1,
            total_items: data.pagination.total_items || data.pagination.total || appointmentsList.length,
            limit: data.pagination.limit || limit,
            offset: data.pagination.offset || ((page - 1) * limit),
            has_next_page: data.pagination.has_next_page !== undefined ? data.pagination.has_next_page : (page < (data.pagination.total_pages || 1)),
            has_prev_page: data.pagination.has_prev_page !== undefined ? data.pagination.has_prev_page : (page > 1)
          };
          setPagination(newPagination);
          // Update page input value when pagination changes
          setPageInputValue(newPagination.current_page.toString());
        } else {
          // Fallback if no pagination data
          const newPagination = {
            current_page: page,
            total_pages: 1,
            total_items: appointmentsList.length,
            limit: limit,
            offset: (page - 1) * limit,
            has_next_page: false,
            has_prev_page: false
          };
          setPagination(newPagination);
          setPageInputValue(page.toString());
        }
        
        // Stop loading immediately - show appointments right away
        setLoading(false);
        
        // Fetch non-critical data (notes/reviews) asynchronously after UI updates
        // Only fetch for appointments we don't already have cached
        Promise.resolve().then(() => {
          // Use requestIdleCallback if available for best performance
          if (window.requestIdleCallback) {
            requestIdleCallback(() => {
              fetchPrivateNotesInParallel(appointmentsList);
              fetchStylistReviews(appointmentsList);
            }, { timeout: 2000 });
          } else {
            // Fallback: fetch after a short delay to not block UI
            setTimeout(() => {
              fetchPrivateNotesInParallel(appointmentsList);
              fetchStylistReviews(appointmentsList);
            }, 50);
          }
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch appointments:', errorText);
        throw new Error('Failed to fetch appointments');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to load appointments.');
      setLoading(false);
    }
  };

  // Fetch all private notes in parallel for better performance
  // Memoize to avoid recreating function on every render
  const fetchPrivateNotesInParallel = useCallback(async (appointmentsList) => {
    const bookingIds = appointmentsList
      .map(apt => apt.booking_id || apt.appointment?.booking_id)
      .filter(Boolean);
    
    if (bookingIds.length === 0) {
      return; // Don't set state if no bookings
    }

    // Don't set loading state - notes are non-critical and shouldn't block UI
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Only fetch notes for bookings we don't already have cached
      // This prevents refetching when navigating pages/filters
      setPrivateNotes(prevNotes => {
        const notesToFetch = bookingIds.filter(id => !(id in prevNotes));
        
        if (notesToFetch.length === 0) {
          return prevNotes; // All notes already cached
        }
        
        // Fetch only missing notes in parallel (non-blocking)
        const notePromises = notesToFetch.map(async (bookingId) => {
          try {
            const response = await fetch(
              `${apiUrl}/appointment-notes/booking/${bookingId}/my-note`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                // Add cache control for faster subsequent loads
                cache: 'default'
              }
            );

            if (response.status === 404) {
              // No note exists - return null
              return { bookingId, note: null };
            }

            if (!response.ok) {
              return { bookingId, note: null };
            }

            const result = await response.json();
            const noteEntry = Array.isArray(result.data) && result.data.length > 0 
              ? result.data[0] 
              : null;
            
            return { bookingId, note: noteEntry };
          } catch (err) {
            // Silently fail for individual notes
            return { bookingId, note: null };
          }
        });

        // Fetch missing notes in parallel and merge with cached ones
        Promise.allSettled(notePromises).then((results) => {
          // Merge new notes with existing cached notes
          setPrivateNotes(currentNotes => {
            const newNotes = { ...currentNotes };
            results.forEach((result) => {
              if (result.status === 'fulfilled' && result.value) {
                const { bookingId, note } = result.value;
                newNotes[bookingId] = note;
              }
            });
            return newNotes;
          });
        });
        
        // Return current notes immediately (don't wait for fetch)
        return prevNotes;
      });
    } catch (err) {
      // Silently fail - notes are optional
    }
  }, []);

  const fetchStylistReviews = async (appointmentsList) => {
    // Cancel any existing review fetches if photo fetch is active
    if (loadingPhotosRef.current) {
      return;
    }

    // Create abort controller for this batch of requests
    const controller = new AbortController();
    reviewFetchAbortControllerRef.current = controller;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Get unique employee_ids from past appointments only (optimize - don't check future appointments)
      // Only check employees we don't already have cached
      setStylistReviews(prevReviews => {
        const employeeIds = new Set();
        const nowUtcIso = new Date().toISOString();
        
        appointmentsList.forEach(appointment => {
          const appointmentEndUtc = appointment.appointment?.scheduled_end || appointment.scheduled_end;
          if (!appointmentEndUtc) return;
          const isPast = cmpUtc(appointmentEndUtc, nowUtcIso) < 0;
          if (isPast && appointment.stylists && appointment.stylists.length > 0) {
            const employeeId = appointment.stylists[0].employee_id;
            if (employeeId && !(employeeId in prevReviews)) {
              // Only add if we don't already have this review cached
              employeeIds.add(employeeId);
            }
          }
        });
        
        if (employeeIds.size === 0) {
          return prevReviews; // All reviews already cached
        }

        // Fetch review for each employee - but only if photo fetch is not active
        const reviewPromises = Array.from(employeeIds).map(async (employeeId) => {
          // Skip if photo fetch started
          if (loadingPhotosRef.current || controller.signal.aborted) {
            return { employeeId, hasReview: false };
          }

          try {
            const reviewResponse = await fetch(
              `${apiUrl}/staff-reviews/employee/${employeeId}/myReview`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                signal: controller.signal,
                cache: 'default' // Cache reviews for faster subsequent loads
              }
            );
            
            if (reviewResponse.ok) {
              const reviewData = await reviewResponse.json();
              return { employeeId, hasReview: !!reviewData.data };
            }
            return { employeeId, hasReview: false };
          } catch (err) {
            // Silently fail if review doesn't exist or was aborted
            if (err.name === 'AbortError') return { employeeId, hasReview: false };
            return { employeeId, hasReview: false };
          }
        });

        // Fetch missing reviews in parallel and merge with cached ones
        Promise.allSettled(reviewPromises).then((results) => {
          if (controller.signal.aborted) return;
          
          // Merge new reviews with existing cached reviews
          setStylistReviews(currentReviews => {
            const newReviews = { ...currentReviews };
            results.forEach((result) => {
              if (result.status === 'fulfilled' && result.value) {
                const { employeeId, hasReview } = result.value;
                if (hasReview) {
                  newReviews[employeeId] = true;
                }
              }
            });
            return newReviews;
          });
        });
        
        // Return current reviews immediately (don't wait for fetch)
        return prevReviews;
      });
    } catch (err) {
      // Silently fail - reviews are optional
    } finally {
      if (reviewFetchAbortControllerRef.current === controller) {
        reviewFetchAbortControllerRef.current = null;
      }
    }
  };

  const handleViewPhotos = useCallback(async (bookingId, e) => {
    if (e) e.stopPropagation();
    
    // Prevent multiple simultaneous calls using ref (doesn't cause re-renders)
    if (loadingPhotosRef.current) return;
    
    // CRITICAL: Cancel any ongoing review fetches to free up network resources
    if (reviewFetchAbortControllerRef.current) {
      reviewFetchAbortControllerRef.current.abort();
      reviewFetchAbortControllerRef.current = null;
    }
    
    loadingPhotosRef.current = true;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      loadingPhotosRef.current = false;
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    // Use AbortController for timeout (shorter timeout for faster failure)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout - fail fast
    
    try {
      // CHECK FIRST: Don't open modal until we confirm photos exist
      // HIGHEST PRIORITY: Fetch immediately, no delays, no queuing
      const fetchOptions = {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
        keepalive: false
      };
      
      // Add priority hint if supported (Chrome/Edge)
      if ('priority' in Request.prototype) {
        fetchOptions.priority = 'high';
      }
      
      const response = await fetch(`${apiUrl}/file/get-photo?booking_id=${bookingId}`, fetchOptions);

      clearTimeout(timeoutId);

      // Handle 204 (No Content) and 404 (Not Found) as "no photos"
      if (response.status === 204 || response.status === 404) {
        loadingPhotosRef.current = false;
        notifyError('Stylist has not uploaded any photos for this appointment.');
        return;
      }

      if (!response.ok) {
        loadingPhotosRef.current = false;
        notifyError('Failed to load photos. Please try again.');
        return;
      }

      const data = await response.json();
      
      // Backend returns { before: "...", after: "..." } format
      // Empty strings mean no photo for that type
      // Handle both new format and legacy format for safety
      let beforeUrl = null;
      let afterUrl = null;
      
      if (data.before !== undefined || data.after !== undefined) {
        // New format: { before: "...", after: "..." }
        beforeUrl = (data.before && data.before.trim()) || null;
        afterUrl = (data.after && data.after.trim()) || null;
      } else if (data.urls && Array.isArray(data.urls)) {
        // Legacy format fallback: { urls: [...] } - first is before, second is after
        beforeUrl = data.urls[0] || null;
        afterUrl = data.urls[1] || null;
      }
      
      // If both are empty/null, no photos exist
      if (!beforeUrl && !afterUrl) {
        loadingPhotosRef.current = false;
        notifyError('Stylist has not uploaded any photos for this appointment.');
        return;
      }
      
      // Photos exist (at least one) - NOW open modal

      setPhotoModalState({
        bookingId,
        beforePhotoUrl: beforeUrl,
        afterPhotoUrl: afterUrl
      });
      setShowPhotoModal(true);
      loadingPhotosRef.current = false;
    } catch (err) {
      clearTimeout(timeoutId);
      loadingPhotosRef.current = false;
      if (err.name !== 'AbortError') {
        notifyError('Failed to load photos. Please try again.');
      }
    }
  }, []);

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(
        `${apiUrl}/bookings/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            booking_id: selectedAppointment.booking_id
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Check if refund was processed (backend should handle this automatically)
        const refundMessage = data.data?.refund_processed 
          ? 'Appointment cancelled and refund processed successfully.' 
          : 'Appointment cancelled successfully. Refund will be processed if applicable.';
        notifySuccess(refundMessage);
        // Refetch appointments with current filter and page
        fetchAppointments(pagination.current_page, pagination.limit, filter);
        setShowCancelModal(false);
        setSelectedAppointment(null);
      } else {
        // Provide specific error messages
        let errorMessage = data.message || 'Cancellation failed';
        if (response.status === 400) {
          if (data.message && data.message.includes('day') || data.message && data.message.includes('today')) {
            errorMessage = 'Cannot cancel appointments on the day of the appointment. Please contact the salon directly.';
          } else if (data.message && data.message.includes('past')) {
            errorMessage = 'Cannot cancel past appointments.';
          } else if (data.message && data.message.includes('already')) {
            errorMessage = 'This appointment has already been cancelled.';
          }
        } else if (response.status === 404) {
          errorMessage = 'Appointment not found. It may have already been cancelled.';
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      notifyError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCanceling(false);
    }
  };

  const handleRescheduleClick = (appointment) => {
    const salonId = appointment.salon?.salon_id || appointment.salon_id;
    navigate(`/salon/${salonId}/book`, { 
      state: { 
        reschedule: true, 
        bookingId: appointment.booking_id,
        appointment 
      } 
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      'SCHEDULED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'COMPLETED': 'bg-purple-100 text-purple-800 border-purple-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'CANCELED': 'bg-red-100 text-red-800 border-red-200',
      'NOSHOW': 'bg-gray-200 text-gray-800 border-gray-300',
    };
    
    return variants[status] || 'bg-gray-200 text-gray-800 border-gray-300';
  };


  // Memoize isAppointmentPast to avoid recalculating
  const isAppointmentPastMemo = useCallback((appointment) => {
    const appointmentEndUtc = appointment.appointment?.scheduled_end || appointment.scheduled_end;
    const nowUtcIso = new Date().toISOString();
    return cmpUtc(appointmentEndUtc, nowUtcIso) < 0;
  }, []);

  // Backend handles all filtering and sorting - use appointments directly
  // No client-side sorting needed - backend returns sorted results
  const filteredAppointments = useMemo(() => {
    // Backend already filtered and sorted by status
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    // Return appointments as-is from backend (already sorted)
    return appointments;
  }, [appointments]);

  const handlePageChange = (newPage) => {
    const pageNum = typeof newPage === 'string' ? parseInt(newPage, 10) : newPage;
    if (!isNaN(pageNum) && pageNum >= 1) {
      // Don't check total_pages here - let backend return the correct value
      // Pass current filter to ensure correct filtering
      if (pageNum !== pagination.current_page) {
        fetchAppointments(pageNum, pagination.limit, filter);
      }
    }
  };

  // Sync page input with pagination state
  useEffect(() => {
    setPageInputValue(pagination.current_page.toString());
  }, [pagination.current_page]);

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1) {
      // Check total_pages if available, otherwise allow any positive number
      if (pagination.total_pages > 0 && pageNum > pagination.total_pages) {
        setPageInputValue(pagination.current_page.toString());
      } else {
        handlePageChange(pageNum);
      }
    } else {
      setPageInputValue(pagination.current_page.toString());
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      setPageInputValue(pagination.current_page.toString());
    } else if (pagination.total_pages > 0 && pageNum > pagination.total_pages) {
      setPageInputValue(pagination.current_page.toString());
    } else if (pageNum !== pagination.current_page) {
      handlePageChange(pageNum);
    }
  };

  // Note: Filter change is already handled in the main useEffect above
  // This duplicate effect was causing double fetches - removed for optimization

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar activeTab="appointments" title="My Appointments" subtitle="View and manage your appointments" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-muted-foreground hidden sm:block">View and manage your appointments</p>
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filter !== 'all' && !loading) {
                  setFilter('all');
                }
              }}
              disabled={loading}
            >
              All
            </Button>
            <Button
              variant={filter === 'scheduled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filter !== 'scheduled' && !loading) {
                  setFilter('scheduled');
                }
              }}
              disabled={loading}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filter !== 'past' && !loading) {
                  setFilter('past');
                }
              }}
              disabled={loading}
            >
              Completed
            </Button>
            <Button
              variant={filter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filter !== 'cancelled' && !loading) {
                  setFilter('cancelled');
                }
              }}
              disabled={loading}
            >
              Cancelled
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-24 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No appointments found</h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Book your first appointment to get started' 
                  : filter === 'cancelled' 
                  ? 'No canceled appointments' 
                  : filter === 'past' 
                  ? 'No past appointments' 
                  : filter === 'scheduled'
                  ? 'No upcoming appointments'
                  : 'No appointments found'}
              </p>
              {filter === 'all' && (
                <Button onClick={() => navigate('/dashboard')}>
                  Browse Salons
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAppointments.map((appointment) => {
              const isPast = isAppointmentPastMemo(appointment);
              const status = appointment.appointment?.status || appointment.status;
              const canModify = status === 'SCHEDULED' && !isPast;
              
              // Check if appointment is today - cannot cancel or reschedule same day
              const appointmentUtc = appointment.appointment?.scheduled_start || appointment.scheduled_start;
              const todayInViewerZone = todayYmdInZone(undefined);
              const appointmentDateStr = formatLocal(appointmentUtc, { dateStyle: 'short' }).split(',')[0];
              const todayFormatted = formatLocal(new Date().toISOString(), { dateStyle: 'short' }).split(',')[0];
              const isSameDay = appointmentDateStr === todayFormatted;
              const canCancel = canModify && !isSameDay;
              const canReschedule = canModify && !isSameDay;

              const originalTotal = typeof appointment.total_price === 'number'
                ? appointment.total_price
                : parseFloat(appointment.total_price || 0);
              const actualPaid = appointment.actual_amount_paid !== undefined && appointment.actual_amount_paid !== null
                ? (typeof appointment.actual_amount_paid === 'number'
                    ? appointment.actual_amount_paid
                    : parseFloat(appointment.actual_amount_paid))
                : originalTotal;
              const rewardInfo = appointment.reward || null;
              const promoInfo = appointment.promo || null;
              const hasDiscount = (rewardInfo || promoInfo) && !Number.isNaN(actualPaid) && actualPaid < originalTotal;
              const discountLabel = rewardInfo?.discount_percentage
                ? `${rewardInfo.discount_percentage}% off`
                : promoInfo?.discount_pct
                ? `${promoInfo.discount_pct}% off`
                : 'Discount applied';
              const couponNote = rewardInfo ? 'Coupons are non-refundable and one-time use.' : '';
              
              return (
              <Card key={appointment.booking_id} className="flex flex-col h-full">
                <CardHeader className="flex-shrink-0">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{appointment.salon?.name || 'Unknown Salon'}</CardTitle>
                      <CardDescription className="mt-1">
                        {appointment.stylists && appointment.stylists.length > 0 
                          ? `${appointment.stylists[0].name}${appointment.stylists[0].title ? ' - ' + appointment.stylists[0].title : ''}`
                          : 'No stylist assigned'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasDiscount && (
                        <Badge className="bg-sky-100 text-sky-700 border-sky-200 whitespace-nowrap">
                          {promoInfo ? 'Promo Applied' : 'Discounted'}
                        </Badge>
                      )}
                      <Badge className={`${getStatusBadge(status)} whitespace-nowrap`}>
                        {formatStatusLabel(status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatLocal(appointment.appointment?.scheduled_start || appointment.scheduled_start, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatLocal(appointment.appointment?.scheduled_start || appointment.scheduled_start, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })} - {formatLocal(appointment.appointment?.scheduled_end || appointment.scheduled_end, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                    {appointment.services && appointment.services.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-2">Services:</p>
                        <div className="flex flex-wrap gap-2">
                          {appointment.services.map((service, idx) => (
                            <Badge key={idx} variant="secondary" className="whitespace-nowrap">
                              {service.service_name || service.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {isSameDay && canModify && (
                      <Alert className="mt-3 bg-yellow-50 border-yellow-200 py-2">
                        <AlertDescription className="text-xs text-yellow-800">
                          Cannot cancel or reschedule on the day of appointment. Contact salon directly.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="flex items-start justify-between pt-4 border-t mt-auto flex-shrink-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      {hasDiscount ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-muted-foreground line-through">
                              ${!Number.isNaN(originalTotal) ? originalTotal.toFixed(2) : '0.00'}
                            </span>
                            <span className="text-lg font-semibold text-green-800">
                              ${!Number.isNaN(actualPaid) ? actualPaid.toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {discountLabel}. {couponNote}
                            {rewardInfo?.note ? ` ${rewardInfo.note}` : ''}
                            {promoInfo?.promo_code ? ` Promo Code: ${promoInfo.promo_code}` : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-green-800">
                          ${!Number.isNaN(originalTotal) ? originalTotal.toFixed(2) : '0.00'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 ml-4 flex-shrink-0">
                      {isPast && appointment.stylists && appointment.stylists.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const stylist = appointment.stylists[0];
                            setSelectedStylistForReview({
                              employee_id: stylist.employee_id,
                              full_name: stylist.name,
                              title: stylist.title || ''
                            });
                            setShowReviewModal(true);
                          }}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          {stylistReviews[appointment.stylists[0].employee_id] ? 'Edit Review' : 'Review Stylist'}
                        </Button>
                      )}
                      {isPast && status === 'COMPLETED' && appointment.booking_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPhotos(appointment.booking_id, e);
                          }}
                        >
                          <Image className="w-4 h-4 mr-1" />
                          View Photos
                        </Button>
                      )}
                      {canReschedule && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRescheduleClick(appointment)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Reschedule
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancelClick(appointment)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {appointment.booking_id && (
                    <div className="mt-4 flex-shrink-0">
                    <PrivateNoteCard
                      bookingId={appointment.booking_id}
                        initialNote={privateNotes[appointment.booking_id]}
                        title="Private note"
                        description="Only you can see this."
                        onNoteChange={(note) => {
                          // Update notes map when note is saved/deleted
                          setPrivateNotes(prev => ({
                            ...prev,
                            [appointment.booking_id]: note
                          }));
                        }}
                    />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.current_page - 1) * pagination.limit) + 1} - {Math.min(pagination.current_page * pagination.limit, pagination.total_items)} of {pagination.total_items} appointments
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={!pagination.has_prev_page || loading || pagination.current_page <= 1}
                className="h-9 px-3"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Number Input */}
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Page</span>
                <Input
                  type="number"
                  min={1}
                  max={pagination.total_pages}
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputBlur}
                  onWheel={(e) => e.target.blur()} // Disable scroll wheel
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePageInputSubmit(e);
                    }
                  }}
                  className="w-16 h-9 text-center text-sm font-medium border-gray-300 focus:border-primary focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                  style={{ WebkitAppearance: 'textfield' }}
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">of {pagination.total_pages}</span>
              </form>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={!pagination.has_next_page || loading || pagination.current_page >= pagination.total_pages}
                className="h-9 px-3"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      <StrandsModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Appointment"
        message={(() => {
          let refundNote = 'A refund will be processed if applicable.\n\n';
          if (selectedAppointment?.scheduled_start) {
            const appointmentDate = new Date(selectedAppointment.scheduled_start);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            appointmentDate.setHours(0, 0, 0, 0);
            if (appointmentDate.getTime() === today.getTime()) {
              refundNote = 'Cannot cancel appointments on the day of the appointment.\n\n';
            }
          }
          const salonName = selectedAppointment?.salon?.name || selectedAppointment?.salon_name || 'this salon';
          const rewardNote = selectedAppointment?.reward ? 'Loyalty rewards are non-refundable and one-time use.\n\n' : '';
          return `Are you sure you want to cancel this appointment at ${salonName}?\n\n${refundNote}${rewardNote}This action cannot be undone.`;
        })()}
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        type="danger"
        loading={canceling}
      />

      {/* Review Stylist Modal */}
      {showReviewModal && selectedStylistForReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Review {selectedStylistForReview.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedStylistForReview.title}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedStylistForReview(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {selectedStylistForReview?.employee_id ? (
                  <StaffReviews
                    employeeId={selectedStylistForReview.employee_id}
                    canReview={true}
                    onError={(error) => {
                      notifyError(error);
                    }}
                    onReviewChange={() => {
                      // Refresh reviews state after submit/update/delete
                      fetchStylistReviews(appointments);
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photo View Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">Before/After Photos</h3>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowPhotoModal(false);
                }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Before</h4>
                    {photoModalState.beforePhotoUrl ? (
                      <img src={photoModalState.beforePhotoUrl} alt="before" className="w-full max-w-sm h-72 rounded-md object-cover border border-gray-200" />
                    ) : (
                      <div className="w-full max-w-sm h-72 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {photoModalState.afterPhotoUrl ? 'Only after photo uploaded' : 'No before photo uploaded'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">After</h4>
                    {photoModalState.afterPhotoUrl ? (
                      <img src={photoModalState.afterPhotoUrl} alt="after" className="w-full max-w-sm h-72 rounded-md object-cover border border-gray-200" />
                    ) : (
                      <div className="w-full max-w-sm h-72 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {photoModalState.beforePhotoUrl ? 'Only before photo uploaded' : 'No after photo uploaded'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowPhotoModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

