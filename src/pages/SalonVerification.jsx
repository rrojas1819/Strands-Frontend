import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Building, LogOut } from 'lucide-react';

export default function SalonVerification() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    // TODO: Replace with actual API call when backend is ready
    // const fetchSalons = async () => {
    //   setLoading(true);
    //   setError('');
    //   try {
    //     const token = localStorage.getItem('auth_token');
    //     const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/salons`, {
    //       headers: {
    //         'Authorization': `Bearer ${token}`,
    //       },
    //     });

    //     if (!response.ok) {
    //       const errorData = await response.json();
    //       throw new Error(errorData.message || 'Failed to fetch salons');
    //     }

    //     const data = await response.json();
    //     setSalons(data.data);
    //   } catch (err) {
    //     console.error('Error fetching salons:', err);
    //     setError(err.message || 'Failed to load salon registrations.');
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    // fetchSalons();

    // Mock data for now
    const mockSalons = [
      {
        id: 1,
        name: "Bella's Beauty Studio",
        owner: "Bella Johnson",
        email: "bella@bellasbeauty.com",
        phone: "(555) 123-4567",
        address: "123 Main St, New York, NY 10001",
        category: "HAIR SALON",
        status: "PENDING",
        created_at: "2024-01-15T10:30:00Z",
        description: "Full-service hair salon specializing in cuts, coloring, and styling."
      },
      {
        id: 2,
        name: "Nail Art Paradise",
        owner: "Maria Rodriguez",
        email: "maria@nailartparadise.com",
        phone: "(555) 234-5678",
        address: "456 Oak Ave, Los Angeles, CA 90210",
        category: "NAIL SALON",
        status: "APPROVED",
        created_at: "2024-01-10T14:20:00Z",
        description: "Premium nail services with artistic designs and luxury treatments."
      },
      {
        id: 3,
        name: "Zen Spa & Wellness",
        owner: "David Chen",
        email: "david@zenspa.com",
        phone: "(555) 345-6789",
        address: "789 Pine St, Miami, FL 33101",
        category: "SPA & WELLNESS",
        status: "REJECTED",
        created_at: "2024-01-08T09:15:00Z",
        description: "Holistic wellness center offering massage, facials, and relaxation therapies."
      },
      {
        id: 4,
        name: "Elite Barbershop",
        owner: "James Wilson",
        email: "james@elitebarbers.com",
        phone: "(555) 456-7890",
        address: "321 Broadway, Chicago, IL 60601",
        category: "BARBERSHOP",
        status: "PENDING",
        created_at: "2024-01-12T16:45:00Z",
        description: "Traditional barbershop with modern amenities and classic cuts."
      },
      {
        id: 5,
        name: "Luxury Lash Studio",
        owner: "Sarah Kim",
        email: "sarah@luxurylash.com",
        phone: "(555) 567-8901",
        address: "654 Sunset Blvd, Las Vegas, NV 89101",
        category: "EYELASH STUDIO",
        status: "PENDING",
        created_at: "2024-01-14T11:20:00Z",
        description: "Specialized eyelash extensions and lash lift services."
      },
      {
        id: 6,
        name: "Full Service Beauty",
        owner: "Lisa Martinez",
        email: "lisa@fullservicebeauty.com",
        phone: "(555) 678-9012",
        address: "987 Park Ave, Boston, MA 02101",
        category: "FULL SERVICE BEAUTY",
        status: "APPROVED",
        created_at: "2024-01-05T09:30:00Z",
        description: "Complete beauty services including hair, nails, and skincare."
      }
    ];

    // Simulate quick loading for better UX
    setTimeout(() => {
      setSalons(mockSalons);
      setLoading(false);
    }, 300);
  }, [user, navigate]);

  const handleApprove = async (salonId) => {
    // TODO: Implement approve functionality when backend is ready
    console.log('Approving salon:', salonId);
    // Update local state for now
    setSalons(prev => prev.map(salon => 
      salon.id === salonId ? { ...salon, status: 'APPROVED' } : salon
    ));
    // Show success feedback
    alert(`Salon ${salonId} has been approved!`);
  };

  const handleReject = async (salonId) => {
    // TODO: Implement reject functionality when backend is ready
    console.log('Rejecting salon:', salonId);
    // Update local state for now
    setSalons(prev => prev.map(salon => 
      salon.id === salonId ? { ...salon, status: 'REJECTED' } : salon
    ));
    // Show success feedback
    alert(`Salon ${salonId} has been rejected!`);
  };

  const handleLogout = () => {
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
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src="/src/assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png" 
                alt="Strands Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Review and approve salon registrations</p>
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

      {/* Navigation Bar - Updated for UAR 1.5 */}
      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button className="py-4 px-1 border-b-2 border-primary text-primary font-medium text-sm">
              Salon Verification
            </button>
            <Link 
              to="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
            >
              Demographics
            </Link>
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              User Analytics
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              Business Metrics
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm">
              Revenue Analytics
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Salon Verification</h2>
          <p className="text-muted-foreground">Review and verify salon registrations to ensure only legitimate businesses are listed on the platform.</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex space-x-4">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({salonCounts.all})
          </Button>
          <Button 
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            Pending ({salonCounts.pending})
          </Button>
          <Button 
            variant={filter === 'APPROVED' ? 'default' : 'outline'}
            onClick={() => setFilter('APPROVED')}
          >
            Approved ({salonCounts.approved})
          </Button>
          <Button 
            variant={filter === 'REJECTED' ? 'default' : 'outline'}
            onClick={() => setFilter('REJECTED')}
          >
            Rejected ({salonCounts.rejected})
          </Button>
        </div>

        {/* Salon Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => (
            <Card key={salon.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{salon.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <Building className="w-4 h-4 inline mr-1" />
                      {salon.category.replace('_', ' ')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(salon.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Owner:</span>
                    <span className="ml-2">{salon.owner}</span>
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
                    <span>{salon.address}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{salon.description}</p>
                </div>

                {salon.status === 'PENDING' && (
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      onClick={() => handleApprove(salon.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject(salon.id)}
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
    </div>
  );
}
