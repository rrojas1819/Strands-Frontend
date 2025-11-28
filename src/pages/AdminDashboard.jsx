import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { BarChart3, Users, TrendingUp, DollarSign, Users2, Activity, Calendar, Repeat, ArrowUp, ArrowDown, Eye, Scissors, Clock, TrendingDown, Building2, ShoppingBag, Award, Receipt, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import AdminNavbar from '../components/AdminNavbar';

export default function AdminDashboard() {
  const [demographics, setDemographics] = useState(null);
  const [approvedSalonsCount, setApprovedSalonsCount] = useState(0);
  const [userEngagement, setUserEngagement] = useState(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [customerRetention, setCustomerRetention] = useState(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('user-analytics');
  const [userAnalyticsSubTab, setUserAnalyticsSubTab] = useState('overview'); // 'overview' or 'activity-retention'
  const [peakView, setPeakView] = useState('hours');
  const authContext = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    // Fetch all initial data in parallel for maximum speed
    const fetchInitialData = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Fetch only Overview tab data initially (demographics + engagement)
        // Customer retention will be fetched when Activity & Retention tab is active
        const [demographicsResponse, engagementResponse, salonsResponse] = await Promise.allSettled([
          fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/demographics`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/user-engagement`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          })
        ]);

        // Process demographics
        if (demographicsResponse.status === 'fulfilled' && demographicsResponse.value.ok) {
          const data = await demographicsResponse.value.json();
          setDemographics(data.data);
        } else {
          setError('Failed to fetch demographics data');
        }

        // Process user engagement
        if (engagementResponse.status === 'fulfilled' && engagementResponse.value.ok) {
          const data = await engagementResponse.value.json();
          setUserEngagement(data.data);
        }

        // Process approved salons count
        if (salonsResponse.status === 'fulfilled' && salonsResponse.value.ok) {
          const salonsData = await salonsResponse.value.json();
          const count = Array.isArray(salonsData) ? salonsData.length : (salonsData.data?.length || salonsData.length || 0);
          setApprovedSalonsCount(count);
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to fetch analytics data');
      } finally {
        setLoading(false);
        setEngagementLoading(false);
        setRetentionLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'business-insights' || tab === 'revenue-analytics') {
      setActiveTab(tab);
    } else {
      setActiveTab('user-analytics');
    }
  }, [location.search]);

  // Fetch customer retention only when Activity & Retention tab is active
  useEffect(() => {
    if (activeTab === 'user-analytics' && userAnalyticsSubTab === 'activity-retention') {
      if (!customerRetention && !retentionLoading) {
        fetchCustomerRetention();
      }
    }
  }, [activeTab, userAnalyticsSubTab]);

  useEffect(() => {
    if (activeTab === 'business-insights') {
      fetchAppointmentAnalytics();
    } else if (activeTab === 'revenue-analytics') {
      fetchRevenueAnalytics();
    }
  }, [activeTab]);

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

      // Fetch demographics and salons count in parallel for speed
      const [demographicsResponse, salonsResponse] = await Promise.allSettled([
        fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/demographics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        })
      ]);

      // Process demographics
      if (demographicsResponse.status === 'fulfilled' && demographicsResponse.value.ok) {
        const data = await demographicsResponse.value.json();
        setDemographics(data.data);
      } else {
        setError('Failed to fetch demographics data');
      }

      // Process approved salons count
      if (salonsResponse.status === 'fulfilled' && salonsResponse.value.ok) {
        const salonsData = await salonsResponse.value.json();
        const count = Array.isArray(salonsData) ? salonsData.length : (salonsData.data?.length || salonsData.length || 0);
        setApprovedSalonsCount(count);
      } else {
        setApprovedSalonsCount(0);
      }
    } catch (err) {
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/user-engagement`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUserEngagement(data.data);
        } else {
        toast.error(data.message || 'Failed to fetch user engagement data');
      }
    } catch (err) {
      toast.error('Failed to fetch user engagement data');
    } finally {
      setEngagementLoading(false);
    }
  };

  const fetchAppointmentAnalytics = async () => {
    try {
      setAppointmentLoading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('No authentication token found');
        setAppointmentLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/appointment-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAppointmentAnalytics(data);
      } else {
        toast.error(data.message || 'Failed to fetch appointment analytics data');
      }
    } catch (err) {
      toast.error('Failed to fetch appointment analytics data');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const fetchRevenueAnalytics = async () => {
    try {
      setRevenueLoading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('No authentication token found');
        setRevenueLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/salon-revenue-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRevenueAnalytics(data);
      } else {
        toast.error(data.message || 'Failed to fetch revenue analytics data');
      }
    } catch (err) {
      toast.error('Failed to fetch revenue analytics data');
    } finally {
      setRevenueLoading(false);
    }
  };

  const fetchCustomerRetention = async () => {
    try {
      setRetentionLoading(true);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setRetentionLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics/customer-retention-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Handle both { data: {...} } and direct data response
        if (data.data) {
          setCustomerRetention(data.data);
        } else {
          setCustomerRetention(data);
        }
      } else {
        setCustomerRetention(null);
      }
    } catch (err) {
      setCustomerRetention(null);
    } finally {
      setRetentionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNavbar 
        title="Admin Dashboard"
        subtitle="Platform Analytics & Insights"
        activeKey={activeTab === 'user-analytics' ? 'user-analytics' : activeTab === 'business-insights' ? 'business-insights' : activeTab === 'revenue-analytics' ? 'revenue-analytics' : 'user-analytics'}
        onLogout={() => authContext.logout()}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
        {/* Tab Content */}
        {activeTab === 'user-analytics' ? (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                User Analytics
              </h2>
              <p className="text-muted-foreground">
                View user demographics and engagement metrics to understand your platform's user base.
                      </p>
              
              {/* Sub-tabs for User Analytics */}
              <div className="mt-4 flex space-x-1 border-b">
                <button
                  onClick={() => setUserAnalyticsSubTab('overview')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    userAnalyticsSubTab === 'overview'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setUserAnalyticsSubTab('activity-retention')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    userAnalyticsSubTab === 'activity-retention'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Activity & Retention
                </button>
              </div>
                    </div>
            
            {/* Sub-tab Content */}
            {userAnalyticsSubTab === 'overview' ? (
              <>

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
                    <span>Total Bookings</span>
                </CardTitle>
                <CardDescription>
                    All platform bookings
                </CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-blue-600">{userEngagement.total_bookings || 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total bookings</p>
                  </div>
                    <Calendar className="w-12 h-12 text-blue-500" />
                </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Repeat className="w-5 h-5" />
                    <span>Repeat Customers</span>
                  </CardTitle>
                  <CardDescription>
                    Customers with multiple bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                <div>
                      <p className="text-3xl font-bold text-purple-600">{userEngagement.repeat_bookers || 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">Repeat customers</p>
                  </div>
                    <Repeat className="w-12 h-12 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            </div>
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
              </>
            ) : (
              <>
                {/* Activity & Retention Tab Content */}
                {engagementLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading engagement data...</p>
                  </div>
                ) : userEngagement ? (
                  <>
                    <div className="space-y-6">
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

        {/* Customer Retention Metrics Section */}
        <div className="mt-8 mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Customer Retention Metrics
          </h2>
          <p className="text-muted-foreground mb-6">
            Track customer loyalty, rebooking rates, and stylist preferences.
          </p>
        </div>

        {retentionLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading retention data...</p>
          </div>
        ) : customerRetention ? (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Repeat className="w-5 h-5" />
                    <span>Rebooking Rate</span>
                  </CardTitle>
                  <CardDescription>
                    Percentage of customers who return for additional appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {parseFloat(customerRetention.rebooking_rate_percent || 0).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customers returning for repeat visits
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Average Return Interval</span>
                  </CardTitle>
                  <CardDescription>
                    Average days between customer visits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {parseFloat(customerRetention.avg_return_interval_days || 0).toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Days between appointments
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* First Time vs Returning Customers */}
            {customerRetention.first_time_VS_return_time && customerRetention.first_time_VS_return_time.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Customer Type Distribution</span>
                  </CardTitle>
                  <CardDescription>
                    Breakdown of first-time vs returning customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const data = customerRetention.first_time_VS_return_time[0];
                    const firstTime = parseInt(data.first_time_customers || 0);
                    const returning = parseInt(data.returning_customers || 0);
                    const total = firstTime + returning;
                    const firstTimePercent = parseFloat(data.first_time_percentage || 0);
                    const returningPercent = parseFloat(data.returning_percentage || 0);

                    // Calculate pie chart segments
                    const firstTimeAngle = (firstTimePercent / 100) * 360;
                    const returningAngle = (returningPercent / 100) * 360;

                    return (
                      <div className="space-y-4">
                        {/* Pie Chart Visualization */}
                        <div className="flex items-center justify-center">
                          <div className="relative w-64 h-64">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              {total > 0 ? (
                                <>
                                  {/* First-Time Customers segment */}
                                  {firstTime > 0 && (() => {
                                    const radius = 40;
                                    const centerX = 50;
                                    const centerY = 50;
                                    const startAngle = 0;
                                    const endAngle = firstTimeAngle;
                                    const startAngleRad = (startAngle * Math.PI) / 180;
                                    const endAngleRad = (endAngle * Math.PI) / 180;
                                    
                                    const x1 = centerX + radius * Math.cos(startAngleRad);
                                    const y1 = centerY + radius * Math.sin(startAngleRad);
                                    const x2 = centerX + radius * Math.cos(endAngleRad);
                                    const y2 = centerY + radius * Math.sin(endAngleRad);
                                    
                                    const largeArcFlag = firstTimeAngle > 180 ? 1 : 0;
                                    
                                    const pathData = [
                                      `M ${centerX} ${centerY}`,
                                      `L ${x1} ${y1}`,
                                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                      'Z'
                                    ].join(' ');
                                    
                                    return (
                                      <path
                                        key="first-time"
                                        d={pathData}
                                        fill="#3b82f6"
                                        stroke="white"
                                        strokeWidth="0.5"
                                      />
                                    );
                                  })()}
                                  
                                  {/* Returning Customers segment */}
                                  {returning > 0 && (() => {
                                    const radius = 40;
                                    const centerX = 50;
                                    const centerY = 50;
                                    const startAngle = firstTimeAngle;
                                    const endAngle = 360;
                                    const startAngleRad = (startAngle * Math.PI) / 180;
                                    const endAngleRad = (endAngle * Math.PI) / 180;
                                    
                                    const x1 = centerX + radius * Math.cos(startAngleRad);
                                    const y1 = centerY + radius * Math.sin(startAngleRad);
                                    const x2 = centerX + radius * Math.cos(endAngleRad);
                                    const y2 = centerY + radius * Math.sin(endAngleRad);
                                    
                                    const largeArcFlag = returningAngle > 180 ? 1 : 0;
                                    
                                    const pathData = [
                                      `M ${centerX} ${centerY}`,
                                      `L ${x1} ${y1}`,
                                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                      'Z'
                                    ].join(' ');
                                    
                                    return (
                                      <path
                                        key="returning"
                                        d={pathData}
                                        fill="#10b981"
                                        stroke="white"
                                        strokeWidth="0.5"
                                      />
                                    );
                                  })()}
                                </>
                              ) : (
                                <circle cx="50" cy="50" r="40" fill="#e5e7eb" stroke="white" strokeWidth="0.5" />
                              )}
                            </svg>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">First-Time Customers</p>
                              <p className="text-xs text-muted-foreground">
                                {firstTime} ({firstTimePercent.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Returning Customers</p>
                              <p className="text-xs text-muted-foreground">
                                {returning} ({returningPercent.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-left pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            Total Customers: <span className="font-semibold text-foreground">{total}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Favorite Stylist Loyalty */}
            {customerRetention.favorite_stylist_loyalty && customerRetention.favorite_stylist_loyalty.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="w-5 h-5" />
                    <span>Favorite Stylist Loyalty</span>
                  </CardTitle>
                  <CardDescription>
                    Stylists with the most loyal repeat customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customerRetention.favorite_stylist_loyalty.map((stylist, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{stylist.stylist_name}</p>
                            <p className="text-sm text-muted-foreground">{stylist.salon_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{stylist.loyal_customers}</p>
                          <p className="text-xs text-muted-foreground">loyal customers</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No retention data available</h3>
            <p className="text-sm text-muted-foreground">
              Customer retention metrics will appear here once data is available.
            </p>
          </div>
        )}

            {/* Action Buttons */}
            <div className="mt-8 flex space-x-4">
                      {userAnalyticsSubTab === 'overview' ? (
              <Button onClick={() => { fetchDemographics(); fetchUserEngagement(); }} variant="outline">
                Refresh Data
              </Button>
                      ) : (
                        <Button onClick={() => { fetchUserEngagement(); fetchCustomerRetention(); }} variant="outline">
                          Refresh Data
                        </Button>
                      )}
                        </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No engagement data available</h3>
                    <p className="text-sm text-muted-foreground">
                      Engagement statistics will appear here once data is available.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : activeTab === 'business-insights' ? (
          <>
            {/* Business Insights Tab */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Business Insights
              </h2>
              <p className="text-muted-foreground">
                Analyze appointment trends and peak booking times to optimize business operations.
              </p>
                    </div>

            {/* Appointment Analytics Data */}
            {appointmentLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading appointment analytics...</p>
                  </div>
            ) : appointmentAnalytics ? (() => {
              // Transform appointmentsByDay object to array with short day names
              const dayMapping = {
                'Sunday': 'Sun',
                'Monday': 'Mon',
                'Tuesday': 'Tue',
                'Wednesday': 'Wed',
                'Thursday': 'Thu',
                'Friday': 'Fri',
                'Saturday': 'Sat'
              };
              
              const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const appointmentsByDay = dayOrder.map(day => ({
                date: dayMapping[day],
                count: appointmentAnalytics.appointmentsByDay?.[day] || 0
              }));

              // Transform peakHours object to array in correct order (12 AM to 11 PM)
              const hourOrder = [
                '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
                '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
              ];
              const peakHours = hourOrder.map(hour => ({
                hour,
                count: appointmentAnalytics.peakHours?.[hour] || 0
              }));

              // Transform appointmentsByDay for peak days view (use full day names)
              const peakDays = dayOrder.map(day => ({
                day,
                count: appointmentAnalytics.appointmentsByDay?.[day] || 0
              }));

              // Calculate average duration
              const avgDuration = appointmentAnalytics.avgDurationInMin 
                ? parseFloat(appointmentAnalytics.avgDurationInMin).toFixed(1)
                : '0';

              // Calculate peak hour and day
              const peakHourData = peakHours.reduce((max, h) => h.count > max.count ? h : max);
              const peakDayData = peakDays.reduce((max, d) => d.count > max.count ? d : max);
              
              // Calculate total appointments for the week
              const totalWeek = appointmentsByDay.reduce((sum, day) => sum + day.count, 0);

              // Helper function to calculate Y-axis intervals using exact max value
              const calculateBarChartIntervals = (maxValue) => {
                if (maxValue <= 0) return { maxCount: 1, intervals: [0, 1] };
                
                // Use exact max value (no rounding up)
                const maxCount = maxValue;
                
                // Generate nice intervals that include the exact max
                // For small values, use step of 1
                // For larger values, calculate a reasonable step
                let step;
                if (maxCount <= 10) {
                  step = 1;
                } else if (maxCount <= 20) {
                  step = 2;
                } else if (maxCount <= 50) {
                  step = 5;
                } else {
                  // For very large values, use approximately 5 intervals
                  step = Math.ceil(maxCount / 5);
                  // Round step to a nice number
                  const stepMagnitude = Math.pow(10, Math.floor(Math.log10(step)));
                  const normalizedStep = step / stepMagnitude;
                  let niceStep;
                  if (normalizedStep <= 1) niceStep = 1;
                  else if (normalizedStep <= 2) niceStep = 2;
                  else if (normalizedStep <= 5) niceStep = 5;
                  else niceStep = 10;
                  step = niceStep * stepMagnitude;
                }
                
                const intervals = [];
                for (let i = 0; i <= maxCount; i += step) {
                  intervals.push(i);
                }
                // Ensure max value is included
                if (intervals[intervals.length - 1] < maxCount) {
                  intervals.push(maxCount);
                }
                
                return { maxCount, intervals };
              };

              // Helper function to render bar chart with proper axes (full width, no stretching)
              const renderBarChart = (data, maxValue) => {
                // Calculate max value - use exact max from data (no padding/rounding)
                const dataMax = Math.max(...data.map(d => d.count), 0);
                const { maxCount, intervals } = maxValue 
                  ? { maxCount: maxValue, intervals: [0, maxValue / 4, maxValue / 2, maxValue * 3 / 4, maxValue] }
                  : calculateBarChartIntervals(dataMax === 0 ? 1 : dataMax);
                
                // Find the bar with the highest value for highlighting
                const maxBarIndex = data.findIndex(d => d.count === dataMax);
                
                const chartHeight = 280;
                const chartWidth = 1200;
                const padding = { top: 20, right: 20, bottom: 80, left: 60 };
                const barWidth = (chartWidth - padding.left - padding.right) / data.length * 0.7;
                const barSpacing = (chartWidth - padding.left - padding.right) / data.length;
                const chartAreaHeight = chartHeight - padding.top - padding.bottom;
                
                const bars = data.map((item, index) => {
                  const barHeight = (item.count / maxCount) * chartAreaHeight;
                  const x = padding.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
                  const y = chartHeight - padding.bottom - barHeight;
                  return { x, y, width: barWidth, height: barHeight, ...item, isMax: index === maxBarIndex && dataMax > 0 };
                });

                return (
                  <div className="w-full -mx-6 px-6">
                    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                      {/* Grid lines and Y-axis labels - aligned with intervals */}
                      {intervals.map((value) => {
                        const y = chartHeight - padding.bottom - ((value / maxCount) * chartAreaHeight);
                        return (
                          <g key={value}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />
                            <text
                              x={padding.left - 10}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="11"
                              fill="#6b7280"
                            >
                              {value}
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {bars.map((bar, index) => (
                        <g key={index}>
                          <rect
                            x={bar.x}
                            y={bar.y}
                            width={bar.width}
                            height={bar.height}
                            fill={bar.isMax ? "#6b21a8" : "#3b82f6"}
                            rx="4"
                          />
                          {/* Value label on top of bar */}
                          <text
                            x={bar.x + bar.width / 2}
                            y={bar.y - 5}
                            textAnchor="middle"
                            fontSize="11"
                            fill={bar.isMax ? "#581c87" : "#1f2937"}
                            fontWeight={bar.isMax ? "600" : "500"}
                          >
                            {bar.count}
                          </text>
                        </g>
                      ))}

                      {/* X-axis labels */}
                      {bars.map((bar, index) => (
                        <text
                          key={index}
                          x={bar.x + bar.width / 2}
                          y={chartHeight - padding.bottom + 20}
                          textAnchor="middle"
                          fontSize="11"
                          fill={bar.isMax ? "#6b21a8" : "#6b7280"}
                          fontWeight={bar.isMax ? "600" : "400"}
                        >
                          {bar.date || bar.week || bar.month}
                        </text>
                      ))}
                      
                      {/* Y-axis label */}
                      <text
                        x={30}
                        y={chartHeight / 2}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                        transform={`rotate(-90, 30, ${chartHeight / 2})`}
                      >
                        Appointments
                      </text>
                      
                      {/* X-axis label */}
                      <text
                        x={chartWidth / 2}
                        y={chartHeight - 30}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                      >
                        Day
                      </text>
                    </svg>
                </div>
                );
              };

              // Helper function to calculate nice Y-axis intervals (reused for line chart)
              const calculateNiceIntervalsLine = (maxValue) => {
                if (maxValue <= 0) return { maxCount: 1, intervals: [0, 1] };
                
                // Calculate a nice rounded max value
                const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
                const normalized = maxValue / magnitude;
                let niceMax;
                
                if (normalized <= 1) niceMax = 1;
                else if (normalized <= 2) niceMax = 2;
                else if (normalized <= 5) niceMax = 5;
                else niceMax = 10;
                
                niceMax = niceMax * magnitude;
                
                // Generate nice intervals (more intervals for line chart)
                const step = niceMax <= 10 ? 1 : niceMax <= 20 ? 2 : niceMax <= 50 ? 5 : niceMax / 5;
                const intervals = [];
                for (let i = 0; i <= niceMax; i += step) {
                  intervals.push(i);
                }
                
                return { maxCount: niceMax, intervals };
              };

              // Helper function to render line chart (full width, no white space)
              const renderLineChart = (data, maxValue) => {
                // Calculate max value with auto-scaling
                const dataMax = Math.max(...data.map(d => d.count), 0);
                const { maxCount, intervals } = maxValue 
                  ? { maxCount: maxValue, intervals: [0, maxValue / 4, maxValue / 2, maxValue * 3 / 4, maxValue] }
                  : calculateNiceIntervalsLine(dataMax === 0 ? 1 : Math.ceil(dataMax * 1.1));
                
                const chartHeight = 300;
                const chartWidth = 1200;
                const padding = { top: 20, right: 20, bottom: 80, left: 60 };
                const chartAreaHeight = chartHeight - padding.top - padding.bottom;
                
                // Calculate points for the line
                const points = data.map((item, index) => {
                  const x = padding.left + (index * (chartWidth - padding.left - padding.right) / (data.length - 1));
                  const y = chartHeight - padding.bottom - ((item.count / maxCount) * chartAreaHeight);
                  return { x, y, ...item };
                });

                // Create path for the line
                const pathData = points.map((point, index) => {
                  return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
                }).join(' ');

                return (
                  <div className="w-full -mx-6 px-6">
                    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                      {/* Grid lines and Y-axis labels - aligned with intervals */}
                      {intervals.map((value) => {
                        const y = chartHeight - padding.bottom - ((value / maxCount) * chartAreaHeight);
                        return (
                          <g key={value}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />
                            <text
                              x={padding.left - 10}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="11"
                              fill="#6b7280"
                            >
                              {value}
                            </text>
                          </g>
                        );
                      })}

                      {/* Line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                      />

                      {/* Data points */}
                      {points.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                      ))}

                      {/* X-axis labels */}
                      {points.map((point, index) => {
                        // Only show every nth label if too many points (for 24 hours)
                        const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0 || index === data.length - 1;
                        return showLabel ? (
                          <text
                            key={index}
                            x={point.x}
                            y={chartHeight - padding.bottom + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6b7280"
                          >
                            {point.hour || point.day}
                          </text>
                        ) : null;
                      })}
                      
                      {/* Y-axis label */}
                      <text
                        x={30}
                        y={chartHeight / 2}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                        transform={`rotate(-90, 30, ${chartHeight / 2})`}
                      >
                        Appointments
                      </text>
                      
                      {/* X-axis label */}
                      <text
                        x={chartWidth / 2}
                        y={chartHeight - 30}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                      >
                        {data[0]?.hour ? 'Time' : 'Day'}
                      </text>
                    </svg>
                  </div>
                );
              };

              return (
                <div className="space-y-6">
                  {/* Total Appointments Card */}
            <Card>
              <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                <CardTitle className="flex items-center space-x-2">
                            <Calendar className="w-5 h-5" />
                            <span>Total Appointments</span>
                </CardTitle>
                <CardDescription>
                            Appointment trends over time
                </CardDescription>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0">
                      {renderBarChart(appointmentsByDay)}
                      <div className="mt-4 mx-6 text-sm text-muted-foreground text-center">
                        Last 7 days
                </div>
              </CardContent>
            </Card>

                  {/* Peak Booking Times Card */}
            <Card>
              <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5" />
                            <span>Peak Booking Times</span>
                          </CardTitle>
                <CardDescription>
                            Identify peak hours and days for appointments
                </CardDescription>
                          </div>
                        <div className="flex space-x-1 bg-muted rounded-lg p-1">
                          <Button 
                            variant={peakView === 'hours' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setPeakView('hours')}
                            className="px-3 py-1 text-xs"
                          >
                            Hours
                          </Button>
                          <Button 
                            variant={peakView === 'days' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setPeakView('days')}
                            className="px-3 py-1 text-xs"
                          >
                            Days
                        </Button>
                      </div>
                    </div>
                </CardHeader>
                    <CardContent className="px-0">
                      {peakView === 'hours' && renderLineChart(peakHours)}
                      {peakView === 'days' && renderLineChart(peakDays)}
                      <div className="mt-4 mx-6 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">
                          Peak Time: {peakView === 'hours' 
                            ? peakHourData.hour
                            : peakDayData.day
                          } ({peakView === 'hours' 
                            ? peakHourData.count
                            : peakDayData.count
                          } appointments)
                        </p>
                </div>
              </CardContent>
            </Card>

                  {/* Average Appointment Duration Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Clock className="w-5 h-5" />
                          <span>Average Appointment Duration</span>
                        </CardTitle>
                <CardDescription>
                          Average length of appointments across all services
                </CardDescription>
              </CardHeader>
              <CardContent>
                        <div className="text-center py-8">
                          <div className="text-5xl font-bold text-primary mb-2">{avgDuration}</div>
                          <div className="text-lg text-muted-foreground">minutes</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5" />
                          <span>Trend Summary</span>
                </CardTitle>
                <CardDescription>
                          Key insights from appointment data
                </CardDescription>
              </CardHeader>
              <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium">Busiest Day</span>
                            <span className="text-sm font-bold text-green-700">{peakDayData.day}</span>
                    </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium">Peak Hour</span>
                            <span className="text-sm font-bold text-blue-700">{peakHourData.hour}</span>
                  </div>
                          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <span className="text-sm font-medium">Total This Week</span>
                            <span className="text-sm font-bold text-purple-700">{totalWeek}</span>
                    </div>
                  </div>
              </CardContent>
            </Card>
                    </div>
                </div>
              );
            })() : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No appointment data available</h3>
                <p className="text-sm text-muted-foreground">
                  Appointment analytics will appear here once data is available.
                    </p>
                  </div>
            )}
          </>
        ) : activeTab === 'revenue-analytics' ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Revenue Tracking
              </h2>
              <p className="text-muted-foreground">
                Monitor platform revenue, top performers, and financial metrics.
                    </p>
                  </div>

            {revenueLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading revenue analytics...</p>
                </div>
            ) : revenueAnalytics ? (
              <div className="space-y-6">
                {(() => {
                  const platformData = revenueAnalytics.platformRevenueAnalytics?.[0] || {};
                  const platformRevenue = parseFloat(platformData.platform_revenue || 0);
                  const totalSuccessful = platformData.total_successful || 0;
                  
                  const topSalon = revenueAnalytics.topMetrics?.topSalon || {};
                  const topProduct = revenueAnalytics.topMetrics?.topProduct || {};
                  const topStylist = revenueAnalytics.topMetrics?.topStylist || {};
                  const topServices = revenueAnalytics.topMetrics?.topServices || [];
                  const perSalonData = revenueAnalytics.perSalonRevenueAnalytics || [];

                  return (
                    <>
                      <div className="grid grid-cols-1 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <DollarSign className="w-5 h-5" />
                              <span>Total Platform Revenue</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                              ${platformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {totalSuccessful} successful bookings
                            </p>
              </CardContent>
            </Card>
                      </div>

                      {topSalon.salon_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                              <Building2 className="w-5 h-5" />
                              <span>Highest Grossing Salon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                                  <p className="font-semibold text-lg">{topSalon.salon_name}</p>
                            </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-foreground">
                                    ${parseFloat(topSalon.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                          </div>
                        </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                                  <p className="text-muted-foreground">Booking Revenue</p>
                                  <p className="font-semibold">
                                    ${parseFloat(topSalon.booking_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                  </div>
                  <div>
                                  <p className="text-muted-foreground">Product Revenue</p>
                                  <p className="font-semibold">
                                    ${parseFloat(topSalon.product_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {topProduct.product_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                                <ShoppingBag className="w-5 h-5" />
                                <span>Highest Grossing Product</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg h-[72px]">
                                  <div className="flex flex-col justify-center">
                                    <p className="font-semibold">{topProduct.product_name}</p>
                                    {topProduct.salon_name || topProduct.salon || topProduct.salonName ? (
                                      <p className="text-sm text-muted-foreground">
                                        {topProduct.salon_name || topProduct.salon || topProduct.salonName}
                                      </p>
                                    ) : null}
                    </div>
                                  <div className="text-right flex flex-col justify-center">
                                    <p className="text-xl font-bold">
                                      ${parseFloat(topProduct.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                    </div>
                                <div className="text-sm space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Units Sold</span>
                                    <span className="font-semibold">{topProduct.units_sold || 0} units</span>
                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Listing Price</span>
                                    <span className="font-semibold">
                                      ${parseFloat(topProduct.listing_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                        )}

                        {topStylist.stylist_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                                <Scissors className="w-5 h-5" />
                                <span>Highest Grossing Stylist</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg h-[72px]">
                                  <div className="flex flex-col justify-center">
                                    <p className="font-semibold">{topStylist.stylist_name}</p>
                                    <p className="text-sm text-muted-foreground">{topStylist.salon_name || ''}</p>
                      </div>
                                  <div className="text-right flex flex-col justify-center">
                                    <p className="text-xl font-bold">
                                      ${parseFloat(topStylist.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                    </div>
                      </div>
                                <div className="text-sm space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Bookings</span>
                                    <span className="font-semibold">{topStylist.total_bookings || 0} appointments</span>
                    </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Avg per Booking</span>
                                    <span className="font-semibold">
                                      ${topStylist.total_bookings > 0 
                                        ? (parseFloat(topStylist.total_revenue || 0) / topStylist.total_bookings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : '0.00'}
                                    </span>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
                        )}
                      </div>

                      {topServices.length > 0 && (
              <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Award className="w-5 h-5" />
                              <span>Highest Grossing Services</span>
                            </CardTitle>
                </CardHeader>
                <CardContent>
                            <div className="space-y-3">
                              {topServices.map((service, index) => {
                                const serviceRevenue = parseFloat(service.total_revenue || 0);
                                const topServiceRevenue = topServices.length > 0 ? parseFloat(topServices[0].total_revenue || 0) : 0;
                                const isTopService = serviceRevenue === topServiceRevenue && index === 0;
                                
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div>
                                      <p className="font-semibold">{service.service_name}</p>
                                      <p className="text-sm text-muted-foreground">{service.salon_name || ''}</p>
                  </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold">
                                        ${serviceRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {service.times_booked || 0} bookings
                                      </p>
                                      {isTopService && (
                                        <Badge className="mt-1 bg-yellow-200 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
                                          Top Performer
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

                      {perSalonData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                              <Receipt className="w-5 h-5" />
                              <span>Salon Revenue Breakdown</span>
                </CardTitle>
                <CardDescription>
                              View individual salon revenue and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                            <div className="space-y-4">
                              {perSalonData.map((salon, index) => {
                                const salonRevenue = parseFloat(salon.salon_revenue || 0);
                                const isTopPerformer = topSalon.salon_name === salon.salon_name;
                                
                                return (
                                  <div key={index} className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-lg">{salon.salon_name}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xl font-bold text-foreground">
                                          ${salonRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        {isTopPerformer && (
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
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No revenue data available</h3>
                <p className="text-sm text-muted-foreground">
                  Revenue analytics will appear here once data is available.
                </p>
              </div>
            )}
          </>
        ) : null}
          </>
        )}
      </main>
    </div>
  );
}