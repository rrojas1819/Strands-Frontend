import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { MapPin, Phone, Mail, Star, Clock, Search, Filter, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import { trackSalonView } from '../utils/analytics';
import UserNavbar from '../components/UserNavbar';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function SalonBrowser() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [salonRatings, setSalonRatings] = useState({});
  const [salonPhotos, setSalonPhotos] = useState({}); // Map of salon_id -> photo URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('none'); // none, name-asc, name-desc, rating-desc
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
    { value: 'none', label: 'Default' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'rating-desc', label: 'Highest Rating' }
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

  // Track which salons have already had their ratings fetched to prevent duplicates
  const fetchedRatingsRef = useRef(new Set());
  // Track if we're currently fetching to prevent infinite loops
  const isFetchingRef = useRef(false);
  // Store observer ref for cleanup
  const observerRef = useRef(null);
  
  // Lazy load ratings only when salon cards are visible
  const setupLazyRatingFetch = useCallback((salonsList, token) => {
    if (!salonsList || salonsList.length === 0) return;
    
    // Clean up previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Use Intersection Observer to fetch ratings only when salon cards are visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const salonId = entry.target.dataset.salonId;
            // Use ref to check if already fetched (prevents infinite loop)
            if (salonId && !fetchedRatingsRef.current.has(salonId)) {
              fetchedRatingsRef.current.add(salonId);
              
              // Fetch rating for this salon
              fetch(
                `${import.meta.env.VITE_API_URL}/reviews/salon/${salonId}/all?limit=1&offset=0`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              )
                .then(response => {
                  if (response.ok) {
                    return response.json();
                  }
                  return null;
                })
                .then(ratingData => {
                  if (ratingData) {
                    setSalonRatings(prev => ({
                      ...prev,
                      [salonId]: {
                        avg_rating: ratingData.meta?.avg_rating || null,
                        total: ratingData.meta?.total || 0
                      }
                    }));
                  }
                })
                .catch(() => {
                  // Silently fail - rating is optional
                  // Remove from set on error so it can be retried
                  fetchedRatingsRef.current.delete(salonId);
                });
              
              // Unobserve after fetching to avoid duplicate requests
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px' // Start fetching 50px before card is visible
      }
    );
    
    observerRef.current = observer;
    
    // Observe all salon cards after DOM renders
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      setTimeout(() => {
        const cards = document.querySelectorAll('[data-salon-id]');
        cards.forEach(card => {
          observer.observe(card);
        });
      }, 50);
    });
  }, []); // No dependencies - function is stable

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
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
        // Fetch all salons in batches to ensure we get all of them
        let allSalons = [];
        let offset = 0;
        const limit = 100; // Fetch 100 at a time
        let hasMore = true;

        // Fetch all salons in batches until we get all of them
        while (hasMore) {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED&limit=${limit}&offset=${offset}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            // If limit/offset not supported, try without them
            if (offset === 0) {
              const fallbackResponse = await fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=APPROVED`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
              if (!fallbackResponse.ok) {
                const errorData = await fallbackResponse.json();
                throw new Error(errorData.message || 'Failed to fetch salons');
              }
              const fallbackData = await fallbackResponse.json();
              allSalons = fallbackData.data || [];
              hasMore = false;
            } else {
          const errorData = await response.json();
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

        setSalons(allSalons);
        setLoading(false);
        
        // Only fetch photos immediately (needed for display)
        // Reviews/ratings will be fetched on-demand when salon cards are visible
        // Use existing photos if available to prevent refetching
        const photosMap = { ...salonPhotos }; // Start with existing photos
        const salonsToFetch = allSalons.filter(salon => !photosMap.hasOwnProperty(salon.salon_id));
        
        if (salonsToFetch.length > 0) {
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
                  photosMap[salon.salon_id] = photoData.url || null;
              } catch (parseErr) {
                  // Silently fail - photo parsing error, cache null
                  photosMap[salon.salon_id] = null;
                }
              } else {
                // 404 or other error - cache null to prevent refetching
                photosMap[salon.salon_id] = null;
              }
            } catch (err) {
              // Network error - cache null to prevent retries
              photosMap[salon.salon_id] = null;
            }
          });
          
          // Update photos as they come in
          Promise.allSettled(photoPromises).then(() => {
            setSalonPhotos(prev => ({ ...prev, ...photosMap }));
          });
        }
        
        // Fetch ratings on-demand using Intersection Observer (lazy load when visible)
        // Delay to ensure DOM is ready and clear previous fetched set
        fetchedRatingsRef.current.clear();
        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          setTimeout(() => {
            setupLazyRatingFetch(allSalons, token);
          }, 100);
        });
      } catch (err) {
        setError(err.message || 'Failed to load salons.');
        setLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSalons();
  }, [user, navigate]); // Remove setupLazyRatingFetch from dependencies


  // Memoize filtered and sorted salons to avoid recalculating on every render
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

    // Apply sorting
    if (sortBy === 'name-asc') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'rating-desc') {
      filtered = [...filtered].sort((a, b) => {
        const ratingA = salonRatings[a.salon_id]?.avg_rating;
        const ratingB = salonRatings[b.salon_id]?.avg_rating;
        
        // If both have ratings, sort by rating descending
        if (ratingA != null && ratingB != null) {
          return ratingB - ratingA;
        }
        // If only one has rating, prioritize it
        if (ratingA != null && ratingB == null) return -1;
        if (ratingA == null && ratingB != null) return 1;
        // If neither has rating, maintain original order (chronological)
        return b.salon_id - a.salon_id;
      });
    } else {
      // Default: chronological order (most recent first - higher salon_id = more recent)
      filtered = [...filtered].sort((a, b) => b.salon_id - a.salon_id);
    }

    return filtered;
  }, [salons, searchTerm, selectedCategory, sortBy, salonRatings]);

  // Reset to page 1 when filters, search, or sort change
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue('1');
  }, [searchTerm, selectedCategory, sortBy]);

  // Calculate pagination (must be before useEffect that uses it)
  const totalPages = Math.ceil(filteredSalons.length / salonsPerPage);
  const startIndex = (currentPage - 1) * salonsPerPage;
  const endIndex = startIndex + salonsPerPage;
  const paginatedSalons = filteredSalons.slice(startIndex, endIndex);

  // Load ratings when needed (for lazy loading or when sorting by rating)
  useEffect(() => {
    if (!loading) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // If sorting by rating, load ratings for all filtered salons
        if (sortBy === 'rating-desc') {
          const salonsToFetch = filteredSalons.filter(salon => 
            !fetchedRatingsRef.current.has(salon.salon_id)
          );
          
          if (salonsToFetch.length > 0) {
            // Fetch ratings for all filtered salons in parallel
            const ratingPromises = salonsToFetch.map(salon => {
              fetchedRatingsRef.current.add(salon.salon_id);
              return fetch(
                `${import.meta.env.VITE_API_URL}/reviews/salon/${salon.salon_id}/all?limit=1&offset=0`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
                .then(response => response.ok ? response.json() : null)
                .then(ratingData => {
                  if (ratingData) {
                    setSalonRatings(prev => ({
                      ...prev,
                      [salon.salon_id]: {
                        avg_rating: ratingData.meta?.avg_rating || null,
                        total: ratingData.meta?.total || 0
                      }
                    }));
                  }
                })
                .catch(() => {
                  fetchedRatingsRef.current.delete(salon.salon_id);
                });
            });
            
            Promise.allSettled(ratingPromises);
          }
        } else {
          // Otherwise, lazy load ratings only for visible salons
          if (paginatedSalons.length > 0) {
            requestAnimationFrame(() => {
              setTimeout(() => {
                setupLazyRatingFetch(paginatedSalons, token);
              }, 100);
            });
          }
        }
      }
    }
  }, [paginatedSalons, filteredSalons, loading, sortBy, setupLazyRatingFetch]);

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
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    {salonPhotos[salon.salon_id] ? (
                      <img 
                        src={salonPhotos[salon.salon_id]} 
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
                    <CardTitle className="text-lg">{salon.name}</CardTitle>
                      <div className="mt-1">
                      {getCategoryBadge(salon.category)}
                      </div>
                    </div>
                  </div>
                  {salonRatings[salon.salon_id]?.avg_rating ? (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{salonRatings[salon.salon_id].avg_rating}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-medium text-muted-foreground">N/A</span>
                    </div>
                  )}
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
                </div>
                
                <div className="pt-2 border-t mt-4">
                  <p className="text-sm text-muted-foreground">{salon.description}</p>
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
                        if (user) {
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
                      className="bg-primary hover:bg-primary/90 flex-shrink-0"
                      onClick={() => {
                        if (user) {
                          trackSalonView(salon.salon_id, user.user_id);
                        }
                        navigate(`/salon/${salon.salon_id}/book`);
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