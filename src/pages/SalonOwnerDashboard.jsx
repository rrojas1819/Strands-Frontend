import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SalonRegistrationForm from '../components/SalonRegistrationForm';
import LoyaltyConfiguration from '../components/LoyaltyConfiguration';
import OperatingHours from '../components/OperatingHours';
import EmployeeHoursModal from '../components/EmployeeHoursModal';
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
  UserX
} from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { toast } from 'sonner';
import StrandsModal from '../components/ui/strands-modal';


export default function SalonOwnerDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [hasSalon, setHasSalon] = useState(false);
  const [salonStatus, setSalonStatus] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
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

  return (
    <div className="min-h-screen bg-muted/30">
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
                <h1 className="text-2xl font-bold text-foreground">Salon Owner Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your salon business</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Owner
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Overview
            </button>
            {salonStatus === 'APPROVED' && (
              <>
                <button 
                  onClick={() => setActiveTab('staff-services')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'staff-services' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Staff & Services
                </button>
                <button 
                  onClick={() => toast.info('Product shop coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Products
                </button>
                <button 
                  onClick={() => toast.info('Appointments coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Appointments
                </button>
                <button 
                  onClick={() => toast.info('Customer history coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Customers
                </button>
                <button 
                  onClick={() => toast.info('Reviews coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Reviews
                </button>
                <button 
                  onClick={() => setActiveTab('loyalty')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'loyalty' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Loyalty
                </button>
                <button 
                  onClick={() => toast.info('Promotions coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Promotions
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Settings
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

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
                                <Badge variant="outline" className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${employee.active ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'}`}>
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
      </main>
    </div>
  );
}
