import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import ConfirmationModal from '../components/ConfirmationModal';
import AdminNavbar from '../components/AdminNavbar';
import StrandsSelect from '../components/ui/strands-select';
const strandsLogo = '/strands-logo-new.png';

export default function SalonVerification() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [sortBy, setSortBy] = useState('recent'); // recent, a-z, z-a (backend handles sorting, no ratings for admin)
  
  const sortOptions = [
    { value: 'recent', label: 'Default' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' }
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [salonPhotos, setSalonPhotos] = useState({}); // Map of salon_id -> photo URL
  const fetchingPhotosRef = useRef(new Set()); // Track which photos are currently being fetched
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const salonsPerPage = 9;

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    const fetchSalons = async () => {
      setLoading(true);
      setError('');
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
            `${import.meta.env.VITE_API_URL}/salons/browse?status=all&sort=${sortBy}&limit=${limit}&offset=${offset}`,
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
                `${import.meta.env.VITE_API_URL}/salons/browse?status=all&sort=${sortBy}`,
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

        setSalons(allSalons);
        
        // Use photo_url from backend response if available (instant, no extra API call)
        const photosMap = {};
        allSalons.forEach(salon => {
          if (salon.photo_url) {
            photosMap[salon.salon_id] = salon.photo_url;
          }
        });
        
        // Update photos state with backend-provided photos immediately
        if (Object.keys(photosMap).length > 0) {
          setSalonPhotos(prev => ({ ...prev, ...photosMap }));
        }
        
        // Only fetch photos separately for salons that don't have photo_url from backend (batch fetch for speed)
        const salonsToFetch = allSalons.filter(salon => !salon.photo_url && salonPhotos[salon.salon_id] === undefined);
        if (salonsToFetch.length > 0) {
          // Batch fetch all missing photos in parallel for faster loading
          const photoPromises = salonsToFetch.map(salon => fetchSalonPhoto(salon.salon_id));
          Promise.allSettled(photoPromises).catch(err => {
            console.error('Error fetching some salon photos:', err);
          });
        }
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError(err.message || 'Failed to load salon registrations.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, [user, navigate, sortBy]); // Refetch when sortBy changes (backend handles sorting)

  const fetchSalonPhoto = async (salonId) => {
    // Skip if already fetched, cached as null, or currently being fetched
    if (salonPhotos[salonId] !== undefined || fetchingPhotosRef.current.has(salonId)) {
      return;
    }
    
    // Mark as being fetched
    fetchingPhotosRef.current.add(salonId);
    
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/file/get-salon-photo?salon_id=${salonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSalonPhotos(prev => ({
          ...prev,
          [salonId]: data.url || null
        }));
      } else {
        // Cache 404s to prevent refetching
        setSalonPhotos(prev => ({
          ...prev,
          [salonId]: null
        }));
      }
    } catch (error) {
      console.error(`Error fetching photo for salon ${salonId}:`, error);
      // Cache network errors as null
      setSalonPhotos(prev => ({
        ...prev,
        [salonId]: null
      }));
    } finally {
      // Remove from fetching set
      fetchingPhotosRef.current.delete(salonId);
    }
  };

  const handleApprove = (salonId) => {
    const salon = salons.find(s => s.salon_id === salonId);
    const salonName = salon ? salon.name : 'Salon';
    
    setModalData({
      salonId,
      salonName,
      action: 'approve',
      title: 'Approve Salon',
      message: `Are you sure you want to approve "${salonName}"?\n\nThis salon will be approved and become visible to customers on the platform.`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success'
    });
    setModalOpen(true);
  };

  const handleReject = (salonId) => {
    const salon = salons.find(s => s.salon_id === salonId);
    const salonName = salon ? salon.name : 'Salon';
    
    setModalData({
      salonId,
      salonName,
      action: 'reject',
      title: 'Reject Salon',
      message: `Are you sure you want to reject "${salonName}"?\n\nThis salon registration will be rejected and will not be approved for the platform.`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger'
    });
    setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    if (!modalData) return;
    
    const { salonId, salonName, action } = modalData;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salon_id: salonId,
          status: action === 'approve' ? 'APPROVED' : 'REJECTED'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} salon`);
      }

      const result = await response.json();
      console.log('Backend response:', result);
      
      // Update local state
      setSalons(prev => prev.map(salon => 
        salon.salon_id === salonId ? { ...salon, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : salon
      ));
      
      // Show appropriate notification
      if (action === 'approve') {
        Notifications.salonApproved(salonName);
      } else {
        Notifications.salonRejected(salonName);
      }
      
    } catch (error) {
      console.error(`Error ${action}ing salon:`, error);
      Notifications.notifyError(
        `Failed to ${action} salon`,
        error.message || `Unable to ${action} salon. Please try again.`
      );
    }
    
    // Close modal
    setModalOpen(false);
    setModalData(null);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const handleLogout = () => {
    Notifications.logoutSuccess();
    logout();
  };

  // Memoize filtered salons (client-side filtering only, sorting is done by backend)
  const filteredSalons = useMemo(() => {
    let filtered = salons.filter(salon => {
    if (filter === 'all') return true;
    return salon.status === filter;
  });

    // Backend handles sorting, so we just return filtered results
    return filtered;
  }, [salons, filter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue('1');
  }, [filter]);
  
  // Refetch salons when sort changes (backend handles sorting for ALL salons)
  useEffect(() => {
    if (user && user.role === 'ADMIN' && salons.length > 0) {
      const fetchSalons = async () => {
        setLoading(true);
        setError('');
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
              `${import.meta.env.VITE_API_URL}/salons/browse?status=all&sort=${sortBy}&limit=${limit}&offset=${offset}`,
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
                  `${import.meta.env.VITE_API_URL}/salons/browse?status=all&sort=${sortBy}`,
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
        }
      };

      fetchSalons();
    }
  }, [sortBy, user]);

  // Calculate pagination
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

  // Calculate counts for filter buttons
  const salonCounts = {
    all: salons.length,
    pending: salons.filter(s => s.status === 'PENDING').length,
    approved: salons.filter(s => s.status === 'APPROVED').length,
    rejected: salons.filter(s => s.status === 'REJECTED').length
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    
    switch (status) {
      case 'PENDING':
        return <div className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100`}><Clock className="w-3 h-3 mr-1" />Pending</div>;
      case 'APPROVED':
        return <div className={`${baseClasses} bg-green-100 text-green-800 border-green-200 hover:bg-green-100`}><CheckCircle className="w-3 h-3 mr-1" />Approved</div>;
      case 'REJECTED':
        return <div className={`${baseClasses} bg-red-100 text-red-800 border-red-200 hover:bg-red-100`}><XCircle className="w-3 h-3 mr-1" />Rejected</div>;
      default:
        return <div className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-200`}>{status}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNavbar
        title="Admin Dashboard"
        subtitle="Review and approve salon registrations"
        activeKey="salon-management"
        onLogout={handleLogout}
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
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Salon Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Review and verify salon registrations to ensure only legitimate businesses are listed on the platform.</p>
        </div>

        {/* Filter Buttons and Sort */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              All ({salonCounts.all})
            </Button>
            <Button 
              variant={filter === 'PENDING' ? 'default' : 'outline'}
              onClick={() => setFilter('PENDING')}
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              Pending ({salonCounts.pending})
            </Button>
            <Button 
              variant={filter === 'APPROVED' ? 'default' : 'outline'}
              onClick={() => setFilter('APPROVED')}
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              Approved ({salonCounts.approved})
            </Button>
            <Button 
              variant={filter === 'REJECTED' ? 'default' : 'outline'}
              onClick={() => setFilter('REJECTED')}
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              Rejected ({salonCounts.rejected})
            </Button>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <StrandsSelect
              value={sortBy}
              onValueChange={setSortBy}
              placeholder="Sort By"
              options={sortOptions}
              className="w-full"
            />
          </div>
        </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground mb-6">
              {totalPages > 1 ? (
                `Showing ${startIndex + 1}-${Math.min(endIndex, filteredSalons.length)} of ${filteredSalons.length} salons`
              ) : (
                `Showing ${filteredSalons.length} salons`
              )}
        </div>

            {/* Salon Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedSalons.map((salon) => (
                <Card key={salon.salon_id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {(salon.photo_url || (salonPhotos[salon.salon_id] !== undefined && salonPhotos[salon.salon_id] !== null)) ? (
                      <img 
                        src={salon.photo_url || salonPhotos[salon.salon_id]} 
                        alt={salon.name}
                        className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        onError={(e) => {
                          e.target.src = strandsLogo;
                          setSalonPhotos(prev => ({ ...prev, [salon.salon_id]: null }));
                        }}
                      />
                    ) : (
                      <img 
                        src={strandsLogo} 
                        alt={salonPhotos[salon.salon_id] === undefined ? "Loading..." : "Strands"}
                        className="w-16 h-16 object-contain rounded-lg border flex-shrink-0 bg-gray-50 p-2"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg break-words">{salon.name}</CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                      <Building className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="break-words">{salon.category.replace('_', ' ')}</span>
                    </CardDescription>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                  {getStatusBadge(salon.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-start text-xs sm:text-sm text-muted-foreground">
                    <span className="font-medium flex-shrink-0">Owner:</span>
                    <span className="ml-2 break-words min-w-0">
                      {salon.owner_name || 
                       salon.owner_full_name || 
                       salon.owner?.full_name || 
                       salon.owner?.name ||
                       (salon.owner?.first_name && salon.owner?.last_name ? `${salon.owner.first_name} ${salon.owner.last_name}` : null) ||
                       salon.full_name ||
                       'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="break-all min-w-0">{salon.email}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="break-all">{salon.phone}</span>
                  </div>
                  <div className="flex items-start text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="break-words min-w-0">{salon.address || [salon.city, salon.state, salon.postal_code].filter(Boolean).join(', ')}</span>
                  </div>
                  
                  <div className="pt-3 mt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">{salon.description}</p>
                  </div>
                </div>

                {salon.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 mt-auto">
                    <Button 
                      onClick={() => handleApprove(salon.salon_id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject(salon.salon_id)}
                      variant="destructive"
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSalons.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No salon registrations found for the selected filter.</p>
          </div>
        )}

            {/* Pagination */}
            {totalPages > 1 && (
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
          </>
        )}
      </main>

      {/* Beautiful Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        title={modalData?.title}
        message={modalData?.message}
        confirmText={modalData?.confirmText}
        cancelText={modalData?.cancelText}
        type={modalData?.type}
      />
    </div>
  );
}