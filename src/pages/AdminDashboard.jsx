import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { BarChart3, Users, TrendingUp, DollarSign, Users2, LogOut, Activity, Calendar, Repeat, ArrowUp, ArrowDown, Eye, Scissors } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [demographics, setDemographics] = useState(null);
  const [approvedSalonsCount, setApprovedSalonsCount] = useState(0);
  const [userEngagement, setUserEngagement] = useState(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);

  useEffect(() => {
    fetchDemographics();
    fetchUserEngagement();
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

  const fetchUserEngagement = async () => {
    try {
      setEngagementLoading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        setEngagementLoading(false);
        return;
      }

      console.log('Fetching user engagement data...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/user-engagement`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('User engagement response status:', response.status);
      const data = await response.json();
      console.log('User engagement response data:', data);
      console.log('Top 3 viewed salons:', data.data?.top3ViewedSalons);

      if (response.ok) {
        setUserEngagement(data.data);
        // Log the top3ViewedSalons specifically to debug
        if (data.data?.top3ViewedSalons) {
          console.log('Top viewed salons array:', data.data.top3ViewedSalons);
          console.log('Array length:', data.data.top3ViewedSalons.length);
        } else {
          console.log('top3ViewedSalons is missing or undefined');
        }
      } else {
        console.error('Failed to fetch user engagement:', data.message);
        toast.error(data.message || 'Failed to fetch user engagement data');
      }
    } catch (err) {
      console.error('User engagement fetch error:', err);
      toast.error('Failed to fetch user engagement data');
    } finally {
      setEngagementLoading(false);
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

        {/* User Engagement Stats Section */}
        <div className="mt-8 mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            User Engagement Statistics
          </h2>
          <p className="text-muted-foreground mb-6">
            Monitor platform usage and user activity metrics.
          </p>
        </div>

        {engagementLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading engagement data...</p>
          </div>
        ) : userEngagement ? (
          <div className="space-y-6">
            {/* Login Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today's Logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{userEngagement.today_logins || 0}</div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                  {userEngagement.yesterday_logins !== undefined && (
                    <div className="flex items-center mt-2 text-sm">
                      {userEngagement.today_logins > userEngagement.yesterday_logins ? (
                        <>
                          <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-green-600">
                            {((userEngagement.today_logins - userEngagement.yesterday_logins) / (userEngagement.yesterday_logins || 1) * 100).toFixed(0)}% vs yesterday
                          </span>
                        </>
                      ) : userEngagement.today_logins < userEngagement.yesterday_logins ? (
                        <>
                          <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                          <span className="text-red-600">
                            {((userEngagement.yesterday_logins - userEngagement.today_logins) / (userEngagement.yesterday_logins || 1) * 100).toFixed(0)}% vs yesterday
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No change</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Yesterday's Logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{userEngagement.yesterday_logins || 0}</div>
                    <Activity className="w-8 h-8 text-gray-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Past Week Logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{userEngagement.past_week_logins || 0}</div>
                    <Users2 className="w-8 h-8 text-purple-500" />
                  </div>
                  {userEngagement.previous_week_logins !== undefined && (
                    <div className="flex items-center mt-2 text-sm">
                      {userEngagement.past_week_logins > userEngagement.previous_week_logins ? (
                        <>
                          <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-green-600">
                            {((userEngagement.past_week_logins - userEngagement.previous_week_logins) / (userEngagement.previous_week_logins || 1) * 100).toFixed(0)}% vs previous week
                          </span>
                        </>
                      ) : userEngagement.past_week_logins < userEngagement.previous_week_logins ? (
                        <>
                          <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                          <span className="text-red-600">
                            {((userEngagement.previous_week_logins - userEngagement.past_week_logins) / (userEngagement.previous_week_logins || 1) * 100).toFixed(0)}% vs previous week
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No change</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Previous Week Logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{userEngagement.previous_week_logins || 0}</div>
                    <Users2 className="w-8 h-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Booking Statistics</span>
                  </CardTitle>
                  <CardDescription>
                    Overview of platform booking activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                      <p className="text-3xl font-bold text-blue-600">{userEngagement.total_bookings || 0}</p>
                    </div>
                    <Calendar className="w-12 h-12 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Repeat Customers</p>
                      <p className="text-3xl font-bold text-purple-600">{userEngagement.repeat_bookers || 0}</p>
                    </div>
                    <Repeat className="w-12 h-12 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Scissors className="w-5 h-5" />
                    <span>Top Services</span>
                  </CardTitle>
                  <CardDescription>
                    Most booked services on the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userEngagement.top3Services && userEngagement.top3Services.length > 0 ? (
                    <div className="space-y-3">
                      {userEngagement.top3Services.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">{service.total_bookings} bookings</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No service data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Viewed Salons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Top Viewed Salons</span>
                </CardTitle>
                <CardDescription>
                  Salons with the most detail page views
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userEngagement.top3ViewedSalons && Array.isArray(userEngagement.top3ViewedSalons) && userEngagement.top3ViewedSalons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {userEngagement.top3ViewedSalons.map((salon, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{salon.name}</p>
                            <p className="text-sm text-muted-foreground">{salon.clicks} views</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium mb-2">No salon view data available</p>
                    <p className="text-sm text-muted-foreground">
                      Salon views will appear here once users start viewing salon detail pages.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No engagement data available</h3>
            <p className="text-sm text-muted-foreground">
              Engagement statistics will appear here once data is available.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <Button onClick={() => { fetchDemographics(); fetchUserEngagement(); }} variant="outline">
            Refresh Data
                  </Button>
                </div>
      </main>
    </div>
  );
}