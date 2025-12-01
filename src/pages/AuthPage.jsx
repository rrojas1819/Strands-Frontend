import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, User, Store, Scissors } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine default tab based on route
  const defaultTab = location.pathname === '/signup' ? 'signup' : 'login';

  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: '',
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!registerForm.role) {
      setError('Please select a role');
      setIsLoading(false);
      return;
    }


    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting signup with data:', registerForm);
      const result = await authContext?.register({
        email: registerForm.email,
        password: registerForm.password,
        name: registerForm.name,
        role: registerForm.role
      });
      
      console.log('Signup result:', result);
      
      if (result?.success) {
        const roleMessage = registerForm.role === 'CUSTOMER' 
          ? 'Welcome to Strands! Start booking your appointments.' 
          : 'Welcome to Strands! Set up your salon profile.';
        toast.success(roleMessage);
        // Navigation is handled by the register function in App.jsx
      } else {
        setError(result?.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login with data:', loginForm);
      const result = await authContext?.login({
        email: loginForm.email,
        password: loginForm.password
      });
      
      console.log('Login result:', result);
      
      if (result?.success) {
        toast.success('Welcome back!');
        // Navigation is handled by the login function in App.jsx
      } else {
        setError(result?.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Role options aligned with SQL ENUM: 'OWNER','CUSTOMER','EMPLOYEE'
  // Note: ADMIN role removed for security - admin accounts should be created through controlled backend processes only
  const roleOptions = [
    {
      value: 'CUSTOMER',
      label: 'Customer',
      icon: User,
      description: 'Book appointments and shop salon products',
      badge: null
    },
    {
      value: 'OWNER',
      label: 'Salon Owner',
      icon: Store,
      description: 'Manage your salon, staff, and customer bookings',
      badge: 'Business'
    },
    {
      value: 'EMPLOYEE',
      label: 'Hairstylist / Employee',
      icon: Scissors,
      description: 'Manage your appointments and customers',
      badge: 'Staff'
    }
  ];


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/strands-logo-new.png" alt="Strands" className="w-20 h-20" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Strands and start your journey</h1>
        </div>

        {/* Auth Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Strands</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-base font-medium">I am a...</Label>
                    <Select
                      value={registerForm.role}
                      onValueChange={(value) => setRegisterForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger id="role" className="w-full">
                        <SelectValue placeholder="Select your role">
                          {registerForm.role 
                            ? (() => {
                                const selectedRole = roleOptions.find(r => r.value === registerForm.role);
                                if (selectedRole) {
                                  const Icon = selectedRole.icon;
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <Icon className="w-4 h-4" />
                                      <span>{selectedRole.label}</span>
                                    </div>
                                  );
                                }
                                return registerForm.role;
                              })()
                            : null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => {
                          const Icon = role.icon;
                          return (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center space-x-2">
                                <Icon className="w-4 h-4" />
                                <span>{role.label}</span>
                                {role.badge && (
                                  <Badge variant="secondary" className="text-xs ml-auto">
                                    {role.badge}
                                  </Badge>
                  )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Back to Landing */}
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}