import React, { useState, useEffect, useContext, useMemo, useCallback, memo } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Star, Gift, Trophy, Clock, TrendingUp, Award, Zap } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';
import { formatLocalDate } from '../lib/utils';

const isRewardRedeemed = (redeemedAt) => {
  if (!redeemedAt) return false;
  const normalized = typeof redeemedAt === 'string' ? redeemedAt.trim().toLowerCase() : redeemedAt;
  if (normalized === null) return false;
  if (normalized === undefined) return false;
  if (normalized === '') return false;
  if (normalized === 'null') return false;
  if (normalized === 'undefined') return false;
  if (normalized === '0000-00-00 00:00:00') return false;
  return true;
};

const parseTimestamp = (value) => {
  if (!value) return null;
  let raw = value;
  if (typeof raw === 'string') {
    raw = raw.trim();
    if (!raw) return null;
    if (raw.includes(' ') && !raw.includes('T')) {
      raw = raw.replace(' ', 'T');
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return null;
};

const formatDisplayDate = (value) => {
  if (!value) return null;
  // Delegate to shared helper which renders in local time
  const formatted = formatLocalDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return formatted || null;
};

// Memoized components for better performance (defined outside to prevent recreation)
const SalonProgressCard = memo(({ salon }) => (
  <Card className={`p-4 ${salon.rewardEarned ? 'border-green-200 bg-green-50' : ''}`}>
    <div className="flex items-start justify-between mb-2 gap-2">
      <h3 className="font-medium text-sm flex-1 min-w-0 break-words">{salon.salonName}</h3>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {salon.rewardEarned && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
            Reward Ready
          </Badge>
        )}
        <Badge variant="secondary" className={`text-xs whitespace-nowrap ${salon.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
          {salon.tier}
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
));
SalonProgressCard.displayName = 'SalonProgressCard';

const ActivityItem = memo(({ activity, getActivityIcon, getActivityColor }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex items-center space-x-3">
      {getActivityIcon(activity.type)}
      <div>
        <p className="font-medium text-sm">{activity.description}</p>
        <p className="text-xs text-blue-600 font-medium">{activity.salon}</p>
        {formatDisplayDate(activity.type === 'redeemed' ? (activity.redeemedAt || activity.timestamp) : (activity.earnedAt || activity.timestamp)) && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {activity.type === 'redeemed' ? 'Redeemed:' : activity.type === 'earned' ? 'Earned:' : 'Updated:'}
            </span>{' '}
            <span className="font-semibold text-foreground">
              {formatDisplayDate(activity.type === 'redeemed' ? (activity.redeemedAt || activity.timestamp) : (activity.earnedAt || activity.timestamp))}
            </span>
          </p>
        )}
      </div>
    </div>
    <div className="text-right">
      <p className={`font-bold ${getActivityColor(activity.type)}`}>
        {activity.type === 'visit' ? activity.progress : activity.discount}
      </p>
    </div>
  </div>
));
ActivityItem.displayName = 'ActivityItem';

const RewardCard = memo(({ reward, navigate }) => {
  const handleRedeem = useCallback(() => {
    if (reward.salonId) {
      navigate(`/salon/${reward.salonId}/book`);
    } else {
      // Missing salonId - reward cannot be redeemed
    }
  }, [reward.salonId, navigate]);

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between">
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
            onClick={handleRedeem}
            disabled={!reward.salonId}
          >
            Redeem
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
        {formatDisplayDate(reward.earnedAt) && (
          <div>
            <span className="font-semibold text-foreground">Earned:</span>{' '}
            <span className="font-semibold text-foreground">{formatDisplayDate(reward.earnedAt)}</span>
          </div>
        )}
        {formatDisplayDate(reward.redeemedAt) && (
          <div>
            <span className="font-semibold text-foreground">Redeemed:</span>{' '}
            <span className="font-semibold text-foreground">{formatDisplayDate(reward.redeemedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
});
RewardCard.displayName = 'RewardCard';

export default function LoyaltyPoints() {
  const { user } = useContext(AuthContext);
  const { setRewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialData, setPartialData] = useState({
    salonProgress: [],
    totalVisits: 0,
    goldenSalons: 0,
    recentActivity: [],
    availableRewards: []
  });

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
        
        // Fetching loyalty data...
        
        // Check if user is logged in
        if (!token) {
          // No auth token found
          setError('Sign in to see data');
          setLoading(false);
          return;
        }

        // Check if user is GUEST - loyalty data is not available for guests
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData?.role === 'GUEST') {
          setError('Sign in to see data');
          setLoading(false);
          return;
        }
        
        // Fetch all initial data in parallel for maximum speed
        const [totalRewardsResponse, allRewardsResponse, salonsResponse] = await Promise.allSettled([
          fetch(`${apiUrl}/user/loyalty/total-rewards`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/user/loyalty/all-rewards`, {
            method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
          },
          }),
          fetch(`${apiUrl}/salons/browse?status=APPROVED&limit=1000&offset=0`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ]);

        // Process total rewards count
        let totalRewardsCount = 0;
        if (totalRewardsResponse.status === 'fulfilled' && totalRewardsResponse.value.ok) {
          const totalRewardsData = await totalRewardsResponse.value.json();
          totalRewardsCount = totalRewardsData.totalRewards || 0;
          setRewardsCount(totalRewardsCount);
        } else {
          // Failed to fetch total rewards count - continue without it
        }

        // Process all available rewards
        let allAvailableRewards = [];
        if (allRewardsResponse.status === 'fulfilled' && allRewardsResponse.value.ok) {
          const rewardsData = await allRewardsResponse.value.json();
          
          if (rewardsData && Array.isArray(rewardsData.totalRewards)) {
            allAvailableRewards = rewardsData.totalRewards;
          } else {
            // Unexpected response format - handle gracefully
            throw new Error('Invalid response format from all-rewards endpoint');
          }
        } else {
          const errorText = allRewardsResponse.status === 'fulfilled' 
            ? await allRewardsResponse.value.text() 
            : allRewardsResponse.reason?.message || 'Unknown error';
          // Failed to fetch all rewards - continue without them
          
          // Check if user is GUEST before showing detailed error
          const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
          if (userData?.role === 'GUEST') {
            setError('Sign in to see data');
            setLoading(false);
            return;
          }
          
          if (allRewardsResponse.status === 'fulfilled' && allRewardsResponse.value.status === 404) {
            throw new Error('ENDPOINT_NOT_FOUND: The /api/user/loyalty/all-rewards endpoint returned 404. Please verify the route is registered in the backend.');
          } else if (allRewardsResponse.status === 'fulfilled' && allRewardsResponse.value.status === 401) {
            throw new Error('AUTH_ERROR: Authentication failed. Token may be expired or invalid.');
          } else {
            throw new Error(`API_ERROR: Failed to fetch rewards. ${errorText.substring(0, 200)}`);
          }
        }

        // Extract unique salon names/IDs from rewards FIRST to minimize salon fetching
        const uniqueSalonNames = new Set();
        const uniqueSalonIds = new Set();
        allAvailableRewards.forEach(reward => {
          if (reward.salon_name) {
            uniqueSalonNames.add(reward.salon_name);
          }
          if (reward.salon_id) {
            uniqueSalonIds.add(reward.salon_id);
          }
        });
        
        // Fetch ALL approved salons to show tracking for all visited salons
        let salons = [];
        if (salonsResponse.status === 'fulfilled' && salonsResponse.value.ok) {
          const salonsData = await salonsResponse.value.json();
          salons = salonsData.data || [];
        } else {
          // Failed to fetch salons - continue without them
          // Don't throw error - continue without salon data
          salons = [];
        }
        
        // Create a map of salon_name to salon_id for matching rewards to salons
        const salonNameToId = {};
        salons.forEach(salon => {
          salonNameToId[salon.name] = salon.salon_id;
        });
        
        // Fetch loyalty data - try to get all salons at once
        // Backend logs show arrays, but API might return object format
        const salonProgress = [];
        let totalVisits = 0;
        let totalVisitsForUser = 0;
        let goldenSalons = 0;
        const recentActivity = [];
        
        // Track processed salons to prevent duplicates
        const processedSalonIds = new Set();
        const processedSalonNames = new Set();
        
        // Call endpoint ONCE without salon_id - backend returns bulk data
        // Backend returns: { userData: [array of all salons], goldenSalons: X, totalVisits: Y, userRewards: [] }
        let loyaltyData = null;
        let salonDataArray = [];
        let allUserRewards = [];
        
        try {
          const loyaltyResponse = await fetch(`${apiUrl}/user/loyalty/view`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (loyaltyResponse.ok) {
            loyaltyData = await loyaltyResponse.json();
            
            // Backend sends: { userData: [array], goldenSalons: X, totalVisits: Y, userRewards: [] }
            // userData is actually an ARRAY of all salon loyalty data
            salonDataArray = Array.isArray(loyaltyData.userData) 
              ? loyaltyData.userData 
              : (loyaltyData.userData ? [loyaltyData.userData] : []);
            
            allUserRewards = Array.isArray(loyaltyData.userRewards) 
              ? loyaltyData.userRewards 
              : [];
            
            // Use summary data from backend response if available
            if (loyaltyData.totalVisits !== undefined) {
              totalVisitsForUser = parseInt(loyaltyData.totalVisits) || 0;
            }
            if (loyaltyData.goldenSalons !== undefined) {
              goldenSalons = parseInt(loyaltyData.goldenSalons) || 0;
            }
            
          }
        } catch (err) {
          // Error fetching loyalty data - log and continue without it
          console.error('Error fetching loyalty data:', err);
        }
        
        // Process each salon in the array ONCE
        for (const userData of salonDataArray) {
              if (!userData || !userData.salon_name) continue;
              
              const salonName = userData.salon_name;
              // Try to find salon_id by matching salon name
              const matchingSalon = salons.find(s => s.name === salonName);
              const salonId = matchingSalon?.salon_id || null;
              
              // Check if we've already processed this salon (prevent duplicates)
              if (salonId && processedSalonIds.has(salonId)) {
                continue; // Skip duplicate salon
              }
              if (processedSalonNames.has(salonName)) {
                continue; // Skip duplicate salon by name
              }
              
              // Mark as processed
              if (salonId) {
                processedSalonIds.add(salonId);
              }
              processedSalonNames.add(salonName);
              
              // Use visits_count for display (progress tracking)
              const visits = userData.visits_count || 0;
              // Use total_visits_count ONLY for the "Total Visits" summary
              const salonTotalVisits = userData.total_visits_count || 0;
              const visitsNeeded = userData.target_visits || 5;
              const discountPercentage = userData.discount_percentage || 10;
              
              // Only calculate totals if backend didn't provide them
              // Otherwise use the backend values (more accurate)
              if (!loyaltyData || loyaltyData.totalVisits === undefined) {
                totalVisitsForUser += salonTotalVisits;
              }
              
              if (!loyaltyData || loyaltyData.goldenSalons === undefined) {
                // Count as gold salon if total_visits_count >= 5 - only count once
                if (salonTotalVisits >= 5) {
                  goldenSalons++;
                }
              }
              
              // Get available rewards count for this salon from the allAvailableRewards array
              const availableCount = allAvailableRewards.filter(r => {
                const rewardSalonId = r.salon_id || salonNameToId[r.salon_name];
                return rewardSalonId === salonId || r.salon_name === salonName;
              }).length;
              
              // Always show salon progress if userData exists (user has loyalty membership)
              // This ensures tracking is shown even without rewards
              // Cap visits at visitsNeeded to prevent ratio > 1
              const displayVisits = Math.min(visits, visitsNeeded);
              
              // Show progress for ALL salons with loyalty data
              // This includes salons with visits_count = 0 but total_visits_count > 0 (e.g., Radiant Beauty Lounge)
              // We have userData, so we should always show it
              const salonProgressItem = {
                salonId: salonId,
                salonName: salonName,
                visits: displayVisits,
                visitsNeeded: visitsNeeded,
                nextReward: `${discountPercentage}% off next visit`,
                tier: salonTotalVisits >= 5 ? 'Gold' : 'Bronze',
                rewardEarned: availableCount > 0,
                availableRewards: availableCount
              };
              
              salonProgress.push(salonProgressItem);
              
              // Track reward history for activity feed (from all salons)
              // Find rewards for this specific salon
              const salonRewards = allUserRewards.filter(r => {
                // Match by salon name or salon_id if available in reward
                return r.salon_name === salonName || (salonId && r.salon_id === salonId);
              });
              
              salonRewards.forEach((reward) => {
                const rewardLabel = `${reward.discount_percentage}% off next visit`;

                const rewardId = reward.reward_id || reward.id || `reward-${salonName}-${reward.discount_percentage}`;
                const timestamp = isRewardRedeemed(reward.redeemed_at) 
                  ? (reward.redeemed_at && reward.redeemed_at !== 'null' ? reward.redeemed_at : null)
                  : (reward.earned_at || null);
                
                if (isRewardRedeemed(reward.redeemed_at)) {
                  recentActivity.push({
                    id: `redeemed-${salonId || salonName}-${rewardId}-${timestamp || Date.now()}`,
                    type: 'redeemed',
                    description: `Redeemed ${rewardLabel}`,
                    salon: salonName,
                    discount: rewardLabel,
                    timestamp: timestamp,
                    redeemedAt: timestamp
                  });
                } else if (!isRewardRedeemed(reward.redeemed_at) && reward.earned_at) {
                  recentActivity.push({
                    id: `earned-${salonId || salonName}-${rewardId}-${timestamp || Date.now()}`,
                    type: 'earned',
                    description: `Earned ${rewardLabel}`,
                    salon: salonName,
                    discount: rewardLabel,
                    timestamp: timestamp,
                    earnedAt: timestamp
                  });
                }
              });

              // Add to activity if visited (show tracking even without rewards)
              // Use visits_count for activity display (capped at visitsNeeded)
              // Also show if total_visits_count > 0 even if visits_count is 0
              const activityVisits = Math.min(visits, visitsNeeded);
              if (activityVisits > 0 || salonTotalVisits > 0) {
                const visitTimestamp = userData.last_visit_at || userData.updated_at || userData.created_at || new Date().toISOString();
                recentActivity.push({
                  id: `visit-${salonId || salonName}`,
                  type: 'visit',
                  description: `Visit at ${salonName}`,
                  salon: salonName,
                  visitNumber: activityVisits,
                  progress: `${activityVisits}/${visitsNeeded} visits`,
                  rewardEarned: availableCount > 0,
                  timestamp: visitTimestamp
                });
              }
            }
        

        // Process all rewards from the endpoint - convert to display format (optimized with Map for faster lookups)
        const salonMap = new Map(salons.map(s => [s.salon_id, s]));
        const salonNameMap = new Map(salons.map(s => [s.name, s]));
        
        const allRewards = allAvailableRewards.map((reward) => {
          // Use salon_name directly from reward data (most reliable)
          // Try to match by salon_id first, then by salon_name
          const salonId = reward.salon_id || salonNameToId[reward.salon_name];
          const salon = salonId ? salonMap.get(salonId) : (salonNameMap.get(reward.salon_name) || null);
          
          // Prefer salon_name from reward data, fallback to matched salon name, then reward.salon_name
          const salonName = reward.salon_name || (salon ? salon.name : 'Unknown Salon');
          
          // The endpoint returns creationDate, not earned_at
          const earnedAt = reward.creationDate || reward.created_at || reward.earned_at || reward.creation_date;
          const redeemedAt = reward.redeemed_at || reward.redeemedAt || null;
          
          return {
            id: reward.reward_id,
            name: `${reward.discount_percentage}% off next visit`,
            salon: salonName,
            salonId: salonId || null,
            type: 'discount',
            description: reward.note || `${reward.discount_percentage}% off next visit`,
            discount: `${reward.discount_percentage}% off next visit`,
            earnedAt,
            active: true,
            redeemedAt
          };
        });

        // Update state - optimize activity sorting (use single pass where possible)
        const sortedActivity = recentActivity
          .map((activity, index) => {
            const parsedTimestamp = parseTimestamp(activity.timestamp);
            return {
              activity,
              sortOrder: parsedTimestamp !== null ? parsedTimestamp : (Date.now() - index)
            };
          })
          .sort((a, b) => b.sortOrder - a.sortOrder)
          .slice(0, 4)
          .map(({ activity }) => activity);

        // Deduplicate salon progress by salon_id or salon_name to prevent duplicates
        const uniqueSalonProgress = [];
        const seenSalonIds = new Set();
        const seenSalonNames = new Set();
        
        for (const salon of salonProgress) {
          const key = salon.salonId || salon.salonName;
          if (salon.salonId && !seenSalonIds.has(salon.salonId)) {
            seenSalonIds.add(salon.salonId);
            uniqueSalonProgress.push(salon);
          } else if (salon.salonName && !seenSalonNames.has(salon.salonName)) {
            seenSalonNames.add(salon.salonName);
            uniqueSalonProgress.push(salon);
          }
        }

        // Use aggregated total visits from all salons
        totalVisits = totalVisitsForUser;

        // Sort salon progress: Gold salons first, then Bronze, then by visits (descending)
        const sortedSalonProgress = uniqueSalonProgress.sort((a, b) => {
          // Gold salons first
          if (a.tier === 'Gold' && b.tier !== 'Gold') return -1;
          if (a.tier !== 'Gold' && b.tier === 'Gold') return 1;
          // Then sort by visits (descending)
          return b.visits - a.visits;
        });

        const finalData = {
          salonProgress: sortedSalonProgress,
          totalVisits: totalVisits,
          overallTier: goldenSalons > 0 ? 'Gold' : 'Bronze',
          recentActivity: sortedActivity,
          availableRewards: allRewards
        };
        
        // Loyalty data loaded successfully
        
        // Update partial data first for immediate display
        setPartialData({
          salonProgress: sortedSalonProgress,
          totalVisits: totalVisits,
          goldenSalons: goldenSalons,
          recentActivity: sortedActivity,
          availableRewards: allRewards
        });
        
        // Then set final data
        setLoyaltyData(finalData);
        setLoading(false);
      } catch (err) {
        // Error fetching loyalty data - handled by setError
        // Check if user is GUEST before showing detailed error
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData?.role === 'GUEST') {
          setError('Sign in to see data');
        } else {
          setError(err.message || 'Failed to load loyalty points.');
        }
        setLoading(false);
      }
    };

    fetchLoyaltyData();
  }, [user, navigate, setRewardsCount]);

  // Memoize helper functions to prevent recreation on every render
  const getTierBadge = useCallback((tier) => {
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
  }, []);

  const getActivityIcon = useCallback((type) => {
    if (type === 'earned') {
      return <Gift className="w-4 h-4 text-green-600" />;
    }
    if (type === 'redeemed') {
      return <Gift className="w-4 h-4 text-red-600" />;
    }
    return <Clock className="w-4 h-4 text-blue-600" />;
  }, []);

  const getActivityColor = useCallback((type) => {
    if (type === 'earned') {
      return 'text-green-600';
    }
    if (type === 'redeemed') {
      return 'text-red-600';
    }
    return 'text-blue-600';
  }, []);


  // Use partialData if loyaltyData is not ready yet (progressive loading)
  const displayData = loyaltyData || {
    salonProgress: partialData.salonProgress || [],
    totalVisits: partialData.totalVisits || 0,
    overallTier: partialData.goldenSalons > 0 ? 'Gold' : 'Bronze',
    recentActivity: partialData.recentActivity || [],
    availableRewards: partialData.availableRewards || []
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar activeTab="loyalty" title="Loyalty Program" subtitle="Track Your Visits And Rewards" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="text-center py-12 mb-8">
            <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">{error}</p>
          </div>
        )}

        {loading && !loyaltyData && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Loading your loyalty data...</span>
            </div>
          </div>
        )}

            {/* Salon Progress Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Salon Progress</h2>
            {displayData?.salonProgress?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayData.salonProgress.map((salon) => (
                    <SalonProgressCard key={salon.salonId} salon={salon} />
                  ))}
                        </div>
              ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
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
            {displayData.salonProgress.some(salon => salon.rewardEarned) && (
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
                    {displayData?.salonProgress
                      ?.filter(salon => salon.rewardEarned)
                      ?.map((salon) => (
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
                  <div className="text-2xl font-bold">{displayData.totalVisits || 0}</div>
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
                    {displayData.salonProgress?.filter(salon => salon.tier === 'Gold').length || 0}
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
                    {displayData?.recentActivity && displayData.recentActivity.length > 0 ? (
                      displayData.recentActivity.map((activity) => (
                        <ActivityItem 
                          key={activity.id} 
                          activity={activity} 
                          getActivityIcon={getActivityIcon}
                          getActivityColor={getActivityColor}
                        />
                      ))
                    ) : loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="p-3 border rounded-lg animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                        </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    )}
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
                    {displayData?.availableRewards && Array.isArray(displayData.availableRewards) && displayData.availableRewards.length > 0 ? (
                      displayData.availableRewards.map((reward) => (
                        <RewardCard key={reward.id} reward={reward} navigate={navigate} />
                      ))
                    ) : loading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="p-3 border rounded-lg animate-pulse">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
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
      </main>
    </div>
  );
}