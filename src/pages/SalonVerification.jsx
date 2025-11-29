import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Building } from 'lucide-react';
import { Notifications } from '../utils/notifications';
import ConfirmationModal from '../components/ConfirmationModal';
import AdminNavbar from '../components/AdminNavbar';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

export default function SalonVerification() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [salonPhotos, setSalonPhotos] = useState({}); // Map of salon_id -> photo URL

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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/browse?status=all`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch salons');
        }

        const data = await response.json();
        setSalons(data.data);
        
        // Fetch photos for approved salons
        const approvedSalons = data.data.filter(s => s.status === 'APPROVED');
        approvedSalons.forEach(salon => {
          fetchSalonPhoto(salon.salon_id);
        });
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError(err.message || 'Failed to load salon registrations.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, [user, navigate]);

  const fetchSalonPhoto = async (salonId) => {
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
      }
    } catch (error) {
      // Silently fail - photo is optional
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

  const filteredSalons = salons.filter(salon => {
    if (filter === 'all') return true;
    return salon.status === filter;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Salon Management</h2>
          <p className="text-muted-foreground">Review and verify salon registrations to ensure only legitimate businesses are listed on the platform.</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex space-x-4">
          <Button 
            id="filter-all-button"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({salonCounts.all})
          </Button>
          <Button 
            id="filter-pending-button"
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            Pending ({salonCounts.pending})
          </Button>
          <Button 
            id="filter-approved-button"
            variant={filter === 'APPROVED' ? 'default' : 'outline'}
            onClick={() => setFilter('APPROVED')}
          >
            Approved ({salonCounts.approved})
          </Button>
          <Button 
            id="filter-rejected-button"
            variant={filter === 'REJECTED' ? 'default' : 'outline'}
            onClick={() => setFilter('REJECTED')}
          >
            Rejected ({salonCounts.rejected})
          </Button>
        </div>

            {/* Salon Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSalons.map((salon) => (
                <Card key={salon.salon_id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    {salon.status === 'APPROVED' && salonPhotos[salon.salon_id] ? (
                      <img 
                        src={salonPhotos[salon.salon_id]} 
                        alt={salon.name}
                        className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        onError={(e) => {
                          e.target.src = strandsLogo;
                        }}
                      />
                    ) : salon.status === 'APPROVED' ? (
                      <img 
                        src={strandsLogo} 
                        alt="Strands"
                        className="w-16 h-16 object-contain rounded-lg border flex-shrink-0 bg-gray-50 p-2"
                      />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{salon.name}</CardTitle>
                      <CardDescription className="mt-1 whitespace-nowrap">
                        <Building className="w-4 h-4 inline mr-1" />
                        {salon.category.replace('_', ' ')}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(salon.status)}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Owner:</span>
                    <span className="ml-2">{salon.owner_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{salon.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{salon.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{salon.address || [salon.city, salon.state, salon.postal_code].filter(Boolean).join(', ')}</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{salon.description}</p>
                  </div>
                </div>

                {salon.status === 'PENDING' && (
                  <div className="flex space-x-2 pt-4 mt-auto">
                    <Button 
                      id={`approve-salon-${salon.salon_id}`}
                      onClick={() => handleApprove(salon.salon_id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      id={`reject-salon-${salon.salon_id}`}
                      onClick={() => handleReject(salon.salon_id)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
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