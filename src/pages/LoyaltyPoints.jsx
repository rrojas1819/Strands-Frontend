import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Star, Gift, Trophy, Clock, TrendingUp, Award, Zap } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';

export default function LoyaltyPoints() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loyalty program - visits and rewards per salon

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchLoyaltyData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        
        console.log('Fetching loyalty data...');
        console.log('Token:', token ? 'Present' : 'Missing');
        console.log('API URL:', apiUrl);
        
        // Check if user is logged in
        if (!token) {
          console.log('No auth token found');
          setError('Please log in to view your loyalty points');
          setLoading(false);
          return;
        }
        
        // Get all salons first
        const salonsResponse = await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!salonsResponse.ok) {
          console.log('ailed to fetch salons:', salonsResponse.status);
          throw new Error('Failed to fetch salons');
        }

        const salonsData = await salonsResponse.json();
        const salons = salonsData.data || [];
        console.log('Found', salons.length, 'approved salons');
        
        // Check loyalty for each salon and collect all rewards
        const salonProgress = [];
        let totalRewards = 0;
        let totalVisits = 0;
        let goldenSalons = 0;
        const recentActivity = [];
        const allRewards = [];
        
        for (const salon of salons) {
          try {
            const loyaltyResponse = await fetch(`${apiUrl}/user/loyalty/view?salon_id=${salon.salon_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (loyaltyResponse.ok) {
              const loyaltyData = await loyaltyResponse.json();
              console.log('Loyalty data for salon', salon.salon_id, ':', loyaltyData);
              const userData = loyaltyData.userData;
              const userRewards = loyaltyData.userRewards || [];
              
              if (userData) {
                const visits = userData.visits_count || 0;
                const visitsNeeded = userData.target_visits || 5;
                const discountPercentage = userData.discount_percentage || 10;
                const salonName = userData.salon_name || salon.name;
                
                // Count active (unredeemed) rewards
                const activeRewards = userRewards.filter(reward => reward.active === 1);
                const earnedRewards = activeRewards.length;
                totalRewards += earnedRewards;
                totalVisits += visits;
                if (visits >= 5) goldenSalons++;
                
                salonProgress.push({
                  salonId: salon.salon_id,
                  salonName: salonName,
                  visits: visits,
                  visitsNeeded: visitsNeeded,
                  nextReward: `${discountPercentage}% off next visit`,
                  tier: visits >= 5 ? 'Gold' : 'Bronze',
                  rewardEarned: earnedRewards > 0,
                  availableRewards: earnedRewards
                });
                
                // Add active rewards to the global rewards list
                activeRewards.forEach(reward => {
                  allRewards.push({
                    id: reward.reward_id,
                    name: `${reward.discount_percentage}% off next visit`,
                    salon: salonName,
                    salonId: salon.salon_id,
                    type: 'discount',
                    description: reward.note || `${reward.discount_percentage}% off next visit`,
                    discount: `${reward.discount_percentage}% off next visit`,
                    earnedAt: reward.earned_at,
                    active: reward.active,
                    redeemedAt: reward.redeemed_at
                  });
                });
                
                // Add to activity if visited
                if (visits > 0) {
                  recentActivity.push({
                    id: salon.salon_id,
                    type: 'visit',
                    description: `Visit at ${salonName}`,
                    salon: salonName,
                    visitNumber: visits,
                    progress: `${visits}/${visitsNeeded} visits`,
                    rewardEarned: earnedRewards > 0
                  });
                }
              }
            }
          } catch (err) {
            console.log('No loyalty data for salon', salon.salon_id, ':', err.message);
          }
        }

        // Update state
        const finalData = {
          salonProgress: salonProgress,
          totalVisits: totalVisits,
          overallTier: goldenSalons > 0 ? 'Gold' : 'Bronze',
          recentActivity: recentActivity.slice(0, 5),
          availableRewards: allRewards
        };
        
        console.log('Final loyalty data:', finalData);
        setLoyaltyData(finalData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching loyalty data:', err);
        setError(err.message || 'Failed to load loyalty points.');
        setLoading(false);
      }
    };

    fetchLoyaltyData();
  }, [user, navigate]);


  const getTierBadge = (tier) => {
    const tierColors = {
      'Bronze': 'bg-orange-100 text-orange-800',
      'Silver': 'bg-gray-100 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-purple-100 text-purple-800',
      'Diamond': 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge variant="secondary" className={tierColors[tier] || 'bg-gray-100 text-gray-800'}>
        <Trophy className="w-3 h-3 mr-1" />
        {tier}
      </Badge>
    );
  };

  const getActivityIcon = (type) => {
    return type === 'earned' ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <Gift className="w-4 h-4 text-red-600" />;
  };

  const getActivityColor = (type) => {
    return type === 'earned' ? 'text-green-600' : 'text-red-600';
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
      <UserNavbar activeTab="loyalty" title="Loyalty Program" subtitle="Track Your Visits And Rewards" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loyaltyData ? (
          <>
            {/* Salon Progress Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Salon Progress</h2>
              {loyaltyData.salonProgress.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loyaltyData.salonProgress.map((salon) => (
                    <Card key={salon.salonId} className={`p-4 ${salon.rewardEarned ? 'border-green-200 bg-green-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-sm">{salon.salonName}</h3>
                        <div className="flex items-center space-x-2">
                          {salon.rewardEarned && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Reward Ready
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`text-xs ${salon.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {salon.tier} Status
                          </Badge>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {salon.visits}/{salon.visitsNeeded}
                      </div>
                      {salon.rewardEarned ? (
                        <div className="mb-2">
                          <p className="text-xs text-green-600 font-medium mb-1">
                            {salon.availableRewards} reward{salon.availableRewards > 1 ? 's' : ''} available
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Redeem when booking your next appointment
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mb-2">
                          {salon.visitsNeeded - salon.visits} more visits for next reward
                        </p>
                      )}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${salon.rewardEarned ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min((salon.visits / salon.visitsNeeded) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600 font-medium mt-2">
                        {salon.rewardEarned ? `Available: ${salon.nextReward}` : `Next: ${salon.nextReward}`}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No Loyalty Data Yet</h3>
                  <p className="text-sm">Start visiting salons to earn rewards and track your progress!</p>
                </div>
              )}
            </div>

            {/* Available Rewards Reminder */}
            {loyaltyData.salonProgress.some(salon => salon.rewardEarned) && (
              <Card className="mb-8 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-800">
                    <Gift className="w-5 h-5" />
                    <span>Rewards Ready for Your Next Booking!</span>
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    You have earned rewards at these salons. We'll remind you to redeem them when booking your next appointment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {loyaltyData.salonProgress
                      .filter(salon => salon.rewardEarned)
                      .map((salon) => (
                        <div key={salon.salonId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                          <div>
                            <p className="font-medium text-sm">{salon.salonName}</p>
                            <p className="text-xs text-muted-foreground">{salon.availableRewards} reward{salon.availableRewards > 1 ? 's' : ''} available</p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {salon.nextReward}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loyaltyData.totalVisits}</div>
                  <p className="text-xs text-muted-foreground">Across all salons</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gold Salons</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loyaltyData.salonProgress.filter(salon => salon.tier === 'Gold').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Salons with 5+ visits
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>Your latest visits and rewards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loyaltyData.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getActivityIcon(activity.type)}
                          <div>
                            <p className="font-medium text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{activity.salon}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getActivityColor(activity.type)}`}>
                            {activity.type === 'visit' ? activity.progress : activity.discount}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Available Rewards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gift className="w-5 h-5" />
                    <span>Available Rewards</span>
                  </CardTitle>
                  <CardDescription>Earn rewards based on your visits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loyaltyData.availableRewards && loyaltyData.availableRewards.length > 0 ? (
                      loyaltyData.availableRewards.map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Award className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{reward.name}</p>
                              <p className="text-xs text-muted-foreground">{reward.description}</p>
                              <p className="text-xs text-blue-600 font-medium">{reward.salon}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Button 
                              size="sm" 
                              className="mt-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                              onClick={() => {
                                // Navigate to salon detail page using salonId from reward
                                navigate(`/salon/${reward.salonId}`);
                              }}
                            >
                              Redeem
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No rewards available yet</p>
                        <p className="text-sm">Visit salons to earn rewards!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Gift className="w-24 h-24 mx-auto mb-6 text-muted-foreground/50" />
            <h2 className="text-2xl font-bold mb-4">Welcome to Your Loyalty Program!</h2>
            <p className="text-lg mb-6">Start visiting salons to earn rewards and track your progress.</p>
            <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90">
              Browse Salons
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}