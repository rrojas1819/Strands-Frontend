import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { MapPin, Phone, Mail, Star, Clock, Search, Filter, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Notifications, notifyError } from '../utils/notifications';
import { trackSalonView } from '../utils/analytics';
import UserNavbar from '../components/UserNavbar';
const strandsLogo = '/strands-logo-new.png';

export default function SalonBrowser() {
  const { user, guestView } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [salonPhotos, setSalonPhotos] = useState({}); // Map of salon_id -> photo URL
  const [salonStatuses, setSalonStatuses] = useState({}); // Map of salon_id -> status (0 = not running, 1 = running)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // recent, a-z, z-a, highest-rated (backend handles sorting)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const salonsPerPage = 9;

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'HAIR SALON', label: 'Hair Salon' },
    { value: 'NAIL SALON', label: 'Nail Salon' },
    { value: 'SPA & WELLNESS', label: 'Spa & Wellness' },
    { value: 'BARBERSHOP', label: 'Barbershop' },
    { value: 'EYELASH STUDIO', label: 'Eyelash Studio' },
    { value: 'FULL SERVICE BEAUTY', label: 'Full Service Beauty' }
  ];

  const sortOptions = [
    { value: 'recent', label: 'Default' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'rating', label: 'Highest Rating' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.relative')) {
        setIsDropdownOpen(false);
      }
      if (isSortDropdownOpen && !event.target.closest('.relative')) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isSortDropdownOpen]);

  // Track if we're currently fetching to prevent infinite loops
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const initializeAndFetch = async () => {
      // If no user, try to get guest access
      if (!user) {
        const result = await guestView();
        if (!result.success) {
          navigate('/login');
          return;
        }
        // Guest token generated, continue with fetch
      }

      // Prevent multiple simultaneous fetches
      if (isFetchingRef.current) {
        return;
      }

      const fetchSalons = async () => {
        isFetchingRef.current = true;
        setLoading(true);
        setError('');
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            setError('Authentication required');
            setLoading(false);
            return;
          }
        
        // Fetch ALL salons in batches to ensure we get all of them
        // Backend sorts ALL salons before pagination, so we fetch all with sort parameter
        let allSalons = [];
        let offset = 0;
        const limit = 1000; // Use high limit to get all salons in fewer requests
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED&sort=${sortBy}&limit=${limit}&offset=${offset}`,
            {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
            }
          );

        if (!response.ok) {
            // If limit/offset not supported with sort, try without limit/offset
            if (offset === 0) {
              const fallbackResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED&sort=${sortBy}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );
              if (!fallbackResponse.ok) {
                const errorData = await fallbackResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch salons');
              }
              const fallbackData = await fallbackResponse.json();
              allSalons = fallbackData.data || [];
              hasMore = false;
            } else {
              const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch salons');
            }
          } else {
            const data = await response.json();
            const batchSalons = data.data || [];
            allSalons = [...allSalons, ...batchSalons];
            
            // If we got fewer than the limit, we've reached the end
            if (batchSalons.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          }
        }

        // Backend has sorted ALL salons, so we just set them
        // Filtering happens client-side and maintains the sort order
        setSalons(allSalons);
        setLoading(false);
        
        // Backend returns photo_url in response - use it directly
        const photosMap = { ...salonPhotos }; // Start with existing photos
        allSalons.forEach(salon => {
          if (salon.photo_url) {
            photosMap[salon.salon_id] = salon.photo_url;
          } else if (!photosMap.hasOwnProperty(salon.salon_id)) {
            // Only fetch if not already cached
            photosMap[salon.salon_id] = undefined; // Mark as pending
          }
        });
        
        // Update photos state with backend-provided photos
        setSalonPhotos(photosMap);
        
        // Fetch photos for salons that don't have photo_url from backend (batch fetch for speed)
        const salonsToFetch = allSalons.filter(salon => !salon.photo_url && photosMap[salon.salon_id] === undefined);
        
        if (salonsToFetch.length > 0) {
          // Batch fetch photos in parallel for faster loading
          const photoPromises = salonsToFetch.map(async (salon) => {
            try {
              const photoResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/file/get-salon-photo?salon_id=${salon.salon_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              }
            );
              if (photoResponse.ok) {
                try {
                  const photoData = await photoResponse.json();
                  return { salonId: salon.salon_id, url: photoData.url || null };
              } catch (parseErr) {
                  return { salonId: salon.salon_id, url: null };
                }
              } else {
                return { salonId: salon.salon_id, url: null };
              }
            } catch (err) {
              return { salonId: salon.salon_id, url: null };
            }
          });
          
          // Update photos as they come in (use allSettled to handle failures gracefully)
          Promise.allSettled(photoPromises).then((results) => {
            const newPhotos = {};
            results.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                newPhotos[result.value.salonId] = result.value.url;
              } else {
                // Mark failed fetches as null to prevent retries
                const salonId = salonsToFetch[results.indexOf(result)]?.salon_id;
                if (salonId) {
                  newPhotos[salonId] = null;
                }
              }
            });
            if (Object.keys(newPhotos).length > 0) {
              setSalonPhotos(prev => ({ ...prev, ...newPhotos }));
            }
          });
        }
        
        // Fetch salon statuses for all salons (check if they're running)
        if (allSalons.length > 0) {
          const statusPromises = allSalons.map(async (salon) => {
            try {
              const statusResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/salons/check-salon-status?salon_id=${salon.salon_id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                
                // Backend returns { status: Array } where each item has salon_name and is_open
                let status = 0; // Default to not running
                
                if (statusData.status && Array.isArray(statusData.status)) {
                  // Find the salon in the array by matching salon_name
                  const salonStatus = statusData.status.find(
                    item => item.salon_name === salon.name
                  );
                  
                  if (salonStatus && salonStatus.is_open !== undefined) {
                    status = salonStatus.is_open === 1 ? 1 : 0;
                  }
                } else if (statusData.status !== undefined) {
                  // Fallback: if status is a direct number
                  status = statusData.status === 1 ? 1 : 0;
                }
                
                return { salonId: salon.salon_id, status: status };
              }
              return { salonId: salon.salon_id, status: 0 }; // Default to not running on error
          } catch (err) {
              return { salonId: salon.salon_id, status: 0 }; // Default to not running on error
            }
          });
          
          Promise.allSettled(statusPromises).then((results) => {
            const statusMap = {};
            results.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value) {
                // status is already 0 or 1 from the fetch
                statusMap[result.value.salonId] = result.value.status;
              } else {
                // If fetch failed, default to 0 (not running)
                const salonId = allSalons[index]?.salon_id;
                if (salonId) {
                  statusMap[salonId] = 0;
                }
              }
            });
            setSalonStatuses(statusMap);
          });
        }
        
        // Ratings are now included with salon data from backend - no need to fetch separately
      } catch (err) {
        setError(err.message || 'Failed to load salons.');
        setLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSalons();
    };

    initializeAndFetch();
  }, [user, navigate, sortBy, guestView]); // Refetch when sortBy changes (backend handles sorting)

  // Memoize filtered salons (client-side filtering only, sorting is done by backend)
  const filteredSalons = useMemo(() => {
    if (!salons || salons.length === 0) return [];
    
    const searchLower = searchTerm.toLowerCase();
    let filtered = salons.filter(salon => {
      const matchesSearch = !searchTerm || 
        salon.name.toLowerCase().includes(searchLower) ||
        salon.description?.toLowerCase().includes(searchLower) ||
        salon.city?.toLowerCase().includes(searchLower);
    const matchesCategory = selectedCategory === 'all' || salon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

    // Backend handles sorting, so we just return filtered results
    return filtered;
  }, [salons, searchTerm, selectedCategory]);

  // Reset to page 1 when filters, search, or sort change
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue('1');
  }, [searchTerm, selectedCategory, sortBy]);
  
  // Refetch salons when sort changes (backend handles sorting for ALL salons)
  useEffect(() => {
    if (user && salons.length > 0) {
      const fetchSalons = async () => {
        if (isFetchingRef.current) return; // Prevent duplicate fetches
        isFetchingRef.current = true;
        setLoading(true);
        try {
          const token = localStorage.getItem('auth_token');
          
          // Fetch ALL salons in batches to ensure we get all of them
          // Backend sorts ALL salons before pagination, so we fetch all with sort parameter
          let allSalons = [];
          let offset = 0;
          const limit = 1000; // Use high limit to get all salons in fewer requests
          let hasMore = true;

          while (hasMore) {
            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED&sort=${sortBy}&limit=${limit}&offset=${offset}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) {
              // If limit/offset not supported with sort, try without limit/offset
              if (offset === 0) {
                const fallbackResponse = await fetch(
                  `${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED&sort=${sortBy}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  }
                );
                if (!fallbackResponse.ok) {
                  const errorData = await fallbackResponse.json().catch(() => ({}));
                  throw new Error(errorData.message || 'Failed to fetch salons');
                }
                const fallbackData = await fallbackResponse.json();
                allSalons = fallbackData.data || [];
                hasMore = false;
              } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch salons');
              }
            } else {
              const data = await response.json();
              const batchSalons = data.data || [];
              allSalons = [...allSalons, ...batchSalons];
              
              // If we got fewer than the limit, we've reached the end
              if (batchSalons.length < limit) {
                hasMore = false;
              } else {
                offset += limit;
              }
            }
          }

          // Backend has sorted ALL salons, so we just set them
          // Filtering happens client-side and maintains the sort order
          setSalons(allSalons);
          setCurrentPage(1); // Reset to page 1 when sort changes
          setPageInputValue('1');
        } catch (err) {
          setError(err.message || 'Failed to fetch salons');
        } finally {
          setLoading(false);
          isFetchingRef.current = false;
        }
      };

      fetchSalons();
    }
  }, [sortBy, user]);

  // Calculate pagination (must be before useEffect that uses it)
  const totalPages = Math.ceil(filteredSalons.length / salonsPerPage);
  const startIndex = (currentPage - 1) * salonsPerPage;
  const endIndex = startIndex + salonsPerPage;
  const paginatedSalons = filteredSalons.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = useCallback((newPage) => {
    const pageNum = typeof newPage === 'string' ? parseInt(newPage, 10) : newPage;
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInputValue(pageNum.toString());
    }
  }, [totalPages]);

  const handlePageInputChange = useCallback((e) => {
    setPageInputValue(e.target.value);
  }, []);

  const handlePageInputSubmit = useCallback((e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
    } else {
      setPageInputValue(currentPage.toString());
    }
  }, [pageInputValue, totalPages, currentPage, handlePageChange]);

  const handlePageInputBlur = useCallback(() => {
    const pageNum = parseInt(pageInputValue, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      setPageInputValue(currentPage.toString());
    } else if (pageNum > totalPages) {
      setPageInputValue(totalPages.toString());
      handlePageChange(totalPages);
    } else if (pageNum !== currentPage) {
      handlePageChange(pageNum);
    }
  }, [pageInputValue, currentPage, totalPages, handlePageChange]);

  // Memoize category badge function
  const getCategoryBadge = useCallback((category) => {
    const categoryMap = {
      'HAIR SALON': { label: 'Hair Salon' },
      'NAIL SALON': { label: 'Nail Salon' },
      'SPA & WELLNESS': { label: 'Spa & Wellness' },
      'BARBERSHOP': { label: 'Barbershop' },
      'EYELASH STUDIO': { label: 'Eyelash Studio' },
      'FULL SERVICE BEAUTY': { label: 'Full Service Beauty' }
    };
    
    const categoryInfo = categoryMap[category] || { label: category };
    return (
      <Badge variant="secondary">
        {categoryInfo.label}
      </Badge>
    );
  }, []);

  // Memoize helper functions
  const formatTo12Hour = useCallback((time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const hours12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }, []);

  const getShortDayName = useCallback((day) => {
    const dayMap = {
      'sunday': 'Sun',
      'monday': 'Mon',
      'tuesday': 'Tue',
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat'
    };
    return dayMap[day.toLowerCase()] || day;
  }, []);

  const formatHours = useCallback((weeklyHours) => {
    if (!weeklyHours) return [];
    
    const hoursMap = {};
    Object.entries(weeklyHours).forEach(([day, hours]) => {
      const dayName = getShortDayName(day.charAt(0) + day.slice(1).toLowerCase());
      const isOpen = hours.is_open && hours.start_time && hours.end_time;
      const key = isOpen ? `${formatTo12Hour(hours.start_time)} - ${formatTo12Hour(hours.end_time)}` : 'closed';
      
      if (!hoursMap[key]) {
        hoursMap[key] = { days: [], hours };
      }
      hoursMap[key].days.push(dayName);
    });

    const formatted = [];
    Object.entries(hoursMap).forEach(([key, data]) => {
      const daysStr = data.days.join(', ');
      const hoursStr = key === 'closed' ? 'Closed' : key;
      formatted.push(`${daysStr}: ${hoursStr}`);
    });

    return formatted;
  }, [formatTo12Hour, getShortDayName]);

  const isSalonOpen = useCallback((salon) => {
    if (!salon?.weekly_hours) return null;

    const now = currentTime;
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinutes;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[dayOfWeek];
    const todayHours = salon.weekly_hours[today];

    if (!todayHours || !todayHours.is_open || !todayHours.start_time || !todayHours.end_time) {
      return false;
    }

    const [startHours, startMinutes] = todayHours.start_time.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;

    const [endHours, endMinutes] = todayHours.end_time.split(':').map(Number);
    const endTime = endHours * 60 + endMinutes;

    return currentTimeMinutes >= startTime && currentTimeMinutes < endTime;
  }, [currentTime]);

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar activeTab="dashboard" title="Salon Browser" subtitle="Find And Book With Salons" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filter Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Available Salons</h2>
          <p className="text-muted-foreground mb-6">Browse verified salons in your area</p>
          
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search salons, services, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between px-3 py-3 sm:py-2 border border-input rounded-md bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:min-w-[180px] text-base sm:text-sm"
                >
                  <span>{categories.find(cat => cat.value === selectedCategory)?.label || 'All Categories'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => {
                          setSelectedCategory(category.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 sm:py-2 text-left hover:bg-accent hover:text-accent-foreground text-base sm:text-sm ${
                          selectedCategory === category.value ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <span>{category.label}</span>
                        {selectedCategory === category.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center justify-between px-3 py-3 sm:py-2 border border-input rounded-md bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:min-w-[160px] text-base sm:text-sm"
                >
                  <span>{sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort By'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSortDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 sm:py-2 text-left hover:bg-accent hover:text-accent-foreground text-base sm:text-sm ${
                          sortBy === option.value ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <span>{option.label}</span>
                        {sortBy === option.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground mb-6">
            {loading ? (
              <div className="animate-pulse">Loading salons...</div>
            ) : (
              totalPages > 1 ? (
                `Showing ${startIndex + 1}-${Math.min(endIndex, filteredSalons.length)} of ${filteredSalons.length} salons (${salons.length} total)`
              ) : (
                `Showing ${filteredSalons.length} of ${salons.length} salons`
              )
            )}
          </div>
        </div>

        {/* Salon Cards */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedSalons.map((salon) => (
              <Card key={salon.salon_id} data-salon-id={salon.salon_id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {(salon.photo_url || salonPhotos[salon.salon_id]) ? (
                      <img 
                        src={salon.photo_url || salonPhotos[salon.salon_id]} 
                        alt={salon.name}
                        className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        onError={(e) => {
                          e.target.src = strandsLogo;
                        }}
                      />
                    ) : (
                      <img 
                        src={strandsLogo} 
                        alt="Strands"
                        className="w-16 h-16 object-contain rounded-lg border flex-shrink-0 bg-gray-50 p-2"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg break-words">{salon.name}</CardTitle>
                      <div className="mt-1">
                      {getCategoryBadge(salon.category)}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {salon.rating || salon.avg_rating || salon.average_rating ? (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">
                          {(salon.rating || salon.avg_rating || salon.average_rating).toFixed(1)}
                        </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-medium text-muted-foreground">N/A</span>
                    </div>
                  )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{salon.address || [salon.city, salon.state].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{salon.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{salon.email}</span>
                  </div>
                  <div className="flex items-start text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      {salon.weekly_hours ? formatHours(salon.weekly_hours).map((hoursText, idx) => (
                        <div key={idx}>{hoursText}</div>
                      )) : <div>N/A</div>}
                    </div>
                  </div>
                  
                  <div className="pt-3 mt-2">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{salon.description}</p>
                </div>
                </div>

                {/* Bottom section with status and buttons - perfectly aligned */}
                <div className="flex items-center justify-between pt-4 mt-auto border-t">
                  <div className={`flex items-center text-sm font-medium ${
                    isSalonOpen(salon) === null ? 'text-gray-500' : 
                    isSalonOpen(salon) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="whitespace-nowrap">{isSalonOpen(salon) === null ? 'N/A' : isSalonOpen(salon) ? 'Open now' : 'Closed'}</span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (user && user.user_id) {
                          trackSalonView(salon.salon_id, user.user_id);
                        }
                        navigate(`/salon/${salon.salon_id}`);
                      }}
                      className="flex-shrink-0"
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      className={`flex-shrink-0 ${
                        salonStatuses[salon.salon_id] === 0
                          ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-60' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                      disabled={salonStatuses[salon.salon_id] === 0}
                      title={salonStatuses[salon.salon_id] === 0 ? 'Salon is not running yet' : salonStatuses[salon.salon_id] === 1 ? 'Book appointment' : 'Loading status...'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const status = salonStatuses[salon.salon_id];
                        if (status === 0) {
                          notifyError('Salon is not running yet');
                          return;
                        }
                        // If status is undefined/null, allow booking (status not loaded yet)
                        // Only allow booking for CUSTOMER role
                        if (!user || user.role !== 'CUSTOMER') {
                          notifyError('Please sign in as a customer to book appointments');
                          navigate('/login');
                          return;
                        }
                        if (user && user.user_id) {
                          trackSalonView(salon.salon_id, user.user_id);
                        }
                        navigate(`/salon/${salon.salon_id}/book`, { state: { salonName: salon.name } });
                      }}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {!loading && filteredSalons.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No salons found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No approved salons are available at the moment.'}
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} - {Math.min(endIndex, filteredSalons.length)} of {filteredSalons.length} salons
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-9 px-3"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              {/* Page Number Input */}
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Page</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputBlur}
                  onWheel={(e) => e.target.blur()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePageInputSubmit(e);
                    }
                  }}
                  className="w-16 h-9 text-center text-sm font-medium border-gray-300 focus:border-primary focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                  style={{ WebkitAppearance: 'textfield' }}
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">of {totalPages}</span>
              </form>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-9 px-3"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}