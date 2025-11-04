import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { LogOut, Star, Calendar, Clock, MapPin, Phone, X, Edit2, Menu } from 'lucide-react';
import { notifySuccess, notifyError, Notifications } from '../utils/notifications';
import StrandsModal from '../components/StrandsModal';

export default function Appointments() {
  const { user, logout } = useContext(AuthContext);
  const { rewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'scheduled', 'past', 'cancelled'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchAppointments();
    // Refetch appointments when navigating back to this page (e.g., after rescheduling)
  }, [user, navigate, location.pathname]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      console.log('Fetching appointments from:', `${apiUrl}/bookings/myAppointments`);
      
      const response = await fetch(`${apiUrl}/bookings/myAppointments`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Appointments data received:', data);
        setAppointments(data.data || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch appointments:', errorText);
        throw new Error('Failed to fetch appointments');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to load appointments.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    // Check if appointment is today - cannot cancel day of appointment
    if (selectedAppointment?.scheduled_start) {
      const appointmentDate = new Date(selectedAppointment.scheduled_start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate.getTime() === today.getTime()) {
        notifyError('Cannot cancel appointments on the day of the appointment. Please contact the salon directly.');
        setShowCancelModal(false);
        return;
      }
    }
    
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
        fetchAppointments();
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
      'SCHEDULED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'CANCELED': 'bg-red-100 text-red-800',
      'NOSHOW': 'bg-orange-100 text-orange-800',
    };
    
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  // Check if appointment is in the past (using end time)
  const isAppointmentPast = (appointment) => {
    const appointmentEndTime = new Date(appointment.appointment?.scheduled_end || appointment.scheduled_end);
    const now = new Date();
    return appointmentEndTime < now;
  };

  // Filter appointments based on selected filter
  const getFilteredAppointments = () => {
    let filtered = appointments;
    
    if (filter !== 'all') {
      filtered = appointments.filter(appointment => {
        const status = appointment.appointment?.status || appointment.status;
        const isPast = isAppointmentPast(appointment);
        const isCancelled = status === 'CANCELLED' || status === 'CANCELED';
        
        if (filter === 'scheduled') {
          return status === 'SCHEDULED' && !isPast;
        } else if (filter === 'past') {
          return isPast && !isCancelled;
        } else if (filter === 'cancelled') {
          return isCancelled;
        }
        
        return true;
      });
    }
    
    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.appointment?.scheduled_start || a.scheduled_start);
      const dateB = new Date(b.appointment?.scheduled_start || b.scheduled_start);
      const now = new Date();
      
      const isAPast = isAppointmentPast(a);
      const isBPast = isAppointmentPast(b);
      
      // For "scheduled" filter, all are upcoming - sort ascending (soonest first)
      if (filter === 'scheduled') {
        return dateA - dateB;
      }
      
      // For "past" filter, sort descending (most recent first)
      if (filter === 'past') {
        return dateB - dateA;
      }
      
      // For "all" filter, upcoming first (soonest first), then past (most recent first)
      if (isAPast && !isBPast) return 1;
      if (!isAPast && isBPast) return -1;
      
      if (!isAPast && !isBPast) {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
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
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">My Appointments</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">View and manage your appointments</p>
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
            <button 
              onClick={() => navigate('/dashboard')}
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm whitespace-nowrap"
            >
              Browse Salons
            </button>
            
            {/* Booking & Appointments */}
            <button 
              onClick={() => navigate('/appointments')}
              className="py-4 px-1 border-b-2 border-primary text-primary font-medium text-sm whitespace-nowrap"
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
                onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                className="w-full text-left py-3 px-4 border-b-2 border-transparent text-muted-foreground font-medium text-sm"
              >
                Browse Salons
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); }}
                className="w-full text-left py-3 px-4 border-b-2 border-primary text-primary font-medium text-sm"
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
        <div className="mb-8">
          <p className="text-muted-foreground hidden sm:block">View and manage your appointments</p>
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'scheduled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('scheduled')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('past')}
            >
              Past
            </Button>
            <Button
              variant={filter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('cancelled')}
            >
              Canceled
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {getFilteredAppointments().length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No appointments found</h3>
              <p className="text-muted-foreground mb-4">{filter === 'all' ? 'Book your first appointment to get started' : filter === 'cancelled' ? 'No canceled appointments' : filter === 'past' ? 'No past appointments' : 'No upcoming appointments'}</p>
              {filter === 'all' && (
                <Button onClick={() => navigate('/dashboard')}>
                  Browse Salons
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {getFilteredAppointments().map((appointment) => {
              const isPast = isAppointmentPast(appointment);
              const status = appointment.appointment?.status || appointment.status;
              const canModify = status === 'SCHEDULED' && !isPast;
              
              // Check if appointment is today - cannot cancel or reschedule same day
              const appointmentDate = new Date(appointment.appointment?.scheduled_start || appointment.scheduled_start);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              appointmentDate.setHours(0, 0, 0, 0);
              const isSameDay = appointmentDate.getTime() === today.getTime();
              const canCancel = canModify && !isSameDay;
              const canReschedule = canModify && !isSameDay;
              
              return (
              <Card key={appointment.booking_id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{appointment.salon?.name || 'Unknown Salon'}</CardTitle>
                      <CardDescription>
                        {appointment.stylists && appointment.stylists.length > 0 
                          ? `${appointment.stylists[0].name}${appointment.stylists[0].title ? ' - ' + appointment.stylists[0].title : ''}`
                          : 'No stylist assigned'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusBadge(appointment.appointment?.status || appointment.status)}>
                      {appointment.appointment?.status || appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <div className="space-y-3 flex-grow">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(appointment.appointment?.scheduled_start || appointment.scheduled_start).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(appointment.appointment?.scheduled_start || appointment.scheduled_start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })} - {new Date(appointment.appointment?.scheduled_end || appointment.scheduled_end).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                    {appointment.services && appointment.services.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Services:</p>
                        <div className="flex flex-wrap gap-2">
                          {appointment.services.map((service, idx) => (
                            <Badge key={idx} variant="secondary">
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
                  <div className="flex items-center justify-between pt-3 border-t mt-auto">
                    <span className="text-lg font-semibold text-green-800">
                      ${typeof appointment.total_price === 'number' ? appointment.total_price.toFixed(2) : (appointment.total_price || '0.00')}
                    </span>
                    <div className="flex space-x-2">
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
                </CardContent>
              </Card>
            );
          })}
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
          return `Are you sure you want to cancel this appointment at ${salonName}?\n\n${refundNote}This action cannot be undone.`;
        })()}
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        type="danger"
        loading={canceling}
      />
    </div>
  );
}

