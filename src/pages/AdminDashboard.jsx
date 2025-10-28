import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { BarChart3, Users, TrendingUp, DollarSign, Users2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [demographics, setDemographics] = useState(null);
  const [approvedSalonsCount, setApprovedSalonsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);

  useEffect(() => {
    fetchDemographics();
  }, []);

  const fetchDemographics = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      console.log('Fetching demographics data...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/demographics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Demographics response status:', response.status);
      const data = await response.json();
      console.log('Demographics response data:', data);

      if (response.ok) {
        setDemographics(data.data);
      } else {
        setError(data.message || 'Failed to fetch demographics data');
      }

      // Fetch approved salons count
      console.log('Fetching approved salons count...');
      const salonsResponse = await fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (salonsResponse.ok) {
        const salonsData = await salonsResponse.json();
        console.log('Salons API response:', salonsData);
        // Handle both array and object response formats
        const count = Array.isArray(salonsData) ? salonsData.length : (salonsData.data?.length || salonsData.length || 0);
        setApprovedSalonsCount(count);
        console.log('Approved salons count:', count);
      } else {
        const errorData = await salonsResponse.json().catch(() => ({}));
        console.log('Failed to fetch approved salons:', salonsResponse.status, errorData);
        setApprovedSalonsCount(0);
      }
    } catch (err) {
      console.error('Demographics fetch error:', err);
      setError('Failed to fetch demographics data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authContext.logout();
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
            <div className="flex items-center space-x-4">
              <img 
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png" 
                alt="Strands Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform Analytics & Insights</p>
              </div>
          </div>
          <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Admin
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
                  </Button>
            </div>
          </div>
        </div>
      </header>

          {/* Navigation Bar - Admin Features */}
          <nav className="bg-muted/50 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <Link
                  to="/admin/salon-verification"
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Salon Management
                </Link>
                <Link
                  to="/admin/loyalty-monitoring"
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Loyalty Monitoring
                </Link>
                <button className="py-4 px-1 border-b-2 border-primary text-primary font-medium text-sm">
                  User Analytics
                </button>
                <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
                  Business Insights
                </button>
                <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
                  Revenue Tracking
                </button>
              </div>
            </div>
          </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            User Analytics
          </h2>
          <p className="text-muted-foreground">
            View user demographics and engagement metrics to understand your platform's user base.
                    </p>
                  </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Demographics Card */}
          <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>User Demographics</span>
                </CardTitle>
                <CardDescription>
                Distribution of users by role across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
              {demographics ? (
                <div className="space-y-4">
                  
                  {/* Pie Chart Visualization */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Role Distribution</h4>
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {(() => {
                            const total = Object.values(demographics).reduce((sum, val) => sum + val, 0);
                            let cumulativePercentage = 0;
                            
                            return Object.entries(demographics).map(([role, count], index) => {
                              const percentage = (count / total) * 100;
                              const startAngle = (cumulativePercentage / 100) * 360;
                              const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
                              
                              cumulativePercentage += percentage;
                              
                              const radius = 40;
                              const centerX = 50;
                              const centerY = 50;
                              
                              const startAngleRad = (startAngle * Math.PI) / 180;
                              const endAngleRad = (endAngle * Math.PI) / 180;
                              
                              const x1 = centerX + radius * Math.cos(startAngleRad);
                              const y1 = centerY + radius * Math.sin(startAngleRad);
                              const x2 = centerX + radius * Math.cos(endAngleRad);
                              const y2 = centerY + radius * Math.sin(endAngleRad);
                              
                              const largeArcFlag = percentage > 50 ? 1 : 0;
                              
                              const pathData = [
                                `M ${centerX} ${centerY}`,
                                `L ${x1} ${y1}`,
                                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                'Z'
                              ].join(' ');
                              
                              const color = role === 'CUSTOMER' ? '#3b82f6' :
                                          role === 'OWNER' ? '#10b981' :
                                          role === 'EMPLOYEE' ? '#8b5cf6' :
                                          '#ef4444';
                              
                              return (
                                <path
                                  key={role}
                                  d={pathData}
                                  fill={color}
                                  stroke="white"
                                  strokeWidth="0.5"
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {Object.entries(demographics).map(([role, count]) => {
                        const total = Object.values(demographics).reduce((sum, val) => sum + val, 0);
                        const percentage = Math.round((count / total) * 100);
                        const color = role === 'CUSTOMER' ? '#3b82f6' :
                                    role === 'OWNER' ? '#10b981' :
                                    role === 'EMPLOYEE' ? '#8b5cf6' :
                                    '#ef4444';
                        
                        return (
                          <div key={role} className="flex items-center space-x-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="capitalize">{role.toLowerCase()}</span>
                            <span className="text-muted-foreground">— {count} users ({percentage}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No demographics data available</p>
                </div>
              )}
              </CardContent>
            </Card>

          {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <span className="text-2xl font-bold">
                  {demographics ? Object.values(demographics).reduce((sum, val) => sum + val, 0) : 0}
                </span>
                      </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Salons</span>
                <span className="text-2xl font-bold">
                  {approvedSalonsCount}
                </span>
                    </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Staff Members</span>
                <span className="text-2xl font-bold">
                  {demographics?.EMPLOYEE || 0}
                </span>
                      </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customers</span>
                <span className="text-2xl font-bold">
                  {demographics?.CUSTOMER || 0}
                </span>
                </div>
                </CardContent>
              </Card>
            </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <Button onClick={fetchDemographics} variant="outline">
            Refresh Data
                  </Button>
                </div>
      </main>
    </div>
  );
}