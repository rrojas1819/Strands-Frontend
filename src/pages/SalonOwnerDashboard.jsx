import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SalonRegistrationForm from '../components/SalonRegistrationForm';
import LoyaltyConfiguration from '../components/LoyaltyConfiguration';
import PromotionsManagement from '../components/PromotionsManagement';
import OperatingHours from '../components/OperatingHours';
import EmployeeHoursModal from '../components/EmployeeHoursModal';
import ProductManagement from '../components/ProductManagement';
import SalonReviews from '../components/SalonReviews';
import StaffReviews from '../components/StaffReviews';
import OwnerNavbar from '../components/OwnerNavbar';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Building2,
  Users, 
  ShoppingBag,
  Gift,
  History,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  Plus,
  X,
  UserX,
  Clock,
  Calendar,
  Image,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  DollarSign,
  TrendingUp,
  Scissors,
  Award,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import StrandsModal from '../components/ui/strands-modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';


export default function SalonOwnerDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [hasSalon, setHasSalon] = useState(false);
  const [salonStatus, setSalonStatus] = useState(null);
  const [isCheckingSalon, setIsCheckingSalon] = useState(true); // Loading state to prevent flash
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewsSubTab, setReviewsSubTab] = useState(() => {
    const saved = localStorage.getItem('reviewsSubTab');
    return saved === 'salon' || saved === 'staff' ? saved : 'salon';
  });
  const [loyaltySubTab, setLoyaltySubTab] = useState(() => {
    const saved = localStorage.getItem('loyaltySubTab');
    return saved === 'promotions' || saved === 'loyalty-config' ? saved : 'loyalty-config';
  });
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 0,
    total_employees: 0,
    limit: 10,
    offset: 0,
    has_next_page: false,
    has_prev_page: false
  });
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const formatStatusLabel = (status = '') => {
    if (!status) return '';
    const normalized = status.toString().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getStatusBadgeClass = (status = '') => {
    const normalized = status.toString().toLowerCase();
    switch (normalized) {
      case 'completed':
      case 'confirmed':
        return 'bg-purple-200 text-purple-800 border-purple-200';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-200 text-yellow-800 border-yellow-200';
      case 'canceled':
      case 'cancelled':
        return 'bg-red-200 text-red-800 border-red-200';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-200';
    }
  };
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    title: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [showFireModal, setShowFireModal] = useState(false);
  const [employeeToFire, setEmployeeToFire] = useState(null);
  const [showEmployeeHoursModal, setShowEmployeeHoursModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salonInfo, setSalonInfo] = useState(null);
  const [salonInfoLoading, setSalonInfoLoading] = useState(false);
  
  // UPH-1.2: Customer visit history state
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerPagination, setCustomerPagination] = useState({
    limit: 20,
    offset: 0,
    total_records: 0,
    has_more: false
  });
  const [sortOrder, setSortOrder] = useState('desc');
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalState, setPhotoModalState] = useState({
    bookingId: null,
    beforePhotoUrl: null,
    afterPhotoUrl: null
  });
  const [bookingPhotos, setBookingPhotos] = useState({}); // Map of booking_id -> { hasPhotos: boolean }
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [showStylistBreakdownModal, setShowStylistBreakdownModal] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState(null);

  useEffect(() => {
    // Determine active tab from route path
    const path = location.pathname;
    let tabFromRoute = 'overview';
    
    if (path === '/owner/overview' || path === '/dashboard') {
      tabFromRoute = 'overview';
    } else if (path === '/owner/staff') {
      tabFromRoute = 'staff-services';
    } else if (path === '/owner/products') {
      tabFromRoute = 'products';
    } else if (path === '/owner/customers') {
      tabFromRoute = 'customers';
    } else if (path === '/owner/reviews') {
      tabFromRoute = 'reviews';
    } else if (path === '/owner/revenue') {
      tabFromRoute = 'revenue';
    } else if (path === '/owner/loyalty') {
      tabFromRoute = 'loyalty';
    } else if (path === '/owner/settings') {
      tabFromRoute = 'settings';
    }
    
    setActiveTab(tabFromRoute);
    
    // Restore reviews sub-tab from localStorage when navigating to reviews tab
    if (tabFromRoute === 'reviews') {
      const saved = localStorage.getItem('reviewsSubTab');
      if (saved === 'salon' || saved === 'staff') {
        setReviewsSubTab(saved);
      }
    }
    
    // Restore loyalty sub-tab from localStorage when navigating to loyalty tab
    if (tabFromRoute === 'loyalty') {
      const saved = localStorage.getItem('loyaltySubTab');
      if (saved === 'promotions' || saved === 'loyalty-config') {
        setLoyaltySubTab(saved);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkSalonStatus = async () => {
      setIsCheckingSalon(true);
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setHasSalon(false);
          setSalonStatus(null);
          setIsCheckingSalon(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/check`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Add cache control to prevent stale data
          cache: 'no-cache'
        });

        if (response.ok) {
          const data = await response.json();
          setHasSalon(data.hasSalon);
          setSalonStatus(data.status);
        } else {
          // If 404 or error, no salon exists
          setHasSalon(false);
          setSalonStatus(null);
        }
      } catch (error) {
        console.error('Error checking salon status:', error);
        setHasSalon(false);
        setSalonStatus(null);
      } finally {
        setIsCheckingSalon(false);
      }
    };

    if (authContext?.user?.user_id) {
      checkSalonStatus();
    } else {
      // If no user, don't show loading
      setIsCheckingSalon(false);
    }
  }, [authContext?.user?.user_id]);

  useEffect(() => {
    if (activeTab === 'staff-services' && salonStatus === 'APPROVED') {
      fetchEmployees(1);
    }
  }, [activeTab, salonStatus]);

  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'products' || activeTab === 'reviews' || activeTab === 'loyalty') && salonStatus === 'APPROVED') {
      fetchSalonInfo();
    }
  }, [activeTab, salonStatus]);

  useEffect(() => {
    if (activeTab === 'customers' && salonStatus === 'APPROVED') {
      fetchCustomers();
    }
  }, [activeTab, sortOrder, salonStatus]);

  useEffect(() => {
    if (activeTab === 'revenue' && salonStatus === 'APPROVED') {
      fetchRevenueMetrics();
    }
  }, [activeTab, salonStatus]);


  const fetchEmployees = async (page = 1) => {
    setEmployeesLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const userData = JSON.parse(localStorage.getItem('user_data'));
      
      const limit = 10;
      const offset = (page - 1) * limit;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/viewEmployees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: userData.salon_id,
          limit: limit,
          offset: offset
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setEmployees(data.data);
        setPagination(data.pagination);
      } else {
        setModalConfig({
          title: 'Error',
          message: data.message || 'Failed to fetch employees',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to fetch employees. Please try again.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchSalonInfo = async () => {
    setSalonInfoLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/information`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setSalonInfo(data.data);
      } else {
        console.error('Failed to fetch salon info:', data.message);
      }
    } catch (error) {
      console.error('Fetch salon info error:', error);
    } finally {
      setSalonInfoLoading(false);
    }
  };

  const formatTimeTo12Hour = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getShortDayName = (day) => {
    return day.substring(0, 3);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setIsAddingEmployee(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const userData = JSON.parse(localStorage.getItem('user_data'));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/addEmployee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: userData.salon_id,
          email: newEmployee.email,
          title: newEmployee.title
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setModalConfig({
          title: 'Success',
          message: 'Employee added successfully!',
          type: 'success',
          onConfirm: () => {
            setShowModal(false);
            setShowAddEmployeeModal(false);
            setNewEmployee({ email: '', title: '' });
            fetchEmployees(pagination.current_page);
          }
        });
        setShowModal(true);
      } else {
        setModalConfig({
          title: 'Error',
          message: data.message || 'Failed to add employee',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Add employee error:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to add employee. Please try again.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleFireEmployee = (employee) => {
    setEmployeeToFire(employee);
    setShowFireModal(true);
  };

  const handleSetEmployeeHours = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeHoursModal(true);
  };

  const confirmFireEmployee = async () => {
    if (!employeeToFire) return;

    // Store employee data before clearing state
    const employeeName = employeeToFire.full_name;
    const employeeEmail = employeeToFire.email;

    // Close the confirmation modal first
    setShowFireModal(false);
    setEmployeeToFire(null);

    try {
      const token = localStorage.getItem('auth_token');
      const userData = JSON.parse(localStorage.getItem('user_data'));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/removeEmployee`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: userData.salon_id,
          email: employeeEmail
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setModalConfig({
          title: 'Success',
          message: `${employeeName} has been removed from the salon.`,
          type: 'success',
          onConfirm: () => {
            setShowModal(false);
            fetchEmployees(pagination.current_page);
          }
        });
        setShowModal(true);
      } else {
        setModalConfig({
          title: 'Error',
          message: data.message || 'Failed to remove employee',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Fire employee error:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to remove employee. Please try again.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  const handleLogout = async () => {
    try {
      setModalConfig({
        title: 'Success',
        message: 'Signed out successfully',
        type: 'success',
        onConfirm: () => {
          setShowModal(false);
          authContext?.logout();
        }
      });
      setShowModal(true);
    } catch (error) {
      console.error('Logout error:', error);
      setModalConfig({
        title: 'Error',
        message: 'Error signing out',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  // UPH-1.2: Fetch customers list
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        setCustomers([]);
        return;
      }

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

  // UPH-1.2: Fetch next page of customers
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

  // UPH-1.2: Toggle sort order and refetch
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
  };


  // UPH-1.2: Open customer visit history modal
  const openCustomerVisitModal = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerVisitModal(true);
    
    setVisitsPagination({
      limit: 20,
      offset: 0,
      total_records: 0,
      has_more: false
    });
    
    await fetchCustomerVisitHistory(customer.user_id, 0);
  };

  // UPH-1.2: Fetch individual customer visit history
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
        const visits = data.data.visits || [];
        setCustomerVisits(visits);
        setVisitsPagination({
          limit: data.data.limit || 20,
          offset: data.data.offset || 0,
          total_records: data.data.summary?.total_records || 0,
          has_more: data.data.has_more || false
        });
        
        // Check for photos in all visits
        visits.forEach(visit => {
          if (visit.booking_id) {
            checkBookingPhotos(visit.booking_id);
          }
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

  const checkBookingPhotos = async (bookingId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Check if photos exist - use new API format
      const response = await fetch(
        `${apiUrl}/file/get-photo?booking_id=${bookingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      let hasPhotos = false;
      if (response.ok) {
        const data = await response.json();
        // Backend returns { before: "...", after: "..." } format
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
        hasPhotos = Boolean(beforeUrl || afterUrl);
      }
      
      setBookingPhotos((prev) => ({
        ...prev,
        [bookingId]: { hasPhotos }
      }));
    } catch (err) {
      setBookingPhotos((prev) => ({
        ...prev,
        [bookingId]: { hasPhotos: false }
      }));
    }
  };

  const handleViewPhotos = async (bookingId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // CHECK FIRST: Don't open modal until we confirm photos exist
      const response = await fetch(`${apiUrl}/file/get-photo?booking_id=${bookingId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Handle 204 (No Content) and 404 (Not Found) as "no photos"
      if (response.status === 204 || response.status === 404) {
        toast.error('Stylist has not uploaded any photos for this appointment.');
        return;
      }

      if (!response.ok) {
        toast.error('Failed to load photos. Please try again.');
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
        toast.error('Stylist has not uploaded any photos for this appointment.');
        return;
      }
      
      // Photos exist (at least one) - NOW open modal

      setPhotoModalState({
        bookingId,
        beforePhotoUrl: beforeUrl,
        afterPhotoUrl: afterUrl
      });
      setShowPhotoModal(true);
    } catch (err) {
      toast.error('Failed to load photos. Please try again.');
    }
  };

  // UPH-1.2: Handle visit history pagination
  const handleVisitsPagination = (direction) => {
    const newOffset = direction === 'next' 
      ? visitsPagination.offset + visitsPagination.limit
      : Math.max(0, visitsPagination.offset - visitsPagination.limit);
    
    if (selectedCustomer) {
      fetchCustomerVisitHistory(selectedCustomer.user_id, newOffset);
    }
  };

  const fetchRevenueMetrics = async () => {
    try {
      setRevenueLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setModalConfig({
          title: 'Error',
          message: 'No authentication token found',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/top-metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setRevenueData(data);
      } else {
        setModalConfig({
          title: 'Error',
          message: data.message || 'Failed to fetch revenue metrics',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error('Fetch revenue metrics error:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to fetch revenue metrics. Please try again.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    } finally {
      setRevenueLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <OwnerNavbar 
        salonStatus={salonStatus}
        handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show loading state while checking salon status - prevents flash of registration form */}
        {isCheckingSalon ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Welcome message only on overview tab - only show after loading completes */}
            {activeTab === 'overview' && (
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Welcome, {authContext?.user?.full_name}!
                </h2>
                <p className="text-muted-foreground">
                  {hasSalon 
                    ? 'Manage your salon business and grow your customer base.' 
                    : 'Register your salon to start accepting bookings and managing your business.'
                  }
                </p>
              </div>
            )}

            {/* Only show registration form if we've confirmed there's no salon */}
            {!hasSalon && <SalonRegistrationForm />}
            
            {hasSalon && salonStatus !== 'APPROVED' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-background border rounded-lg p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  salonStatus === 'APPROVED' ? 'bg-green-100' :
                  salonStatus === 'PENDING' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <Building2 className={`w-8 h-8 ${
                    salonStatus === 'APPROVED' ? 'text-green-600' :
                    salonStatus === 'PENDING' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
            </div>
          </div>
              
              <h3 className="text-2xl font-bold mb-2">
                {salonStatus === 'APPROVED' ? 'Salon Approved' :
                 salonStatus === 'PENDING' ? 'Pending Review' :
                 'Registration Rejected'}
              </h3>
              
              <p className="text-muted-foreground mb-6">
                {salonStatus === 'APPROVED' ? 'Your salon is live and accepting bookings! You can now manage your business through the dashboard.' :
                 salonStatus === 'PENDING' ? 'Your salon registration is under review. Please wait for approval before you can start accepting bookings.' :
                 'Your salon registration was rejected. Please contact support for further inquiries.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && hasSalon && salonStatus === 'APPROVED' && (
          <div className="bg-background border rounded-lg p-6">
            {salonInfo && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <h3 className="text-xl font-semibold mb-4">Salon Information</h3>
                    <div className="space-y-3">
                    <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{salonInfo.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{salonInfo.category}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium">{salonInfo.description || 'No description'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${salonInfo.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' : salonInfo.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                          {formatStatusLabel(salonInfo.status)}
                        </span>
                  </div>
                    </div>
                  </div>

                    <div>
                    <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {salonInfo.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{salonInfo.phone}</p>
                    </div>
                      )}
                      {salonInfo.email && (
                    <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{salonInfo.email}</p>
                    </div>
                      )}
                    <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {salonInfo.address || 'No address'}
                        </p>
                    </div>
                  </div>
                </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-4">Operating Hours</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(salonInfo.weekly_hours || {}).map(([day, hours]) => (
                      <div key={day} className="flex flex-col">
                        <p className="text-sm font-medium mb-2">{getShortDayName(day)}</p>
                        <p className={`text-sm ${hours.is_open ? 'text-muted-foreground' : 'text-red-500'}`}>
                          {hours.is_open 
                            ? `${formatTimeTo12Hour(hours.start_time)} - ${formatTimeTo12Hour(hours.end_time)}`
                            : 'Closed'
                          }
                    </p>
                  </div>
                    ))}
                        </div>
                          </div>
                        </div>
                        )}
                      </div>
        )}

        {activeTab === 'staff-services' && salonStatus === 'APPROVED' && (
          <div className="space-y-8">
            <div className="bg-background border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                  <div>
                  <h3 className="text-xl font-semibold">Staff Management</h3>
                  <p className="text-muted-foreground">
                    Manage your salon employees ({pagination.total_employees} total)
                  </p>
                  </div>
                <Button onClick={() => setShowAddEmployeeModal(true)}>
                  <Users className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              
              {employeesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {employees.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No employees added yet</p>
                        <p className="text-sm">Add your first stylist to get started</p>
                      </div>
                    ) : (
                      employees.map((employee) => (
                  <div key={employee.employee_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                              <AvatarImage src={employee.profile_picture_url} />
                        <AvatarFallback>
                                {employee.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                              <h4 className="font-medium">{employee.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">{employee.title}</Badge>
                                <Badge variant="outline" className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${employee.active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                          {employee.active ? 'Active' : 'Inactive'}
                        </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                              onClick={() => handleSetEmployeeHours(employee)}
                              className="hover:bg-blue-50 hover:border-blue-300"
                      >
                              Set Hours
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                              onClick={() => handleFireEmployee(employee)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                      >
                              Fire
                      </Button>
                    </div>
                  </div>
                      ))
                    )}
                  </div>
                  
                  {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {employees.length} of {pagination.total_employees} employees
                  </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                          onClick={() => fetchEmployees(pagination.current_page - 1)}
                          disabled={!pagination.has_prev_page}
                        >
                          Previous
                  </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <Button
                                key={pageNum}
                                variant={pagination.current_page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => fetchEmployees(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                      </Button>
                            );
                          })}
                </div>
                        
                      <Button 
                          variant="outline"
                        size="sm"
                          onClick={() => fetchEmployees(pagination.current_page + 1)}
                          disabled={!pagination.has_next_page}
                      >
                          Next
                      </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && salonStatus === 'APPROVED' && salonInfo && (
          <div className="bg-background border rounded-lg p-6">
            <ProductManagement
              salonId={salonInfo.salon_id}
              onSuccess={(message) => {
                setModalConfig({
                  title: 'Success',
                  message: message,
                  type: 'success',
                  onConfirm: () => setShowModal(false)
                });
                setShowModal(true);
              }}
              onError={(error) => {
                setModalConfig({
                  title: 'Error',
                  message: error,
                  type: 'error',
                  onConfirm: () => setShowModal(false)
                });
                setShowModal(true);
              }}
            />
          </div>
        )}

        {activeTab === 'customers' && salonStatus === 'APPROVED' && (
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

        {activeTab === 'reviews' && salonStatus === 'APPROVED' && (
          salonInfoLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : salonInfo?.salon_id ? (
            <div className="space-y-6">
              <div className="border-b border-muted">
                <div className="flex space-x-8">
                  <button
                    onClick={() => {
                      setReviewsSubTab('salon');
                      localStorage.setItem('reviewsSubTab', 'salon');
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      reviewsSubTab === 'salon'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    Salon Reviews
                  </button>
                  <button
                    onClick={() => {
                      setReviewsSubTab('staff');
                      localStorage.setItem('reviewsSubTab', 'staff');
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      reviewsSubTab === 'staff'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    Staff Reviews
                  </button>
                </div>
              </div>

              {reviewsSubTab === 'salon' && (
                <SalonReviews 
                  salonId={salonInfo.salon_id}
                  canReply={true}
                  onError={(error) => {
                    setModalConfig({
                      title: 'Error',
                      message: error,
                      type: 'error',
                      onConfirm: () => setShowModal(false)
                    });
                    setShowModal(true);
                  }}
                />
              )}

              {reviewsSubTab === 'staff' && (
                <StaffReviews
                  forOwner={true}
                  canReply={false}
                  onError={(error) => {
                    setModalConfig({
                      title: 'Error',
                      message: error,
                      type: 'error',
                      onConfirm: () => setShowModal(false)
                    });
                    setShowModal(true);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Unable to load salon information</p>
            </div>
          )
        )}

        {activeTab === 'loyalty' && salonStatus === 'APPROVED' && (
          <div className="space-y-6">
            <div className="border-b border-muted">
              <div className="flex space-x-8">
                <button
                  onClick={() => {
                    setLoyaltySubTab('loyalty-config');
                    localStorage.setItem('loyaltySubTab', 'loyalty-config');
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    loyaltySubTab === 'loyalty-config'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Loyalty Program
                </button>
                <button
                  onClick={() => {
                    setLoyaltySubTab('promotions');
                    localStorage.setItem('loyaltySubTab', 'promotions');
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    loyaltySubTab === 'promotions'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Promotions
                </button>
              </div>
            </div>

            {loyaltySubTab === 'loyalty-config' && (
              <LoyaltyConfiguration 
                onSuccess={(message) => {
                  setModalConfig({
                    title: 'Success',
                    message: message,
                    type: 'success',
                    onConfirm: () => setShowModal(false)
                  });
                  setShowModal(true);
                }}
                onError={(error) => {
                  setModalConfig({
                    title: 'Error',
                    message: error,
                    type: 'error',
                    onConfirm: () => setShowModal(false)
                  });
                  setShowModal(true);
                }}
              />
            )}

            {loyaltySubTab === 'promotions' && salonInfo && (
              <PromotionsManagement 
                salonId={salonInfo.salon_id}
                salonName={salonInfo.name}
                salonTimezone={salonInfo.timezone}
                onSuccess={(message) => {
                  setModalConfig({
                    title: 'Success',
                    message: message,
                    type: 'success',
                    onConfirm: () => setShowModal(false)
                  });
                  setShowModal(true);
                }}
                onError={(error) => {
                  setModalConfig({
                    title: 'Error',
                    message: error,
                    type: 'error',
                    onConfirm: () => setShowModal(false)
                  });
                  setShowModal(true);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'revenue' && salonStatus === 'APPROVED' && (
          <div className="space-y-6">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Revenue Insights
                  </h2>
                  <p className="text-muted-foreground">
                    Track top-performing stylists, services, and product sales for your salon.
                  </p>
                </div>
              </div>
            </div>

            {revenueLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading revenue data...</p>
              </div>
            ) : revenueData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5" />
                        <span>Total Service Revenue</span>
                      </CardTitle>
                      <CardDescription>
                        Revenue from service bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-800 mb-4">
                        ${parseFloat(revenueData.totalSalonRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {revenueData.services && revenueData.services.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-semibold mb-1">Top Service</p>
                          <p className="font-semibold">{revenueData.services[0].service_name}</p>
                          <p className="text-sm text-muted-foreground mb-2">{revenueData.services[0].times_booked || 0} bookings</p>
                          <p className="text-lg font-bold text-green-800">
                            ${parseFloat(revenueData.services[0].total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5" />
                        <span>Total Product Revenue</span>
                      </CardTitle>
                      <CardDescription>
                        Revenue from product sales
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-800 mb-4">
                        ${parseFloat(revenueData.totalProductRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {revenueData.productsRevenue && revenueData.productsRevenue.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-semibold mb-1">Top Product</p>
                          <p className="font-semibold">{revenueData.productsRevenue[0].product_name}</p>
                          <p className="text-sm text-muted-foreground mb-2">{revenueData.productsRevenue[0].units_sold || 0} units</p>
                          <p className="text-lg font-bold text-green-800">
                            ${parseFloat(revenueData.productsRevenue[0].total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5" />
                        <span>Total Revenue</span>
                      </CardTitle>
                      <CardDescription>
                        Combined total revenue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-800 mb-4">
                        ${(parseFloat(revenueData.totalSalonRevenue || 0) + parseFloat(revenueData.totalProductRevenue || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {revenueData.stylists && revenueData.stylists.length > 0 && (() => {
                        const topStylist = revenueData.stylists.reduce((top, current) => {
                          const currentRevenue = parseFloat(current.total_revenue || 0);
                          const topRevenue = parseFloat(top.total_revenue || 0);
                          return currentRevenue > topRevenue ? current : top;
                        }, revenueData.stylists[0]);
                        
                        const topStylistRevenue = parseFloat(topStylist.total_revenue || 0);
                        
                        return (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-semibold mb-1">Top Stylist</p>
                            <p className="font-semibold">{topStylist.stylist_name}</p>
                            <p className="text-sm text-muted-foreground mb-2">{topStylist.total_bookings || 0} bookings</p>
                            <p className="text-lg font-bold text-green-800">
                              ${topStylistRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {revenueData.stylists && revenueData.stylists.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Scissors className="w-5 h-5" />
                        <span>Top Performing Stylists</span>
                      </CardTitle>
                      <CardDescription>
                        Total revenue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {revenueData.stylists.map((stylist, index) => {
                          const totalRevenue = parseFloat(stylist.total_revenue || 0);
                          
                          const stylistsWithRevenue = revenueData.stylists.map(s => parseFloat(s.total_revenue || 0));
                          const topStylistRevenue = Math.max(...stylistsWithRevenue);
                          const isTopStylist = totalRevenue === topStylistRevenue && totalRevenue > 0 && index === revenueData.stylists.findIndex(s => parseFloat(s.total_revenue || 0) === topStylistRevenue);
                          
                          return (
                            <div 
                              key={index} 
                              onClick={() => {
                                setSelectedStylist(stylist);
                                setShowStylistBreakdownModal(true);
                              }}
                              className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-lg">{stylist.stylist_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {stylist.total_bookings} booking{stylist.total_bookings !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-green-800">
                                    ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  {isTopStylist && (
                                    <Badge className="mt-1 bg-yellow-200 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
                                      Top Performer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {revenueData.services && revenueData.services.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Award className="w-5 h-5" />
                        <span>Top Performing Services</span>
                      </CardTitle>
                      <CardDescription>
                        Revenue breakdown by service
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {revenueData.services.map((service, index) => {
                          const serviceRevenue = parseFloat(service.total_revenue || 0);
                          
                          const servicesWithRevenue = revenueData.services.map(s => parseFloat(s.total_revenue || 0));
                          const topServiceRevenue = Math.max(...servicesWithRevenue);
                          const isTopService = serviceRevenue === topServiceRevenue && serviceRevenue > 0 && index === revenueData.services.findIndex(s => parseFloat(s.total_revenue || 0) === topServiceRevenue);
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-semibold">{service.service_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {service.times_booked || 0} booking{service.times_booked !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-800">
                                  ${serviceRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {isTopService && (
                                  <Badge className="mt-1 bg-yellow-200 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
                                    Top Service
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {revenueData.productsRevenue && revenueData.productsRevenue.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Sales Performance</CardTitle>
                      <CardDescription>
                        Track product revenue and units sold.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {revenueData.productsRevenue.map((product, index) => {
                          const productRevenue = parseFloat(product.total_revenue || 0);
                          
                          const productsWithRevenue = revenueData.productsRevenue.map(p => parseFloat(p.total_revenue || 0));
                          const topProductRevenue = Math.max(...productsWithRevenue);
                          const isTopProduct = productRevenue === topProductRevenue && productRevenue > 0 && index === revenueData.productsRevenue.findIndex(p => parseFloat(p.total_revenue || 0) === topProductRevenue);
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-semibold">{product.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Listed at: ${parseFloat(product.listing_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {product.units_sold || 0} units sold
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-800">
                                  ${productRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {isTopProduct && (
                                  <Badge className="mt-1 bg-yellow-200 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
                                    Top Product
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No revenue data available</h3>
                <p className="text-sm text-muted-foreground">
                  Revenue data will appear here once you have completed appointments and product sales.
                </p>
              </div>
            )}

            {showStylistBreakdownModal && selectedStylist && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl mx-auto shadow-2xl">
                  <CardContent className="p-6 pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedStylist.stylist_name}'s Daily Revenue</h3>
                        <p className="text-sm text-gray-600">Last 7 days breakdown</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowStylistBreakdownModal(false);
                          setSelectedStylist(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Revenue (All-Time)</p>
                          <p className="text-2xl font-bold text-green-800">
                            ${parseFloat(selectedStylist.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Revenue (Last 7 Days)</p>
                          <p className="text-2xl font-bold text-green-800">
                            ${(parseFloat(selectedStylist.monday_revenue || 0) + 
                                parseFloat(selectedStylist.tuesday_revenue || 0) + 
                                parseFloat(selectedStylist.wednesday_revenue || 0) + 
                                parseFloat(selectedStylist.thursday_revenue || 0) + 
                                parseFloat(selectedStylist.friday_revenue || 0) + 
                                parseFloat(selectedStylist.saturday_revenue || 0) + 
                                parseFloat(selectedStylist.sunday_revenue || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Bookings</p>
                          <p className="text-2xl font-bold text-purple-700">
                            {selectedStylist.total_bookings || 0}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3">Daily Breakdown</h4>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                          const dayKey = `${day}_revenue`;
                          const revenue = parseFloat(selectedStylist[dayKey] || 0);
                          const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                          
                          return (
                            <div key={day} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <span className="font-medium">{dayLabel}</span>
                              <span className="text-lg font-bold text-green-800">
                                ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && salonStatus === 'APPROVED' && (
          <OperatingHours 
            onSuccess={(message) => {
              setModalConfig({
                title: 'Success',
                message: message,
                type: 'success',
                onConfirm: () => setShowModal(false)
              });
              setShowModal(true);
            }}
            onError={(error) => {
              setModalConfig({
                title: 'Error',
                message: error,
                type: 'error',
                onConfirm: () => setShowModal(false)
              });
              setShowModal(true);
            }}
          />
        )}

        {showAddEmployeeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Employee</h3>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowAddEmployeeModal(false);
                  setNewEmployee({ email: '', title: '' });
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium mb-2">Employee Email</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="stylist@example.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The employee must already have an account in the system
                  </p>
                  </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Job Title</label>
                  <input
                    type="text"
                    value={newEmployee.title}
                    onChange={(e) => setNewEmployee({...newEmployee, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Senior Stylist, Junior Stylist, etc."
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddEmployeeModal(false);
                    setNewEmployee({ email: '', title: '' });
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingEmployee}>
                    {isAddingEmployee ? 'Adding...' : 'Add Employee'}
                  </Button>
                </div>
              </form>
                      </div>
                  </div>
        )}

        <StrandsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onConfirm={modalConfig.onConfirm}
          confirmText={modalConfig.confirmText || 'OK'}
          showCancel={modalConfig.showCancel || false}
          cancelText={modalConfig.cancelText || 'Cancel'}
        />

        <StrandsModal
          isOpen={showFireModal}
          onClose={() => {
            setShowFireModal(false);
            setEmployeeToFire(null);
          }}
          title="Remove Employee"
          message={`Are you sure you want to remove ${employeeToFire?.full_name} from the salon? This action cannot be undone.`}
          type="warning"
          onConfirm={confirmFireEmployee}
          confirmText="Remove"
          showCancel={true}
          cancelText="Cancel"
        />

        <EmployeeHoursModal
          isOpen={showEmployeeHoursModal}
          onClose={() => {
            setShowEmployeeHoursModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onSuccess={(message) => {
            setModalConfig({
              title: 'Success',
              message: message,
              type: 'success',
              onConfirm: () => setShowModal(false)
            });
            setShowModal(true);
          }}
          onError={(error) => {
            // Error is already formatted by EmployeeHoursModal, use it directly
            const errorMessage = typeof error === 'string' ? error : (Array.isArray(error) ? error.join('\n') : String(error));
            
            setModalConfig({
              title: 'Error',
              message: errorMessage,
              type: 'error',
              onConfirm: () => setShowModal(false)
            });
            setShowModal(true);
          }}
        />

        {/* UPH-1.2: Customer Visit History Modal */}
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
                      {customerVisits.map((visit) => {
                        const originalTotal = typeof visit.total_price === 'number' ? visit.total_price : parseFloat(visit.total_price || 0);
                        const actualPaid = visit.actual_amount_paid !== undefined && visit.actual_amount_paid !== null
                          ? (typeof visit.actual_amount_paid === 'number' ? visit.actual_amount_paid : parseFloat(visit.actual_amount_paid))
                          : originalTotal;
                        const rewardInfo = visit.reward || null;
                        const promoInfo = visit.promo || null;
                        const hasDiscount = (rewardInfo || promoInfo) && !Number.isNaN(actualPaid) && actualPaid < originalTotal;
                        const discountLabel = rewardInfo?.discount_percentage 
                          ? `${rewardInfo.discount_percentage}% off`
                          : promoInfo?.discount_pct
                          ? `${promoInfo.discount_pct}% off`
                          : 'Discount applied';

                        return (
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
                                  <div className="flex items-center gap-2">
                                    {hasDiscount && (
                                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                        {promoInfo ? 'Promo Applied' : 'Discounted'}
                                      </Badge>
                                  )}
                                  <Badge className={getStatusBadgeClass(visit.status || 'completed')}>
                                    {formatStatusLabel(visit.status || 'completed')}
                                  </Badge>
                                </div>
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
                                  {/* View Photos Button */}
                                  {visit.booking_id && (
                                    <div className="mt-3 flex justify-start">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewPhotos(visit.booking_id)}
                                      >
                                        <Image className="w-4 h-4 mr-1" />
                                        View Photos
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex justify-end mt-3 pt-3 border-t">
                                    {hasDiscount ? (
                                      <div className="text-right">
                                        <div className="flex items-baseline gap-2 justify-end">
                                          <span className="text-sm text-muted-foreground line-through">
                                            Total: ${!Number.isNaN(originalTotal) ? originalTotal.toFixed(2) : '0.00'}
                                          </span>
                                          <span className="text-lg font-semibold text-green-800">
                                            ${!Number.isNaN(actualPaid) ? actualPaid.toFixed(2) : '0.00'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {discountLabel}
                                          {rewardInfo?.note ? ` ${rewardInfo.note}` : ''}
                                          {promoInfo?.promo_code ? ` Promo Code: ${promoInfo.promo_code}` : ''}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="text-lg font-semibold text-green-800">
                                        Total: ${!Number.isNaN(originalTotal) ? originalTotal.toFixed(2) : '0.00'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

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

        {/* Photo View Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold">Before/After Photos</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowPhotoModal(false)}>
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
          </>
        )}
      </main>
    </div>
  );
}
