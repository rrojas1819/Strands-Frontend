import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SalonRegistrationForm from '../components/SalonRegistrationForm';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Settings,
  LogOut
} from 'lucide-react';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';
import { toast } from 'sonner';


export default function SalonOwnerDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [hasSalon, setHasSalon] = useState(false);
  const [isLoadingSalon, setIsLoadingSalon] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const checkSalonStatus = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setHasSalon(false);
      } catch (error) {
        console.error('Error checking salon status:', error);
        setHasSalon(false);
      } finally {
        setIsLoadingSalon(false);
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

  if (isLoadingSalon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={strandsLogo} 
              alt="Strands" 
              className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate('/')}
            />
            <div className="ml-3">
              <h1 className="text-xl font-bold">Strands</h1>
              <p className="text-sm text-muted-foreground">Salon Owner Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {authContext?.user?.full_name?.split(' ').map(n => n[0]).join('') || 'SO'}
                    </AvatarFallback>
                    <AvatarImage src={authContext?.user?.profile_picture_url} />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Owner</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      owner@salon.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Salon settings coming soon!')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Salon Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            <button className="border-b-2 border-primary text-primary py-2 px-0 text-sm font-medium">
              Overview
            </button>
            <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-0 text-sm font-medium">
              Staff & Services
            </button>
            <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-0 text-sm font-medium">
              Products
            </button>
            <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-0 text-sm font-medium">
              Appointments
            </button>
            <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-0 text-sm font-medium">
              Customers
            </button>
            <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-0 text-sm font-medium">
              Settings
            </button>
          </nav>
        </div>

        {!hasSalon && <SalonRegistrationForm />}
      </main>
    </div>
  );
}
