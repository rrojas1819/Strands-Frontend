import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Building2 } from 'lucide-react';
import StrandsSelect from './ui/strands-select';
import StrandsModal from './ui/strands-modal';

const SALON_CATEGORIES = [
  { value: 'HAIR SALON', label: 'Hair Salon' },
  { value: 'NAIL SALON', label: 'Nail Salon' },
  { value: 'EYELASH STUDIO', label: 'Eyelash Studio' },
  { value: 'SPA & WELLNESS', label: 'Spa & Wellness' },
  { value: 'BARBERSHOP', label: 'Barbershop' },
  { value: 'FULL SERVICE BEAUTY', label: 'Full Service Beauty' }
];

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

export default function SalonRegistrationForm() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(authContext?.user?.email ?? '');
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    category: '',
    description: ''
  });

  useEffect(() => {
    if (authContext?.user?.email) {
      setOwnerEmail(authContext.user.email);
    }
  }, [authContext?.user?.email]);

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)})-${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)})-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleInputChange = (field, value) => {
    console.log('Form input change:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'phone', 'street', 'city', 'state', 'postal_code', 'category', 'description'];
    
    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        setError(`Please fill in the ${field.replace('_', ' ')} field`);
        return false;
      }
    }

    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }

    const zipRegex = /^\d+$/;
    if (!zipRegex.test(formData.postal_code)) {
      setError('Please enter a valid postal code (digits only)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const salonData = {
        name: formData.name,
        phone: formData.phone,
        address: `${formData.street}, ${formData.city}, ${formData.state} ${formData.postal_code}`,
        category: formData.category,
        description: formData.description,
        owner_user_id: authContext?.user?.user_id,
        status: 'PENDING',
        email: ownerEmail,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: 'USA',
        profile_picture_url: ''
      };

      console.log('Salon data to submit:', salonData);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(salonData)
      });

      console.log('Backend response status:', response.status);
      const responseData = await response.json();
      console.log('Backend response data:', responseData);

      if (response.ok) {
        setModalConfig({
          title: 'Registration Successful',
          message: 'Salon registration submitted successfully! Your salon is pending approval.',
          type: 'success',
          onConfirm: () => {
            setShowModal(false);
            navigate('/owner-dashboard');
          }
        });
        setShowModal(true);
      } else {
        throw new Error(responseData.message || 'Registration failed');
      }
      
    } catch (err) {
      console.error('Salon registration error:', err);
      setModalConfig({
        title: 'Registration Failed',
        message: 'Failed to register salon. Please try again.',
        type: 'error'
      });
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Salon Registration</CardTitle>
            <CardDescription>
              Register your salon to start accepting bookings
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Salon Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter salon name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={ownerEmail || ''}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder={ownerEmail ? '' : 'Loading email...'}
                />
                <p className="text-sm text-gray-500">This email is locked to your account</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="123 Main St"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <StrandsSelect
                        id="state"
                        value={formData.state}
                        onValueChange={(value) => handleInputChange('state', value)}
                        placeholder="Select state"
                        options={US_STATES}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        placeholder="12345"
                        required
                      />
                    </div>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="category">Salon Type</Label>
                <StrandsSelect
                  id="category"
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                  placeholder="Select salon type"
                  options={SALON_CATEGORIES}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell customers about your salon..."
                  rows={4}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                id="submit-for-review-button"
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <StrandsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText || 'OK'}
      />
    </div>
  );
}
