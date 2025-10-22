import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Building2 } from 'lucide-react';

const SALON_CATEGORIES = [
  { value: 'HAIR SALON', label: 'Hair Salon' },
  { value: 'NAIL SALON', label: 'Nail Salon' },
  { value: 'EYELASH STUDIO', label: 'Eyelash Studio' },
  { value: 'SPA & WELLNESS', label: 'Spa & Wellness' },
  { value: 'BARBERSHOP', label: 'Barbershop' },
  { value: 'FULL SERVICE BEAUTY', label: 'Full Service Beauty' }
];

export default function SalonRegistrationForm() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleInputChange = (field, value) => {
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

    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(formData.postal_code)) {
      setError('Please enter a valid US postal code (12345 or 12345-6789)');
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
        email: authContext?.user?.email || '',
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: 'USA',
        profile_picture_url: ''
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Salon data to submit:', salonData);
      
      alert('Salon registration submitted successfully! Your salon is pending approval.');
      navigate('/owner-dashboard');
      
    } catch (err) {
      console.error('Salon registration error:', err);
      setError('Failed to register salon. Please try again.');
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
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
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State"
                        required
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
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salon type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALON_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
}