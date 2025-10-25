import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scissors, LogOut, Calendar, Users, Star, User, AlertCircle, Clock, MapPin, Phone, Settings, CheckCircle, ChevronLeft, ChevronRight, X, Ban } from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

export default function HairstylistDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schedule');
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [viewType, setViewType] = useState('day'); // 'day', 'week' only
  const [backendSchedule, setBackendSchedule] = useState(null);
  
  // BS-1.5: Block unavailable time slots
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    weekday: '',
    start_time: '',
    end_time: ''
  });
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockLoading, setBlockLoading] = useState(false);
  useEffect(() => {
    fetchStylistSalon();
  }, []);

  useEffect(() => {
    if (salonData && activeTab === 'schedule') {
      fetchScheduleData();
    }
  }, [salonData, activeTab, viewType, selectedDate]); // Added selectedDate back for day navigation

  // BS-1.5: Fetch blocked slots when salon data is loaded
  useEffect(() => {
    if (salonData) {
      fetchBlockedSlots();
    }
  }, [salonData]);

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

  const fetchScheduleData = async () => {
    try {
      setScheduleLoading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        setScheduleData([]);
        return;
      }

      console.log('Fetching schedule data...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/stylist/weeklySchedule`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Schedule response status:', response.status);
      const data = await response.json();
      console.log('Schedule response data:', data);

      if (response.ok) {
        // Transform backend data to frontend format
        const transformedData = transformBackendScheduleData(data.data.schedule, selectedDate, viewType);
        setScheduleData(transformedData);
        setBackendSchedule(data.data.schedule); // Store raw backend schedule for availability/unavailability
      } else {
        console.error('Failed to fetch schedule:', data.message);
        setScheduleData([]);
        setBackendSchedule(null);
      }

    } catch (err) {
      console.error('Schedule fetch error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.error('Unable to connect to server. Please check if the backend is running.');
      }
      setScheduleData([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const transformBackendScheduleData = (backendSchedule, selectedDate, viewType) => {
    const appointments = [];
    
    // Helper function to convert time format from HH:MM:SS to 12-hour format
    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const min = parseInt(minutes);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
    };

    // Helper function to get date from day name for the current week
    const getDateFromDayName = (dayName, selectedDate) => {
      const dayMap = {
        'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4,
        'FRIDAY': 5, 'SATURDAY': 6, 'SUNDAY': 0
      };
      
      const targetDay = dayMap[dayName];
      
      // Get the start of the week containing selectedDate
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      
      // Calculate the date for the target day in this week
      const targetDate = new Date(startOfWeek);
      targetDate.setDate(startOfWeek.getDate() + targetDay);
      
      return targetDate;
    };

    // Process each day in the backend schedule
    Object.keys(backendSchedule).forEach(dayName => {
      const dayData = backendSchedule[dayName];
      const dayDate = getDateFromDayName(dayName, selectedDate);
      
      console.log(`Processing day: ${dayName}`, {
        hasBookings: dayData.bookings && dayData.bookings.length > 0,
        bookingCount: dayData.bookings ? dayData.bookings.length : 0,
        dayDate: dayDate.toDateString()
      });
      
      // Process bookings for this day
      if (dayData.bookings && dayData.bookings.length > 0) {
        dayData.bookings.forEach(booking => {
          console.log(`Processing booking ${booking.booking_id}:`, {
            scheduled_start: booking.scheduled_start,
            scheduled_end: booking.scheduled_end,
            dayName: dayName,
            dayDate: dayDate.toDateString()
          });
          
          // Get customer info (we'll need to fetch this separately or add to backend)
          const customerName = `Customer ${booking.customer_user_id}`; // Placeholder
          const phone = '(555) 000-0000'; // Placeholder
          
          // Determine service name (we'll need to fetch this separately or add to backend)
          const serviceName = 'Hair Service'; // Placeholder
          
          // Calculate duration
          const startTime = new Date(`2000-01-01T${booking.scheduled_start}`);
          const endTime = new Date(`2000-01-01T${booking.scheduled_end}`);
          const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
          
          // Map backend status to frontend status
          let status = 'pending';
          if (booking.status === 'CONFIRMED') status = 'confirmed';
          else if (booking.status === 'CANCELLED') status = 'cancelled';
          else if (booking.status === 'COMPLETED') status = 'confirmed';
          
          appointments.push({
            id: booking.booking_id,
            date: new Date(dayDate),
            startTime: formatTime(booking.scheduled_start),
            endTime: formatTime(booking.scheduled_end),
            customer: customerName,
            service: serviceName,
            duration: duration,
            status: status,
            phone: phone
          });
        });
      }
    });

    // Filter appointments based on view type
    if (viewType === 'day') {
      return appointments.filter(apt => 
        apt.date.toDateString() === selectedDate.toDateString()
      );
    } else if (viewType === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return appointments.filter(apt => 
        apt.date >= startOfWeek && apt.date <= endOfWeek
      );
    }
    
    return appointments;
  };

  const handleLogout = async () => {
    try {
      await authContext?.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // BS-1.5: Fetch employee ID is no longer needed
  // The backend now handles employee_id lookup internally based on authenticated user

  // BS-1.5: Fetch blocked time slots
  const fetchBlockedSlots = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/unavailability`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBlockedSlots(data.data || []);
      } else if (response.status === 404) {
        // Employee not found or no blocks yet
        setBlockedSlots([]);
      }
    } catch (err) {
      console.error('Failed to fetch blocked slots:', err);
    }
  };

  // BS-1.5: Create blocked time slot
  const handleBlockTimeSlot = async () => {
    if (!blockFormData.weekday || !blockFormData.start_time || !blockFormData.end_time) {
      toast.error('Please fill in all fields');
      return;
    }

    setBlockLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/unavailability`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            weekday: parseInt(blockFormData.weekday),
            start_time: blockFormData.start_time,
            end_time: blockFormData.end_time,
            slot_interval_minutes: 30
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Time slot blocked successfully');
        setShowBlockModal(false);
        setBlockFormData({ weekday: '', start_time: '', end_time: '' });
        fetchBlockedSlots();
        // Refresh schedule to show new unavailability
        fetchScheduleData();
      } else {
        toast.error(data.message || 'Failed to block time slot');
      }
    } catch (err) {
      console.error('Failed to block time slot:', err);
      toast.error('Failed to block time slot');
    } finally {
      setBlockLoading(false);
    }
  };

  // BS-1.5: Delete blocked time slot
  const handleDeleteBlockedSlot = async (slot) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/unavailability`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            weekday: slot.weekday,
            start_time: slot.start_time,
            end_time: slot.end_time
          })
        }
      );

      if (response.ok) {
        toast.success('Time slot unblocked successfully');
        fetchBlockedSlots();
        // Refresh schedule to update unavailability display
        fetchScheduleData();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to unblock time slot');
      }
    } catch (err) {
      console.error('Failed to unblock time slot:', err);
      toast.error('Failed to unblock time slot');
    }
  };

  const formatDate = (date) => {
    if (viewType === 'week') {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    
    // Only allow navigation within the week containing the selected date
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Check if the new date is within the current week
    if (newDate >= weekStart && newDate <= weekEnd) {
      setSelectedDate(newDate);
    }
  };

  const canNavigatePrevious = () => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    return selectedDate.getTime() > weekStart.getTime();
  };

  const canNavigateNext = () => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return selectedDate.getTime() < weekEnd.getTime();
  };

  // getCurrentWeekDays function removed - no longer needed

  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0; // Return 0 if timeStr is null/undefined
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getBackendDaySchedule = (day, weeklySchedule) => {
    if (!weeklySchedule || !day) return null; // Return null if data is missing
    
    const dayName = day.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dayMap = {
      'SUNDAY': 'SUNDAY',
      'MONDAY': 'MONDAY',
      'TUESDAY': 'TUESDAY',
      'WEDNESDAY': 'WEDNESDAY',
      'THURSDAY': 'THURSDAY',
      'FRIDAY': 'FRIDAY',
      'SATURDAY': 'SATURDAY'
    };
    const backendDayName = dayMap[dayName];
    
    console.log(`Getting schedule for ${dayName} (${backendDayName}):`, weeklySchedule[backendDayName]);
    return weeklySchedule ? weeklySchedule[backendDayName] : null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '!bg-green-200 !text-green-800 border-green-200';
      case 'pending': return '!bg-yellow-200 !text-yellow-800 border-yellow-200';
      case 'cancelled': return '!bg-red-200 !text-red-800 border-red-200';
      default: return '!bg-gray-200 !text-gray-800 border-gray-200';
    }
  };

  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
    return totalMinutes;
  };

  const minutesToPixels = (minutes) => {
    return (minutes / 60) * 48; // 48px per hour
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Month view removed - only showing current week

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
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button onClick={fetchStylistSalon} variant="outline" size="sm">
                Refresh Data
              </Button>
              <Button 
                onClick={() => setShowBlockModal(true)} 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-2"
              >
                <Ban className="w-4 h-4" />
                <span>Block Time</span>
              </Button>
              <Button 
                onClick={() => {
                  setShowUnblockModal(true);
                  fetchBlockedSlots(); // Refresh blocked slots when opening modal
                }} 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Unblock Time</span>
              </Button>
            </div>
            
            {/* View Settings */}
            <div className="bg-white rounded-lg border p-2 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <div className="flex space-x-1">
                <Button
                  variant={viewType === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewType('day')}
                  className="px-3 py-1 text-xs"
                >
                  Day
                </Button>
                <Button
                  variant={viewType === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewType('week')}
                  className="px-3 py-1 text-xs"
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">

            {/* Current Week Header */}
            <div className="bg-white rounded-lg border p-4">
              {viewType === 'day' ? (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate(-1)}
                    disabled={!canNavigatePrevious()}
                    className={`flex items-center space-x-2 ${
                      !canNavigatePrevious() 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous Day</span>
                  </Button>

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      {formatDate(selectedDate)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your daily schedule
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate(1)}
                    disabled={!canNavigateNext()}
                    className={`flex items-center space-x-2 ${
                      !canNavigateNext() 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span>Next Day</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Week of {getWeekDays()[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-{getWeekDays()[6].toLocaleDateString('en-US', { day: 'numeric' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your weekly schedule
                  </p>
                </div>
              )}
            </div>

            {/* Schedule Content */}
            {scheduleLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your schedule...</p>
              </div>
            ) : viewType === 'week' ? (
              <div className="bg-white rounded-lg border p-4">
                {/* Legend */}
                <div className="flex items-center space-x-6 mb-4 pb-4 border-b">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-foreground">Availability:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-300 opacity-40 rounded"></div>
                      <span className="text-sm text-foreground">Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-red-300 opacity-40 rounded"></div>
                      <span className="text-sm text-foreground">Unavailable</span>
                    </div>
                  </div>
                  
                  {/* Separator */}
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-foreground">Bookings:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-200 border-l-4 border-green-500 rounded"></div>
                      <span className="text-sm text-foreground">Confirmed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-yellow-200 border-l-4 border-yellow-500 rounded"></div>
                      <span className="text-sm text-foreground">Pending</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-red-200 border-l-4 border-red-500 rounded"></div>
                      <span className="text-sm text-foreground">Cancelled</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-2">
                  {/* Time column header */}
                  <div className="text-center text-sm font-medium text-muted-foreground py-2 border-r">
                    Time
                  </div>
                  
                  {/* Day headers */}
                  {getWeekDays().map((day, index) => (
                    <div key={index} className="text-center text-sm font-medium text-muted-foreground py-2 border-r">
                      <div className="font-semibold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-lg">{day.getDate()}</div>
                    </div>
                  ))}
                </div>
                
                {/* Time grid */}
                <div className="grid grid-cols-8 gap-2 relative">
                  {/* Time labels */}
                  <div className="col-span-1 border-r">
                    {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
                      <div key={hour} className="h-12 border-b border-dashed border-gray-200 flex items-start justify-end pr-2 text-xs text-muted-foreground">
                        {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`}
                      </div>
                    ))}
                  </div>
                  
                  {/* Day columns */}
                  {getWeekDays().map((day, dayIndex) => {
                    const dayScheduleData = getBackendDaySchedule(day, backendSchedule);
                    const availability = dayScheduleData?.availability;
                    const unavailabilities = dayScheduleData?.unavailability || [];
                    
                    return (
                      <div key={dayIndex} className="col-span-1 border-r relative">
                        {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
                          <div key={hour} className="h-12 border-b border-dashed border-gray-200"></div>
                        ))}
                        
                        {/* Availability highlight */}
                        {availability && availability.start_time && availability.end_time && (
                          <div
                            className="absolute left-0 right-0 bg-green-300 opacity-40 rounded-sm"
                            style={{
                              top: `${minutesToPixels(convertTimeToMinutes(availability.start_time) - 8 * 60)}px`,
                              height: `${minutesToPixels(convertTimeToMinutes(availability.end_time) - convertTimeToMinutes(availability.start_time))}px`
                            }}
                          />
                        )}
                        
                        {/* Unavailability highlights */}
                        {unavailabilities && unavailabilities.length > 0 && unavailabilities.map((unavail, unavailIndex) => (
                          unavail && unavail.start_time && unavail.end_time && (
                            <div
                              key={unavailIndex}
                              className="absolute left-0 right-0 bg-red-300 opacity-40 rounded-sm"
                              style={{
                                top: `${minutesToPixels(convertTimeToMinutes(unavail.start_time) - 8 * 60)}px`,
                                height: `${minutesToPixels(convertTimeToMinutes(unavail.end_time) - convertTimeToMinutes(unavail.start_time))}px`
                              }}
                            />
                          )
                        ))}
                        
                        {/* Appointments for this day */}
                        {scheduleData
                          .filter(apt => apt.date && apt.date.toDateString() === day.toDateString())
                          .map((appointment) => {
                            const startMinutes = timeToMinutes(appointment.startTime);
                            const endMinutes = timeToMinutes(appointment.endTime);
                            const top = minutesToPixels(startMinutes - 8 * 60); // 8 AM start
                            const height = minutesToPixels(endMinutes - startMinutes);
                            
                            return (
                              <div
                                key={appointment.id}
                                className={`absolute left-1 right-1 p-1 rounded text-xs border-l-2 shadow-sm ${getStatusColor(appointment.status)}`}
                                style={{ 
                                  top: `${top}px`, 
                                  height: `${height}px`,
                                  borderLeftColor: appointment.status === 'confirmed' ? '#16a34a' : 
                                                 appointment.status === 'pending' ? '#ca8a04' : '#dc2626'
                                }}
                              >
                                <div className="flex items-center space-x-1 mb-0.5">
                                  <CheckCircle className="w-2 h-2 flex-shrink-0" />
                                  <span className="font-semibold text-xs leading-none">{appointment.startTime} - {appointment.endTime}</span>
                                </div>
                                <div className="font-medium text-xs leading-none truncate">{appointment.customer}</div>
                                <div className="text-xs opacity-75 leading-none truncate">{appointment.service}</div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : scheduleData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No appointments scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  You have no appointments for {formatDate(selectedDate)}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Schedule Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Total Appointments</p>
                        <p className="text-2xl font-bold text-foreground">{scheduleData.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Confirmed</p>
                        <p className="text-2xl font-bold text-foreground">
                          {scheduleData.filter(apt => apt.status === 'confirmed').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Pending</p>
                        <p className="text-2xl font-bold text-foreground">
                          {scheduleData.filter(apt => apt.status === 'pending').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Cancelled</p>
                        <p className="text-2xl font-bold text-foreground">
                          {scheduleData.filter(apt => apt.status === 'cancelled').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-foreground">Appointments</h3>
                  </div>
                  <div className="divide-y">
                    {scheduleData.map((appointment) => (
                      <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{appointment.startTime} - {appointment.endTime}</span>
                              </div>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                            
                            <h4 className="font-semibold text-foreground mb-1">
                              {appointment.customer}
                            </h4>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {appointment.service} • {appointment.duration} minutes
                            </p>
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4" />
                                <span>{appointment.phone}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

        {/* BS-1.5: Block Time Slot Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md mx-auto shadow-2xl">
              <CardContent className="pt-8 px-6 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-orange-50 p-3 rounded-lg">
                  <Ban className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Block Time Slot</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockFormData({ weekday: '', start_time: '', end_time: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={blockFormData.weekday}
                    onChange={(e) => setBlockFormData({ ...blockFormData, weekday: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a day</option>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={blockFormData.start_time}
                    onChange={(e) => setBlockFormData({ ...blockFormData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={blockFormData.end_time}
                    onChange={(e) => setBlockFormData({ ...blockFormData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <Clock className="w-4 h-4 inline mr-1" />
                    This will block the selected time slot every week on the chosen day.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockFormData({ weekday: '', start_time: '', end_time: '' });
                  }}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={blockLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBlockTimeSlot}
                  disabled={blockLoading}
                  className="px-6 py-2 text-white font-medium bg-orange-600 hover:bg-orange-700"
                >
                  {blockLoading ? 'Blocking...' : 'Block Time'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        {/* BS-1.5: Unblock Time Slot Modal */}
        {showUnblockModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md mx-auto shadow-2xl">
              <CardContent className="pt-8 px-6 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Unblock Time Slot</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnblockModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* List of blocked slots */}
              <div className="mb-6">
                {blockedSlots.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No blocked time slots</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You don't have any blocked time slots to unblock
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {blockedSlots.map((slot) => {
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const formatTime = (time) => {
                        const [hours, minutes] = time.split(':');
                        const hour = parseInt(hours);
                        const period = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        return `${displayHour}:${minutes} ${period}`;
                      };

                      return (
                        <div
                          key={slot.unavailability_id}
                          className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <Clock className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {dayNames[slot.weekday]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleDeleteBlockedSlot(slot);
                              // Close modal if no more slots after deletion
                              if (blockedSlots.length === 1) {
                                setShowUnblockModal(false);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            <span className="text-xs">Remove</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowUnblockModal(false)}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}