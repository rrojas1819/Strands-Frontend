import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SalonRegistrationForm from '../components/SalonRegistrationForm';
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
  LogOut
} from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { toast } from 'sonner';


export default function SalonOwnerDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [hasSalon, setHasSalon] = useState(false);
  const [salonStatus, setSalonStatus] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleLogout = async () => {
    try {
      toast.success('Signed out successfully');
      await authContext?.logout();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error signing out');
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
                  onClick={() => toast.info('Staff management coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
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
                  onClick={() => toast.info('Loyalty rewards coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Loyalty
                </button>
                <button 
                  onClick={() => toast.info('Promotions coming soon!')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Promotions
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
        
        {hasSalon && (
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
      </main>
    </div>
  );
}
