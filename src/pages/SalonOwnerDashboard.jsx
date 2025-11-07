import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SalonRegistrationForm from '../components/SalonRegistrationForm';
import LoyaltyConfiguration from '../components/LoyaltyConfiguration';
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import StrandsModal from '../components/ui/strands-modal';
import { Card, CardContent } from '../components/ui/card';


export default function SalonOwnerDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [hasSalon, setHasSalon] = useState(false);
  const [salonStatus, setSalonStatus] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewsSubTab, setReviewsSubTab] = useState('salon');
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

  useEffect(() => {
    // Check for tab in URL params
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['overview', 'staff-services', 'products', 'customers', 'reviews', 'loyalty', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    const checkSalonStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setHasSalon(false);
          setSalonStatus(null);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/check`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setHasSalon(data.hasSalon);
          setSalonStatus(data.status);
        }
      } catch (error) {
        console.error('Error checking salon status:', error);
        setHasSalon(false);
        setSalonStatus(null);
      }
    };

    if (authContext?.user?.user_id) {
      checkSalonStatus();
    }
  }, [authContext?.user?.user_id]);

  useEffect(() => {
    if (activeTab === 'staff-services' && salonStatus === 'APPROVED') {
      fetchEmployees(1);
    }
  }, [activeTab, salonStatus]);

  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'products' || activeTab === 'reviews') && salonStatus === 'APPROVED') {
      fetchSalonInfo();
    }
  }, [activeTab, salonStatus]);

  // UPH-1.2: Fetch customers when customers tab is active
  useEffect(() => {
    if (activeTab === 'customers' && salonStatus === 'APPROVED') {
      fetchCustomers();
    }
  }, [activeTab, sortOrder, salonStatus]);


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

  // UPH-1.2: Handle visit history pagination
  const handleVisitsPagination = (direction) => {
    const newOffset = direction === 'next' 
      ? visitsPagination.offset + visitsPagination.limit
      : Math.max(0, visitsPagination.offset - visitsPagination.limit);
    
    if (selectedCustomer) {
      fetchCustomerVisitHistory(selectedCustomer.user_id, newOffset);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <OwnerNavbar 
        salonStatus={salonStatus}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    onClick={() => setReviewsSubTab('salon')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      reviewsSubTab === 'salon'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    Salon Reviews
                  </button>
                  <button
                    onClick={() => setReviewsSubTab('staff')}
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
            setModalConfig({
              title: 'Error',
              message: error,
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
                        const hasDiscount = rewardInfo && !Number.isNaN(actualPaid) && actualPaid < originalTotal;
                        const discountLabel = rewardInfo?.discount_percentage ? `${rewardInfo.discount_percentage}% off` : 'Discount applied';

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
                                        Discounted
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
      </main>
    </div>
  );
}
