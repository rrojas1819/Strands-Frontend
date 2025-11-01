import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scissors, LogOut, Calendar, Users, Star, User, AlertCircle, Clock, MapPin, Phone, Settings, CheckCircle, ChevronLeft, ChevronRight, X, Ban, Plus, Edit, Trash2, Scissors as ScissorsIcon, ArrowUpDown, Eye } from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Initialize to the start of current week (Sunday)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [viewType, setViewType] = useState('day'); // 'day', 'week' only
  const [backendSchedule, setBackendSchedule] = useState(null);
  const [scheduleDateRange, setScheduleDateRange] = useState({ start: null, end: null }); // Track 7-day window
  
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
  
  // BS-1.01: Services management
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [deletingService, setDeletingService] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    price: ''
  });
  const [serviceLoading, setServiceLoading] = useState(false);
  
  // New state for cancelled appointments and popup
  const [showCancelledTab, setShowCancelledTab] = useState(false);
  const [cancelledDate, setCancelledDate] = useState(new Date());
  const [showAppointmentPopup, setShowAppointmentPopup] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // UPH-1.21: Customer visit history state
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerPagination, setCustomerPagination] = useState({
    limit: 20,
    offset: 0,
    total_records: 0,
    has_more: false
  });
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [showCustomerVisitModal, setShowCustomerVisitModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerVisits, setCustomerVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsPagination, setVisitsPagination] = useState({
    limit: 20,
    offset: 0,
    total_records: 0,
    has_more: false
  });
  
  useEffect(() => {
    fetchStylistSalon();
  }, []);

  useEffect(() => {
    if (salonData && activeTab === 'schedule') {
      fetchScheduleData();
    }
  }, [salonData, activeTab, viewType, selectedDate, weekStartDate]); // Use selectedDate for day view, weekStartDate for week view

  // BS-1.5: Fetch blocked slots when salon data is loaded
  useEffect(() => {
    if (salonData) {
      fetchBlockedSlots();
    }
  }, [salonData]);
  
  // BS-1.01: Fetch services when services tab is active
  useEffect(() => {
    if (activeTab === 'services') {
      fetchServices();
    }
  }, [activeTab]);
  
  // UPH-1.21: Fetch customers when customers tab is active
  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    }
  }, [activeTab, sortOrder]);

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

      // Helper function to format date as MM-DD-YYYY
      const formatDateForAPI = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      };

      // Calculate date range based on view type
      let startDate, endDate;
      
      if (viewType === 'week') {
        // For week view, use weekStartDate to get the start of the week (Sunday)
        const weekStart = new Date(weekStartDate);
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        
        // Calculate end of week (Saturday, 6 days after Sunday)
        // But also fetch next week to check if it has data for navigation
        const currentWeekEnd = new Date(weekStart);
        currentWeekEnd.setDate(weekStart.getDate() + 6);
        
        // Fetch current week + next week to check availability
        const nextWeekStart = new Date(weekStart);
        nextWeekStart.setDate(weekStart.getDate() + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        
        // Use the later end date (next week end) to fetch both weeks
        endDate = nextWeekEnd;
        endDate.setHours(23, 59, 59, 999);
      } else {
        // For day view, use the 7-day window (today through today + 6 days = 7 days total)
        // This matches the booking page which fetches 7 days (today + 7 days = 8 total, but we use 7 days including today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = today;
        
        // Match booking page: endDate is today + 7 days, which gives us 8 days total including today
        // But for consistency with booking page logic, we'll use today + 6 days (7 days total)
        // Actually, let's check booking page - it does today + 7, which is 8 days total
        // So for stylist view, let's also do today + 7 to match
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 7); // Changed from +6 to +7 to match booking page
        endDate.setHours(23, 59, 59, 999);
        
        // Update scheduleDateRange for day view navigation
        setScheduleDateRange({ start: new Date(startDate), end: new Date(endDate) });
      }

      // Format dates for API
      const startDateStr = formatDateForAPI(startDate);
      const endDateStr = formatDateForAPI(endDate);

      console.log('Fetching schedule data...', {
        startDate: startDateStr,
        endDate: endDateStr,
        viewType,
        selectedDate: selectedDate.toDateString(),
        weekStartDate: weekStartDate.toDateString()
      });

      const apiUrl = `${import.meta.env.VITE_API_URL}/user/stylist/weeklySchedule?start_date=${startDateStr}&end_date=${endDateStr}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Schedule response status:', response.status);
      const data = await response.json();
      console.log('Schedule response data:', data);
      console.log('Raw schedule data:', data.data?.schedule);

      if (response.ok) {
        // Transform backend data to frontend format
        // Use appropriate date based on viewType: weekStartDate for week view, selectedDate for day view
        const dateForTransform = viewType === 'week' ? weekStartDate : selectedDate;
        const transformedData = transformBackendScheduleData(data.data.schedule, dateForTransform, viewType, weekStartDate);
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

  const transformBackendScheduleData = (backendSchedule, selectedDate, viewType, weekStartDate) => {
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

    // Helper function to parse date from MM-DD-YYYY format
    const parseDateFromKey = (dateKey) => {
      try {
        const [month, day, year] = dateKey.split('-').map(Number);
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
          console.warn(`Invalid date key format: ${dateKey}`);
          return null;
        }
        const date = new Date(year, month - 1, day); // month is 0-indexed in Date
        date.setHours(0, 0, 0, 0); // Normalize to midnight
        return date;
      } catch (err) {
        console.error(`Error parsing date key: ${dateKey}`, err);
        return null;
      }
    };

    // Process each day in the backend schedule (keys are now date strings like "10-31-2025")
    Object.keys(backendSchedule).forEach(dateKey => {
      const dayData = backendSchedule[dateKey];
      const dayDate = parseDateFromKey(dateKey);
      
      if (!dayDate) {
        console.warn(`Skipping invalid date key: ${dateKey}`);
        return;
      }
      
      console.log(`Processing day: ${dateKey}`, {
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
            dateKey: dateKey,
            dayDate: dayDate.toDateString()
          });
          
          console.log('Processing booking:', booking.booking_id, {
            customer: booking.customer,
            customer_name: booking.customer?.name,
            all_booking_keys: Object.keys(booking)
          });
          
          // Get customer info from booking data - use the actual structure from backend
          const customerName = booking.customer?.name || 'Customer Name Not Available';
          const phone = booking.customer?.phone || null; // Don't show fake number
          
          // Get service information - handle multiple services using actual backend structure
          let serviceInfo = 'Service Name Not Available';
          let totalPrice = 0;
          let totalDuration = 0;
          
          if (booking.services && Array.isArray(booking.services) && booking.services.length > 0) {
            // Multiple services - use actual backend structure
            const serviceNames = booking.services.map(s => s.service_name || 'Unknown Service');
            const servicePrices = booking.services.map(s => parseFloat(s.price || 0));
            const serviceDurations = booking.services.map(s => parseInt(s.duration_minutes || 0));
            
            serviceInfo = serviceNames.join(', ');
            totalPrice = servicePrices.reduce((sum, price) => sum + price, 0);
            totalDuration = serviceDurations.reduce((sum, duration) => sum + duration, 0);
          } else {
            // Fallback to total values from backend
            totalPrice = parseFloat(booking.total_price || 0);
            totalDuration = parseInt(booking.total_duration_minutes || 0);
            serviceInfo = 'Service Name Not Available';
          }
          
          // Map backend status to frontend status - handle various possible status values
          let status = 'pending';
          const backendStatus = booking.status?.toUpperCase();
          
          // CONFIRMED in backend means past/completed visits
          if (backendStatus === 'CONFIRMED' || backendStatus === 'COMPLETED') {
            status = 'completed';
          } else if (backendStatus === 'CANCELED' || backendStatus === 'CANCELLED') {
            status = 'canceled';
          } else if (backendStatus === 'PENDING' || backendStatus === 'SCHEDULED') {
            status = 'pending';
          }
          
          // Auto-update status: if appointment end time has passed and not cancelled, mark as completed (past visit)
          if (status !== 'canceled' && status !== 'completed' && booking.scheduled_end && booking.scheduled_start) {
            try {
              // Parse the end time (format: "HH:MM:SS" from backend)
              const endTimeParts = booking.scheduled_end.split(':');
              if (endTimeParts.length >= 2) {
                const hours = parseInt(endTimeParts[0], 10);
                const minutes = parseInt(endTimeParts[1], 10);
                const seconds = endTimeParts[2] ? parseInt(endTimeParts[2], 10) : 0;
                
                // Parse the start time (format: "HH:MM:SS" from backend)
                const startTimeParts = booking.scheduled_start.split(':');
                if (startTimeParts.length >= 2) {
                  const startHours = parseInt(startTimeParts[0], 10);
                  const startMinutes = parseInt(startTimeParts[1], 10);
                  
                  // Create full datetime for appointment end (use the day date from the booking)
                  // Create new date objects to avoid mutation issues
                  const appointmentEndDate = new Date(dayDate);
                  appointmentEndDate.setHours(hours, minutes, seconds, 0);
                  
                  const appointmentStartDate = new Date(dayDate);
                  appointmentStartDate.setHours(startHours, startMinutes, 0, 0);
                  
                  const now = new Date();
                  
                  // If appointment end time has passed, mark as completed (past visit)
                  // Verify both dates are valid and appointment is in the past
                  if (
                    !isNaN(appointmentEndDate.getTime()) && 
                    !isNaN(appointmentStartDate.getTime()) &&
                    appointmentEndDate < now
                  ) {
                    status = 'completed';
                    console.log(`Auto-updated booking ${booking.booking_id} to completed:`, {
                      appointmentEndDate: appointmentEndDate.toISOString(),
                      now: now.toISOString(),
                      dateKey,
                      dayDate: dayDate.toDateString()
                    });
                  }
                }
              }
            } catch (err) {
              console.error('Error parsing appointment time for status update:', err, {
                booking_id: booking.booking_id,
                scheduled_start: booking.scheduled_start,
                scheduled_end: booking.scheduled_end
              });
            }
          }
          
          console.log(`Booking ${booking.booking_id} status:`, {
            backendStatus: booking.status,
            normalizedStatus: backendStatus,
            frontendStatus: status,
            dateKey: dateKey,
            dayDate: dayDate.toDateString()
          });
          
          appointments.push({
            id: booking.booking_id,
            date: new Date(dayDate),
            startTime: formatTime(booking.scheduled_start),
            endTime: formatTime(booking.scheduled_end),
            customer: customerName,
            service: serviceInfo,
            duration: totalDuration,
            totalPrice: totalPrice,
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
      // For week view, use weekStartDate (which should be the start of the week)
      const startOfWeek = new Date(weekStartDate);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= startOfWeek && aptDate <= endOfWeek;
      });
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

  // BS-1.01: Services management functions
  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      console.log('Fetching services...');
      console.log('API URL:', `${apiUrl}/salons/stylist/myServices`);
      
      const response = await fetch(`${apiUrl}/salons/stylist/myServices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Services response status:', response.status);
      console.log('Services response data:', data);
      
      if (response.ok) {
        const servicesList = data.data?.services || data.services || [];
        console.log('Services list:', servicesList);
        setServices(servicesList);
      } else {
        console.error('Failed to fetch services:', data.message);
        setServices([]);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleCreateService = async () => {
    if (!serviceFormData.name || !serviceFormData.description || !serviceFormData.duration_minutes || !serviceFormData.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setServiceLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/stylist/createService`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: serviceFormData.name,
          description: serviceFormData.description,
          duration_minutes: parseInt(serviceFormData.duration_minutes),
          price: parseFloat(serviceFormData.price)
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Service created successfully');
        setShowServiceModal(false);
        setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
        fetchServices();
      } else {
        toast.error(data.message || 'Failed to create service');
      }
    } catch (err) {
      console.error('Failed to create service:', err);
      toast.error('Failed to create service');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    setServiceLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const updateData = {};
      if (serviceFormData.name) updateData.name = serviceFormData.name;
      if (serviceFormData.description) updateData.description = serviceFormData.description;
      if (serviceFormData.duration_minutes) updateData.duration_minutes = parseInt(serviceFormData.duration_minutes);
      if (serviceFormData.price) updateData.price = parseFloat(serviceFormData.price);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/stylist/updateService/${editingService.service_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Service updated successfully');
        setShowEditServiceModal(false);
        setEditingService(null);
        setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
        fetchServices();
      } else {
        toast.error(data.message || 'Failed to update service');
      }
    } catch (err) {
      console.error('Failed to update service:', err);
      toast.error('Failed to update service');
    } finally {
      setServiceLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;

    setServiceLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      console.log('Deleting service:', deletingService);
      console.log('Service ID:', deletingService.service_id);
      console.log('API URL:', `${apiUrl}/salons/stylist/removeService/${deletingService.service_id}`);
      
      const response = await fetch(`${apiUrl}/salons/stylist/removeService/${deletingService.service_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Delete response status:', response.status);
      console.log('Delete response data:', data);
      
      if (response.ok) {
        toast.success('Service removed successfully');
        setShowDeleteServiceModal(false);
        setDeletingService(null);
        // Refresh services list
        console.log('Refreshing services list...');
        await fetchServices();
        console.log('Service deleted successfully, services refreshed');
      } else {
        console.error('Delete failed:', data);
        toast.error(data.message || 'Failed to remove service');
      }
    } catch (err) {
      console.error('Failed to remove service:', err);
      toast.error('Failed to remove service. Please try again.');
    } finally {
      setServiceLoading(false);
    }
  };

  const openDeleteModal = (service) => {
    setDeletingService(service);
    setShowDeleteServiceModal(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes.toString(),
      price: service.price.toString()
    });
    setShowEditServiceModal(true);
  };

  // UPH-1.21: Fetch customers list
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        setCustomers([]);
        return;
      }

      // Reset offset to 0 when changing sort order
      const offset = 0;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/bookings/visits/customers?limit=${customerPagination.limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.data) {
        let customersList = data.data.customers || [];
        
        // Sort by total_visits in frontend since backend doesn't support sort parameter
        if (sortOrder === 'asc') {
          customersList.sort((a, b) => a.total_visits - b.total_visits);
        } else {
          customersList.sort((a, b) => b.total_visits - a.total_visits);
        }
        
        setCustomers(customersList);
        setCustomerPagination({
          limit: data.data.limit || 20,
          offset: data.data.offset || 0,
          total_records: data.data.summary?.total_records || 0,
          has_more: data.data.has_more || false
        });
      } else {
        console.error('Failed to fetch customers:', data.message);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  // UPH-1.21: Fetch next page of customers
  const handleCustomersPagination = async (direction) => {
    const newOffset = direction === 'next' 
      ? customerPagination.offset + customerPagination.limit
      : Math.max(0, customerPagination.offset - customerPagination.limit);
    
    if (newOffset < 0) return;
    
    try {
      setCustomersLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/bookings/visits/customers?limit=${customerPagination.limit}&offset=${newOffset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.data) {
        let customersList = data.data.customers || [];
        
        // Sort by total_visits
        if (sortOrder === 'asc') {
          customersList.sort((a, b) => a.total_visits - b.total_visits);
        } else {
          customersList.sort((a, b) => b.total_visits - a.total_visits);
        }
        
        setCustomers(customersList);
        setCustomerPagination({
          limit: data.data.limit || 20,
          offset: data.data.offset || 0,
          total_records: data.data.summary?.total_records || 0,
          has_more: data.data.has_more || false
        });
      }
    } catch (err) {
      console.error('Failed to fetch customers page:', err);
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  };

  // UPH-1.21: Toggle sort order and refetch
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    // The useEffect will trigger fetchCustomers when sortOrder changes
  };

  // UPH-1.21: Open customer visit history modal
  const openCustomerVisitModal = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerVisitModal(true);
    
    // Reset pagination for visits
    setVisitsPagination({
      limit: 20,
      offset: 0,
      total_records: 0,
      has_more: false
    });
    
    // Fetch visits immediately
    await fetchCustomerVisitHistory(customer.user_id, 0);
  };

  // UPH-1.21: Fetch individual customer visit history
  const fetchCustomerVisitHistory = async (customerId, offset = 0) => {
    try {
      setVisitsLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/bookings/visits/customers/${customerId}?limit=20&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.data) {
        setCustomerVisits(data.data.visits || []);
        setVisitsPagination({
          limit: data.data.limit || 20,
          offset: data.data.offset || 0,
          total_records: data.data.summary?.total_records || 0,
          has_more: data.data.has_more || false
        });
      } else {
        console.error('Failed to fetch customer visits:', data.message);
        setCustomerVisits([]);
      }
    } catch (err) {
      console.error('Failed to fetch customer visits:', err);
      setCustomerVisits([]);
      toast.error('Failed to load visit history');
    } finally {
      setVisitsLoading(false);
    }
  };

  // UPH-1.21: Handle visit history pagination
  const handleVisitsPagination = (direction) => {
    const newOffset = direction === 'next' 
      ? visitsPagination.offset + visitsPagination.limit
      : Math.max(0, visitsPagination.offset - visitsPagination.limit);
    
    if (selectedCustomer) {
      fetchCustomerVisitHistory(selectedCustomer.user_id, newOffset);
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
    // For week view, navigate by weeks using independent weekStartDate
    if (viewType === 'week') {
      // Calculate start of current week (Sunday)
    const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
      currentWeekStart.setHours(0, 0, 0, 0);
      
      // Calculate next week start
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);
      nextWeekStart.setHours(0, 0, 0, 0);
      
      const newWeekStart = new Date(weekStartDate);
      newWeekStart.setDate(weekStartDate.getDate() + (direction * 7));
      newWeekStart.setHours(0, 0, 0, 0);
      
      // Only allow navigation to current week or next week
      // Can't go before current week
      if (newWeekStart.getTime() < currentWeekStart.getTime()) {
        return; // Don't navigate to past weeks
      }
      
      // Can't go beyond next week
      if (newWeekStart.getTime() > nextWeekStart.getTime()) {
        return; // Don't navigate beyond next week
      }
      
      // Only allow going to next week if it has data
      if (newWeekStart.getTime() === nextWeekStart.getTime()) {
        if (!canNavigateNext()) {
          return; // Next week doesn't have data, don't navigate
        }
      }
      
      setWeekStartDate(newWeekStart);
      return;
    }
    
    // For day view, navigate by single days
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    newDate.setHours(0, 0, 0, 0);
    
    // For day view, only allow navigation within the 7-day availability window (today through today + 6 days)
    const rangeStart = scheduleDateRange.start ? new Date(scheduleDateRange.start) : null;
    const rangeEnd = scheduleDateRange.end ? new Date(scheduleDateRange.end) : null;
    
    // Fallback: calculate 7-day window if range not set yet (today + 7 days = 8 days total)
    if (!rangeStart || !rangeEnd) {
    const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // Updated to match booking page
      endDate.setHours(23, 59, 59, 999); // Include end of day
      
      // Compare dates using timestamp
      if (newDate.getTime() >= today.getTime() && newDate.getTime() <= endDate.getTime()) {
        setSelectedDate(newDate);
      }
      return;
    }
    
    // Normalize range dates for comparison
    const rangeStartNormalized = new Date(rangeStart);
    rangeStartNormalized.setHours(0, 0, 0, 0);
    const rangeEndNormalized = new Date(rangeEnd);
    rangeEndNormalized.setHours(23, 59, 59, 999); // Include end of day
    
    // Check if the new date is within the 7-day window
    if (newDate.getTime() >= rangeStartNormalized.getTime() && newDate.getTime() <= rangeEndNormalized.getTime()) {
      setSelectedDate(newDate);
    }
  };

  const canNavigatePrevious = () => {
    // For week view, only allow navigation to current week (can't go to past weeks)
    if (viewType === 'week') {
      // Calculate start of current week (Sunday)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
      currentWeekStart.setHours(0, 0, 0, 0);
      
      // Only allow going back if we're not already on the current week
      return weekStartDate.getTime() > currentWeekStart.getTime();
    }
    
    // For day view, check against the 7-day window
    const rangeStart = scheduleDateRange.start ? new Date(scheduleDateRange.start) : null;
    if (!rangeStart) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateNormalized = new Date(selectedDate);
      selectedDateNormalized.setHours(0, 0, 0, 0);
      return selectedDateNormalized.getTime() > today.getTime();
    }
    const selectedDateNormalized = new Date(selectedDate);
    selectedDateNormalized.setHours(0, 0, 0, 0);
    const rangeStartNormalized = new Date(rangeStart);
    rangeStartNormalized.setHours(0, 0, 0, 0);
    return selectedDateNormalized.getTime() > rangeStartNormalized.getTime();
  };

  const canNavigateNext = () => {
    // For week view, only allow navigation to next week if it has data AND we're currently on this week
    if (viewType === 'week') {
      // Calculate start of current week (Sunday)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
      currentWeekStart.setHours(0, 0, 0, 0);
      
      // Only allow going forward if we're on the current week (not already on next week)
      const isCurrentWeek = weekStartDate.getTime() === currentWeekStart.getTime();
      if (!isCurrentWeek) {
        // Already on next week, can't go further
        return false;
      }
      
      // Calculate next week start date
      const nextWeekStart = new Date(weekStartDate);
      nextWeekStart.setDate(weekStartDate.getDate() + 7);
      nextWeekStart.setHours(0, 0, 0, 0);
      
      // Check if backend schedule has data for the next week
      if (backendSchedule) {
        // Helper function to format date as MM-DD-YYYY
        const formatDateForCheck = (date) => {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}-${day}-${year}`;
        };
        
        // Check next week (7 days) for any data
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(nextWeekStart);
          checkDate.setDate(nextWeekStart.getDate() + i);
          const dateKey = formatDateForCheck(checkDate);
          
          if (backendSchedule[dateKey]) {
            // If date has availability or bookings, allow navigation
            const dayData = backendSchedule[dateKey];
            if (dayData.availability || (dayData.bookings && dayData.bookings.length > 0)) {
              return true;
            }
          }
        }
      }
      
      // If backend schedule doesn't have next week data yet, allow navigation anyway
      // (The data will be fetched when we navigate, and fetchScheduleData will include both weeks)
      // This handles the case where we're on current week and next week data hasn't been fetched yet
      return true;
    }
    
    // For day view, check against the 8-day window (today + 7 days)
    const rangeEnd = scheduleDateRange.end ? new Date(scheduleDateRange.end) : null;
    if (!rangeEnd) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // Updated to match booking page
      endDate.setHours(23, 59, 59, 999);
      const selectedDateNormalized = new Date(selectedDate);
      selectedDateNormalized.setHours(0, 0, 0, 0);
      return selectedDateNormalized.getTime() < endDate.getTime();
    }
    const selectedDateNormalized = new Date(selectedDate);
    selectedDateNormalized.setHours(0, 0, 0, 0);
    const rangeEndNormalized = new Date(rangeEnd);
    rangeEndNormalized.setHours(23, 59, 59, 999);
    return selectedDateNormalized.getTime() < rangeEndNormalized.getTime();
  };

  // Cancelled appointments date navigation
  const navigateCancelledDate = (direction) => {
    const newDate = new Date(cancelledDate);
    newDate.setDate(cancelledDate.getDate() + direction);
    setCancelledDate(newDate);
  };

  const formatCancelledDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCancelledAppointmentsForDate = (date) => {
    console.log('Getting cancelled appointments for date:', date.toDateString());
    console.log('All schedule data:', scheduleData);
    console.log('All cancelled appointments:', scheduleData.filter(apt => apt.status === 'canceled'));
    
    const cancelledForDate = scheduleData.filter(apt => 
      apt.status === 'canceled' && 
      apt.date && 
      apt.date.toDateString() === date.toDateString()
    );
    
    console.log('Cancelled appointments for this date:', cancelledForDate);
    return cancelledForDate;
  };

  // getCurrentWeekDays function removed - no longer needed

  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0; // Return 0 if timeStr is null/undefined
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getBackendDaySchedule = (day, weeklySchedule) => {
    if (!weeklySchedule || !day) return null; // Return null if data is missing
    
    // Format date as MM-DD-YYYY to match backend date keys
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const year = day.getFullYear();
    const dateKey = `${month}-${dayOfMonth}-${year}`;
    
    console.log(`Getting schedule for date ${dateKey}:`, weeklySchedule[dateKey]);
    return weeklySchedule ? weeklySchedule[dateKey] : null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '!bg-purple-200 !text-purple-800 border-purple-200';
      case 'pending': return '!bg-yellow-200 !text-yellow-800 border-yellow-200';
      case 'canceled': return '!bg-red-200 !text-red-800 border-red-200';
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
    // Use weekStartDate for week view, independent of selectedDate (day view)
    const startOfWeek = new Date(viewType === 'week' ? weekStartDate : selectedDate);
    if (viewType === 'day') {
      // For day view calculations, still calculate from selectedDate
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    }
    startOfWeek.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatWeekRange = () => {
    const weekDays = getWeekDays();
    const startDay = weekDays[0];
    const endDay = weekDays[6];
    
    // Check if the week spans two different months
    if (startDay.getMonth() === endDay.getMonth()) {
      // Same month - only show month on start date
      return `${startDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDay.toLocaleDateString('en-US', { day: 'numeric' })}`;
    } else {
      // Different months - show month on both dates
      return `${startDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }
  };

  // Month view removed - only showing current week

  const tabs = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'services', label: 'Services' },
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
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer hover:opacity-80 transition-opacity" 
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
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer hover:opacity-80 transition-opacity" 
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
          {activeTab === 'schedule' && (
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
                <Button 
                  onClick={() => {
                    setShowCancelledTab(true);
                    setCancelledDate(new Date());
                  }} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>View Cancelled</span>
                </Button>
              </div>
              
              {/* View Settings */}
              <div className="bg-white rounded-lg border p-2 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <div className="flex space-x-1">
                  <Button
                    variant={viewType === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      // Reset to today when switching to day view
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      setSelectedDate(today);
                      setViewType('day');
                    }}
                    className="px-3 py-1 text-xs"
                  >
                    Day
                  </Button>
                  <Button
                    variant={viewType === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      // Reset to current week (start of week = Sunday) when switching to week view
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
                      startOfWeek.setHours(0, 0, 0, 0);
                      setWeekStartDate(startOfWeek);
                      setViewType('week');
                    }}
                    className="px-3 py-1 text-xs"
                  >
                    Week
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                    <span>Previous Week</span>
                  </Button>

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      Week of {formatWeekRange()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your weekly schedule
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
                    <span>Next Week</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
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
                      <div className="w-6 h-6 bg-gray-500 opacity-60 rounded"></div>
                      <span className="text-sm text-foreground">Unavailable</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-red-400 opacity-40 rounded"></div>
                      <span className="text-sm text-foreground">Booked</span>
                    </div>
                  </div>
                  
                  {/* Separator */}
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                                                                           <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-foreground">Bookings:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-purple-200 border-l-4 border-purple-500 rounded"></div>
                        <span className="text-sm text-foreground">Completed</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow-200 border-l-4 border-yellow-500 rounded"></div>
                        <span className="text-sm text-foreground">Scheduled</span>
                      </div>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full px-4 sm:px-0">
                    <div className="grid grid-cols-[80px_repeat(7,minmax(120px,1fr))] min-w-[920px]">
                      {/* Time column header */}
                      <div className="text-center text-sm font-medium text-muted-foreground py-2" style={{ borderRight: '2px solid rgba(0, 0, 0, 0.3)' }}>
                        Time
                      </div>
                      
                      {/* Day headers */}
                      {getWeekDays().map((day, index) => (
                        <div key={index} className="text-center text-sm font-medium text-muted-foreground py-2" style={{ borderRight: '2px solid rgba(0, 0, 0, 0.3)' }}>
                          <div className="font-semibold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-lg">{day.getDate()}</div>
                        </div>
                      ))}
                    </div>
                 
                    {/* Time grid */}
                    <div className="grid grid-cols-[80px_repeat(7,minmax(120px,1fr))] relative min-w-[920px]" style={{ borderTop: '2px solid rgba(0, 0, 0, 0.3)' }}>
                   {/* Time labels */}
                   <div className="col-span-1" style={{ borderRight: '2px solid rgba(0, 0, 0, 0.3)' }}>
                     {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
                       <div key={hour} className="h-12 flex items-start justify-end pr-2 text-xs text-muted-foreground" style={{ borderBottom: '1px dashed rgba(0, 0, 0, 0.2)' }}>
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
                       <div key={dayIndex} className="col-span-1 relative" style={{ borderRight: '2px solid rgba(0, 0, 0, 0.3)' }}>
                         {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
                           <div key={hour} className="h-12" style={{ borderBottom: '1px dashed rgba(0, 0, 0, 0.2)' }}></div>
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
                        
                        {/* Unavailability highlights - Gray background */}
                        {unavailabilities && unavailabilities.length > 0 && unavailabilities.map((unavail, unavailIndex) => (
                          unavail && unavail.start_time && unavail.end_time && (
                            <div
                              key={unavailIndex}
                              className="absolute left-0 right-0 bg-gray-500 opacity-60 rounded-sm"
                              style={{
                                top: `${minutesToPixels(convertTimeToMinutes(unavail.start_time) - 8 * 60)}px`,
                                height: `${minutesToPixels(convertTimeToMinutes(unavail.end_time) - convertTimeToMinutes(unavail.start_time))}px`
                              }}
                            />
                          )
                        ))}
                        
                        {/* Booked appointment backgrounds - Red background behind appointments */}
                        {scheduleData
                          .filter(apt => apt.date && apt.date.toDateString() === day.toDateString() && apt.status !== 'canceled')
                          .map((appointment) => {
                            const startMinutes = timeToMinutes(appointment.startTime);
                            const endMinutes = timeToMinutes(appointment.endTime);
                            const top = minutesToPixels(startMinutes - 8 * 60);
                            const height = minutesToPixels(endMinutes - startMinutes);
                            
                            return (
                              <div
                                key={`bg-${appointment.id}`}
                                className="absolute left-0 right-0 bg-red-400 opacity-40 rounded-sm"
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  zIndex: 1
                                }}
                              />
                            );
                          })}
                        
                        {/* Appointments for this day (excluding cancelled) */}
                        {scheduleData
                          .filter(apt => apt.date && apt.date.toDateString() === day.toDateString() && apt.status !== 'canceled')
                          .map((appointment) => {
                            const startMinutes = timeToMinutes(appointment.startTime);
                            const endMinutes = timeToMinutes(appointment.endTime);
                            const top = minutesToPixels(startMinutes - 8 * 60); // 8 AM start
                            const height = minutesToPixels(endMinutes - startMinutes);
                            
                            return (
                              <div
                                key={appointment.id}
                                className={`absolute left-1 right-1 p-2 rounded-lg text-xs border-2 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 ${getStatusColor(appointment.status)}`}
                                style={{ 
                                  top: `${top}px`, 
                                  height: `${height}px`,
                                  zIndex: 2,
                                  borderColor: appointment.status === 'completed' ? '#9333ea' : 
                                             appointment.status === 'pending' ? '#ca8a04' : '#dc2626',
                                  backgroundColor: appointment.status === 'completed' ? '#f3e8ff' : 
                                                 appointment.status === 'pending' ? '#fef3c7' : '#fef2f2'
                                }}
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowAppointmentPopup(true);
                                }}
                              >
                                <div className="flex flex-col justify-center h-full">
                                  <div className="text-center">
                                    <span className="font-bold text-xs leading-tight block">{appointment.startTime} - {appointment.endTime}</span>
                                    {height > 40 && (
                                      <div className="mt-1">
                                        <div className="text-xs font-medium truncate">{appointment.customer}</div>
                                        {height > 60 && (
                                          <div className="text-xs opacity-75 truncate">{appointment.service}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (() => {
              // Filter appointments for selected date, excluding cancelled ones
              const dayAppointments = scheduleData.filter(apt => {
                if (viewType !== 'day') return true;
                const aptDate = apt.date ? new Date(apt.date) : null;
                const selected = new Date(selectedDate);
                if (!aptDate) return false;
                return aptDate.toDateString() === selected.toDateString() && apt.status !== 'canceled';
              });
              
              return dayAppointments.length === 0 ? (
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
                        <p className="text-2xl font-bold text-foreground">{dayAppointments.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Completed</p>
                        <p className="text-2xl font-bold text-foreground">
                          {dayAppointments.filter(apt => apt.status === 'completed').length}
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
                          {dayAppointments.filter(apt => apt.status === 'pending').length}
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
                        <p className="text-sm font-medium text-foreground">Canceled</p>
                        <p className="text-2xl font-bold text-foreground">
                          {dayAppointments.filter(apt => apt.status === 'canceled').length}
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
                    {dayAppointments
                      .map((appointment) => (
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
                                {appointment.service}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                                <span>Duration: <span className="text-blue-600 font-medium">{appointment.duration} minutes</span></span>
                                {appointment.totalPrice > 0 && (
                                  <span>Total: <span className="text-green-800 font-medium">${appointment.totalPrice.toFixed(2)}</span></span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {appointment.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-4 h-4" />
                                    <span>{appointment.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowAppointmentPopup(true);
                                }}
                            >
                                View Details
                            </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Customer Visits</h2>
                <p className="text-muted-foreground">View your customers' visit history</p>
              </div>
                            <Button 
                onClick={toggleSortOrder}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>Sort: {sortOrder === 'desc' ? 'Most Frequent' : 'Least Frequent'}</span>
                            </Button>
            </div>

            {customersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading customers...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No customers yet</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't had any completed appointments yet.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {customers.map((customer) => (
                    <Card key={customer.user_id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {customer.full_name}
                            </h3>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Email:</span> {customer.email}
                              </p>
                              {customer.phone && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Phone:</span> {customer.phone}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-600">
                                    {customer.total_visits} visit{customer.total_visits !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {customer.last_visit && (
                                  <span className="text-xs text-muted-foreground">
                                    Last visit: {new Date(customer.last_visit).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        <Button 
                            onClick={() => openCustomerVisitModal(customer)}
                          variant="outline" 
                            className="flex items-center space-x-2"
                        >
                            <Eye className="w-4 h-4" />
                            <span>View History</span>
                        </Button>
                      </div>
              </CardContent>
            </Card>
                  ))}
                </div>

                {/* Pagination Controls */}
                {customerPagination.total_records > customerPagination.limit && (
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {Math.min(customerPagination.offset + 1, customerPagination.total_records)} -{' '}
                      {Math.min(customerPagination.offset + customerPagination.limit, customerPagination.total_records)} of{' '}
                      {customerPagination.total_records} customers
                  </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleCustomersPagination('prev')}
                        disabled={customersLoading || customerPagination.offset === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleCustomersPagination('next')}
                        disabled={customersLoading || !customerPagination.has_more}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                        </div>
                  </div>
                )}
              </>
            )}
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

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Services</h2>
                <p className="text-muted-foreground">Manage the services you offer</p>
                        </div>
              <Button onClick={() => setShowServiceModal(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </Button>
                      </div>

            {servicesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <ScissorsIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No services yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add services that you offer to help customers book with you.
                </p>
                <Button onClick={() => setShowServiceModal(true)} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Service</span>
                </Button>
              </div>
            ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {services.map((service) => (
                   <Card key={service.service_id} className="hover:shadow-lg transition-shadow">
                     <CardContent className="p-6 pt-5">
                                             <div className="flex justify-between items-start mb-4">
                         <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                         <div className="flex space-x-2">
                        <Button 
                             variant="ghost"
                          size="sm"
                             onClick={() => openEditModal(service)}
                             className="h-10 w-10 p-0"
                        >
                             <Edit className="w-6 h-6" />
                        </Button>
                        <Button 
                             variant="ghost"
                          size="sm"
                             onClick={() => openDeleteModal(service)}
                             className="h-10 w-10 p-0 text-red-600 hover:text-red-700"
                        >
                             <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-blue-600 font-medium">{service.duration_minutes} min</span>
                        </div>
                        <div className="text-lg font-semibold text-green-800">
                          ${typeof service.price === 'number' ? service.price.toFixed(2) : parseFloat(service.price || 0).toFixed(2)}
                        </div>
                      </div>
              </CardContent>
            </Card>
                ))}
                  </div>
            )}
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

      {/* BS-1.01: Create Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-2xl">
            <CardContent className="pt-8 px-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-primary/10 p-3 rounded-lg">
                  <Plus className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Add Service</h3>
                  </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowServiceModal(false);
                    setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                        <div>
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    placeholder="e.g., Haircut"
                  />
                          </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    placeholder="Describe your service..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                        </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={serviceFormData.duration_minutes}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: e.target.value })}
                      placeholder="30"
                    />
                      </div>
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={serviceFormData.price}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                      placeholder="35.00"
                    />
                    </div>
                </div>
              </div>

              <div className="flex space-x-3 justify-end">
                        <Button 
                          variant="outline" 
                  onClick={() => {
                    setShowServiceModal(false);
                    setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
                  }}
                  disabled={serviceLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateService} disabled={serviceLoading}>
                  {serviceLoading ? 'Creating...' : 'Create Service'}
                </Button>
              </div>
              </CardContent>
            </Card>
        </div>
      )}

      {/* BS-1.01: Edit Service Modal */}
      {showEditServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-2xl">
            <CardContent className="pt-8 px-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-primary/10 p-3 rounded-lg">
                  <Edit className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Edit Service</h3>
                    </div>
                <Button
                  variant="ghost"
                          size="sm"
                  onClick={() => {
                    setShowEditServiceModal(false);
                    setEditingService(null);
                    setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                        </Button>
                      </div>

              <div className="space-y-4 mb-6">
                    <div>
                  <Label htmlFor="edit-name">Service Name</Label>
                  <Input
                    id="edit-name"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                  />
                    </div>
                    <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <textarea
                    id="edit-description"
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                    </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="edit-duration">Duration (minutes)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      value={serviceFormData.duration_minutes}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: e.target.value })}
                    />
                    </div>
                    <div>
                    <Label htmlFor="edit-price">Price ($)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={serviceFormData.price}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                    />
                    </div>
                  </div>
                </div>

              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditServiceModal(false);
                    setEditingService(null);
                    setServiceFormData({ name: '', description: '', duration_minutes: '', price: '' });
                  }}
                  disabled={serviceLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateService} disabled={serviceLoading}>
                  {serviceLoading ? 'Updating...' : 'Update Service'}
                </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      )}

      {/* BS-1.01: Delete Service Confirmation Modal */}
      {showDeleteServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-2xl">
            <CardContent className="pt-8 px-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-red-50 p-3 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Delete Service</h3>
                  </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteServiceModal(false);
                    setDeletingService(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
                    </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the service <span className="font-semibold">"{deletingService?.name}"</span>? This action cannot be undone.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    This will permanently remove the service from your list.
                  </p>
                  </div>
                    </div>

              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteServiceModal(false);
                    setDeletingService(null);
                  }}
                  disabled={serviceLoading}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteService}
                  disabled={serviceLoading}
                  className="px-6 py-2 text-white font-medium bg-red-600 hover:bg-red-700"
                >
                  {serviceLoading ? 'Deleting...' : 'Delete Service'}
                </Button>
                  </div>
              </CardContent>
            </Card>
        </div>
      )}

      {/* Appointment Details Popup Modal */}
      {showAppointmentPopup && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto shadow-2xl">
            <CardContent className="pt-8 px-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAppointmentPopup(false);
                    setSelectedAppointment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </span>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {selectedAppointment.status}
                      </Badge>
                    </div>
                
                    <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {selectedAppointment.customer}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedAppointment.service}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <span>Duration: <span className="text-blue-600 font-medium">{selectedAppointment.duration} minutes</span></span>
                    {selectedAppointment.totalPrice > 0 && (
                      <span>Total: <span className="text-green-800 font-medium">${selectedAppointment.totalPrice.toFixed(2)}</span></span>
                    )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Date: {selectedAppointment.date ? selectedAppointment.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'No date'}
                    </p>
                  </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {selectedAppointment.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{selectedAppointment.phone}</span>
                  </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => {
                    setShowAppointmentPopup(false);
                    setSelectedAppointment(null);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      )}

      {/* Cancelled Appointments Modal - Show All Cancelled */}
      {showCancelledTab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-red-500" />
                        <div>
                    <h3 className="text-lg font-semibold text-gray-900">All Cancelled Appointments</h3>
                    <p className="text-sm text-gray-600">
                      {scheduleData.filter(apt => apt.status === 'canceled').length} cancelled appointment(s)
                    </p>
                          </div>
                        </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelledTab(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
                  </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {(() => {
                  const allCancelledAppointments = scheduleData.filter(apt => apt.status === 'canceled');
                  
                  return allCancelledAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No cancelled appointments</h3>
                      <p className="text-sm text-muted-foreground">
                        You have no cancelled appointments.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allCancelledAppointments
                        .sort((a, b) => {
                          const dateA = a.date ? new Date(a.date) : new Date(0);
                          const dateB = b.date ? new Date(b.date) : new Date(0);
                          if (dateA.getTime() === dateB.getTime()) {
                            // Sort by time if same date
                            const timeA = timeToMinutes(a.startTime);
                            const timeB = timeToMinutes(b.startTime);
                            return timeA - timeB;
                          }
                          return dateB - dateA; // Most recent first
                        })
                        .map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-4 bg-red-50 border-red-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{appointment.startTime} - {appointment.endTime}</span>
                  </div>
                                  <Badge className="bg-red-200 text-red-800 border-red-200">
                                    Cancelled
                                  </Badge>
                        <span className="text-sm text-muted-foreground">
                                    {appointment.date ? appointment.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'No date'}
                        </span>
                      </div>
                                
                                <h4 className="font-semibold text-foreground mb-1">
                                  {appointment.customer}
                                </h4>
                                
                                <p className="text-sm text-muted-foreground mb-2">
                                  {appointment.service}
                                </p>
                                
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                                  <span>Duration: <span className="text-blue-600 font-medium">{appointment.duration} minutes</span></span>
                                  {appointment.totalPrice > 0 && (
                                    <span>Total: <span className="text-green-800 font-medium">${appointment.totalPrice.toFixed(2)}</span></span>
                                  )}
                    </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  {appointment.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-4 h-4" />
                                      <span>{appointment.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end p-6 border-t">
                <Button 
                  onClick={() => setShowCancelledTab(false)}
                  variant="outline"
                >
                  Close
                </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      )}

      {/* UPH-1.21: Customer Visit History Modal */}
      {showCustomerVisitModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-blue-500" />
                    <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.full_name}'s Visit History</h3>
                    <p className="text-sm text-gray-600">
                      {visitsPagination.total_records} visit{visitsPagination.total_records !== 1 ? 's' : ''}
                    </p>
                    </div>
                    </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomerVisitModal(false);
                    setSelectedCustomer(null);
                    setCustomerVisits([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
                    </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {visitsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading visits...</p>
                  </div>
                ) : customerVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No visits found</h3>
                    <p className="text-sm text-muted-foreground">
                      This customer has no completed visits yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerVisits.map((visit) => (
                      <Card key={visit.booking_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {new Date(visit.scheduled_start).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                    </div>
                            <Badge className="bg-purple-200 text-purple-800 border-purple-200">
                              Completed
                      </Badge>
                    </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(visit.scheduled_start).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })} - {new Date(visit.scheduled_end).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                            {visit.notes && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Notes:</span> {visit.notes}
                              </p>
                            )}
                          </div>

                          {visit.services && visit.services.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="font-semibold text-sm text-foreground mb-2">Services:</h4>
                              <div className="space-y-2">
                                {visit.services.map((service, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <div>
                                      <span className="font-medium text-foreground">{service.service_name}</span>
                                      {service.employee && (
                                        <p className="text-xs text-muted-foreground">
                                          By: {service.employee.name}
                                          {service.employee.title && ` (${service.employee.title})`}
                                        </p>
                                      )}
                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-green-800">${typeof service.price === 'number' ? service.price.toFixed(2) : parseFloat(service.price || 0).toFixed(2)}</div>
                                      <div className="text-xs text-blue-600">{service.duration_minutes} min</div>
                  </div>
                </div>
                                ))}
                              </div>
                              <div className="flex justify-end mt-3 pt-3 border-t">
                                <div className="text-lg font-semibold text-green-800">
                                  Total: ${typeof visit.total_price === 'number' ? visit.total_price.toFixed(2) : parseFloat(visit.total_price || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          )}
              </CardContent>
            </Card>
                    ))}
                  </div>
                )}
                    </div>

              {/* Pagination Controls for Visits */}
              {visitsPagination.total_records > visitsPagination.limit && (
                <div className="flex justify-between items-center p-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(visitsPagination.offset + 1, visitsPagination.total_records)} -{' '}
                    {Math.min(visitsPagination.offset + visitsPagination.limit, visitsPagination.total_records)} of{' '}
                    {visitsPagination.total_records} visits
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleVisitsPagination('prev')}
                      disabled={visitsLoading || visitsPagination.offset === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleVisitsPagination('next')}
                      disabled={visitsLoading || !visitsPagination.has_more}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    </div>
                  </div>
              )}
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
