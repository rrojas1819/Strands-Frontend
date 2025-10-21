import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, User, Store, Scissors, Shield } from 'lucide-react';
import { toast } from 'sonner';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

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

  // Role options aligned with SQL ENUM: 'ADMIN','OWNER','CUSTOMER','EMPLOYEE'
  const roleOptions = [
    {
      value: 'CUSTOMER',
      label: 'Customer',
      icon: User,
      description: 'Book appointments and shop salon products',
      badge: null,
      primary: true
    },
    {
      value: 'OWNER',
      label: 'Salon Owner',
      icon: Store,
      description: 'Manage your salon, staff, and customer bookings',
      badge: 'Business',
      primary: true
    },
    {
      value: 'EMPLOYEE',
      label: 'Hairstylist / Employee',
      icon: Scissors,
      description: 'Manage your appointments and customers',
      badge: 'Staff',
      primary: false
    },
    {
      value: 'ADMIN',
      label: 'Administrator',
      icon: Shield,
      description: 'Platform administration and oversight',
      badge: 'Admin',
      primary: false
    }
  ];

  const primaryRoles = roleOptions.filter(role => role.primary);
  const otherRoles = roleOptions.filter(role => !role.primary);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={strandsLogo} alt="Strands" className="w-12 h-12" />
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
            <Tabs defaultValue="login" className="w-full">
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

                  <div className="space-y-4">
                    <Label className="text-base font-medium">I am a...</Label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {primaryRoles.map((role) => {
                        const Icon = role.icon;
                        return (
                          <Button
                            key={role.value}
                            type="button"
                            variant={registerForm.role === role.value ? 'default' : 'outline'}
                            onClick={() => setRegisterForm(prev => ({ ...prev, role: role.value }))}
                            className="h-auto p-4 flex flex-col items-center space-y-2"
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{role.label}</span>
                            {role.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {role.badge}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {otherRoles.map((role) => {
                        const Icon = role.icon;
                        return (
                          <Button
                            key={role.value}
                            type="button"
                            variant={registerForm.role === role.value ? 'default' : 'outline'}
                            onClick={() => setRegisterForm(prev => ({ ...prev, role: role.value }))}
                            className="h-auto p-4 flex flex-col items-center space-y-2"
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{role.label}</span>
                            {role.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {role.badge}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
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