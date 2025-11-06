import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Users,
  Award,
  Target,
  BarChart3,
  Star,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { Notifications } from '../utils/notifications';

export default function LoyaltyMonitoring() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    fetchLoyaltyMetrics();
  }, [user, navigate]);

  const fetchLoyaltyMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      console.log('Fetching loyalty program analytics...');
      const response = await fetch(`${apiUrl}/admin/analytics/loyalty-program`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Loyalty analytics response status:', response.status);
      const data = await response.json();
      console.log('Loyalty analytics response data:', data);

      if (response.ok) {
        // Transform backend data to match frontend structure
        const backendData = data.data;
        const participationRate = backendData.users_with_bookings / backendData.total_users;
        const redemptionRate = backendData.redeemed_rewards / backendData.total_rewards;
        
        const transformedData = {
          totalUsers: backendData.total_users || 0,
          loyaltyParticipants: backendData.users_with_bookings || 0,
          participationRate: (participationRate * 100) || 0,
          bronzeUsers: backendData.bronze_status || 0,
          goldUsers: backendData.golden_status || 0,
          totalRewardsEarned: backendData.total_rewards || 0,
          totalRewardsRedeemed: backendData.redeemed_rewards || 0,
          redemptionRate: (redemptionRate * 100) || 0,
          topSalons: data.top3PerformingSalons?.map(salon => ({
            name: salon.salon_name,
            participants: salon.participants,
            goldUsers: salon.golden_members,
            avgVisits: parseFloat(salon.avg_visits_per_member)
          })) || [],
          multiSalonUsers: data.multiSalonMemberships || 0
        };

        setLoyaltyData(transformedData);
      } else {
        setError(data.message || 'Failed to fetch loyalty metrics');
      }
    } catch (err) {
      console.error('Error fetching loyalty metrics:', err);
      setError(err.message || 'Failed to load loyalty metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error loading data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!loyaltyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Loyalty Data Available</h2>
          <p className="text-muted-foreground mb-4">Please check back later or ensure data is being collected.</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
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
                <h1 className="text-2xl font-bold text-foreground">Loyalty Program Monitoring</h1>
                <p className="text-sm text-muted-foreground">Track loyalty program effectiveness and participation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/admin/salon-verification'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Salon Management
            </Link>
            <Link
              to="/admin/loyalty-monitoring"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/admin/loyalty-monitoring'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Loyalty Monitoring
            </Link>
            <Link
              to="/dashboard"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              User Analytics
            </Link>
            <Link
              to="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
            >
              Business Insights
            </Link>
            <Link
              to="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
            >
              Revenue Tracking
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Participation Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Participation Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold">{loyaltyData.participationRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {loyaltyData.loyaltyParticipants} of {loyaltyData.totalUsers} users
              </p>
              <Progress value={loyaltyData.participationRate} className="mt-2" />
            </CardContent>
          </Card>

          {/* Bronze Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Award className="h-4 w-4 text-orange-500" />
                <span>Bronze Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold">{loyaltyData.bronzeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((loyaltyData.bronzeUsers / (loyaltyData.bronzeUsers + loyaltyData.goldUsers)) * 100).toFixed(2)}% of loyalty members
              </p>
            </CardContent>
          </Card>

          {/* Gold Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Gold Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold">{loyaltyData.goldUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((loyaltyData.goldUsers / (loyaltyData.bronzeUsers + loyaltyData.goldUsers)) * 100).toFixed(2)}% of loyalty members
              </p>
            </CardContent>
          </Card>

          {/* Redemption Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span>Redemption Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold">{loyaltyData.redemptionRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {loyaltyData.totalRewardsRedeemed} of {loyaltyData.totalRewardsEarned} rewards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Salons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Top Performing Salons</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loyaltyData.topSalons.map((salon, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{salon.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{salon.participants} participants</span>
                        <span>{salon.goldUsers} gold</span>
                        <span>{salon.avgVisits} avg visits</span>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Multi-Salon Memberships */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Multi-Salon Memberships</span>
              </CardTitle>
              <CardDescription>
                Users who are members of multiple salons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Multi-Salon Users</p>
                      <p className="text-sm text-muted-foreground">
                        Users with memberships at multiple salons
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {loyaltyData.multiSalonUsers}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {((loyaltyData.multiSalonUsers / loyaltyData.totalUsers) * 100).toFixed(2)}% of total users
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {loyaltyData.totalUsers}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {loyaltyData.multiSalonUsers}
                    </div>
                    <div className="text-sm text-muted-foreground">Multi-Salon</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Key Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{loyaltyData.participationRate.toFixed(2)}%</div>
                <div className="text-sm text-blue-800">User Participation Rate</div>
                <div className="text-xs text-blue-600 mt-1">
                  {loyaltyData.participationRate > 70 ? 'Excellent' : loyaltyData.participationRate > 50 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{loyaltyData.redemptionRate.toFixed(2)}%</div>
                <div className="text-sm text-green-800">Reward Redemption Rate</div>
                <div className="text-xs text-green-600 mt-1">
                  {loyaltyData.redemptionRate > 70 ? 'High Engagement' : loyaltyData.redemptionRate > 50 ? 'Moderate' : 'Low Engagement'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {((loyaltyData.goldUsers / (loyaltyData.bronzeUsers + loyaltyData.goldUsers)) * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-purple-800">Gold Tier Conversion</div>
                <div className="text-xs text-purple-600 mt-1">
                  Gold members as % of total loyalty members
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}