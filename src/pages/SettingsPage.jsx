import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { notifySuccess, notifyError } from '../utils/notifications';
import { ArrowLeft, CreditCard, MapPin, Lock, Check, X, Trash2 } from 'lucide-react';
import StrandsModal from '../components/StrandsModal';
import UserNavbar from '../components/UserNavbar';

// Card brand detection function - matches backend logic
const detectCardBrand = (cardNumber) => {
  if (!cardNumber) return null;
  
  // Remove all spaces and non-numeric characters
  const digits = cardNumber.toString().replace(/\s/g, '').replace(/\D/g, '');
  
  // Visa: starts with 4
  if (/^4/.test(digits)) {
    return 'VISA';
  }
  
  // Mastercard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits)) {
    return 'MASTERCARD';
  }
  // Check for Mastercard range 2221-2720
  if (/^22/.test(digits)) {
    const prefix4 = parseInt(digits.substring(0, 4));
    if (prefix4 >= 2221 && prefix4 <= 2720) {
      return 'MASTERCARD';
    }
  }
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(digits)) {
    return 'AMEX';
  }
  
  // Discover: starts with 6011, 622126-622925, 644-649, 65
  if (/^6011/.test(digits) || /^622[1-9]/.test(digits) || /^64[4-9]/.test(digits) || /^65/.test(digits)) {
    return 'DISCOVER';
  }
  
  // Diners Club: starts with 300-305, 36, or 38
  if (/^3[068]/.test(digits) || /^30[0-5]/.test(digits)) {
    return 'DINERS_CLUB';
  }
  
  // JCB: starts with 35
  if (/^35/.test(digits)) {
    return 'JCB';
  }
  
  return null;
};

// Card brand logo with error fallback
const BrandLogoImage = ({ src, alt, fallbackText, fallbackColor }) => {
  const [imgError, setImgError] = React.useState(false);
  
  if (imgError) {
    return (
      <span className="font-bold text-xs" style={{ color: fallbackColor }}>
        {fallbackText}
      </span>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-contain"
      style={{ padding: '1px', maxWidth: '100%', maxHeight: '100%' }}
      onError={() => setImgError(true)}
    />
  );
};

// Card brand logos component - using actual brand logos
const CardBrandLogo = ({ brand }) => {
  const brandUpper = brand?.toUpperCase() || '';
  
  if (brandUpper.includes('VISA')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 rounded shadow-sm overflow-hidden bg-white border border-gray-200">
        <BrandLogoImage 
          src="/VISA-logo.png" 
          alt="Visa" 
          fallbackText="VISA"
          fallbackColor="#1336CC"
        />
      </div>
    );
  } else if (brandUpper.includes('MASTERCARD')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 rounded shadow-sm overflow-hidden bg-white border border-gray-200">
        <BrandLogoImage 
          src="/mc.png" 
          alt="Mastercard" 
          fallbackText="MC"
          fallbackColor="#EB001B"
        />
      </div>
    );
  } else if (brandUpper.includes('AMEX') || brandUpper.includes('AMERICAN')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 rounded shadow-sm overflow-hidden bg-white border border-gray-200">
        <BrandLogoImage 
          src="/amex.png" 
          alt="American Express" 
          fallbackText="AMEX"
          fallbackColor="#006FCF"
        />
      </div>
    );
  } else if (brandUpper.includes('DISCOVER')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 rounded shadow-sm overflow-hidden bg-white border border-gray-200">
        <BrandLogoImage 
          src="/discover.png" 
          alt="Discover" 
          fallbackText="DISC"
          fallbackColor="#FF6000"
        />
      </div>
    );
  } else if (brandUpper.includes('DINERS') || brandUpper.includes('DINERS_CLUB')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 bg-gradient-to-br from-[#007AFF] to-[#0051D5] rounded text-white text-[9px] font-bold shadow-sm">
        DINE
      </div>
    );
  } else if (brandUpper.includes('JCB')) {
    return (
      <div className="flex items-center justify-center w-14 h-9 bg-gradient-to-br from-[#1B6BFF] to-[#0A4FC4] rounded text-white text-[10px] font-bold shadow-sm">
        JCB
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center w-14 h-9 bg-gray-400 rounded text-white text-[10px] font-bold shadow-sm">
      {brandUpper.substring(0, 4)}
    </div>
  );
};

export default function SettingsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  const [billingAddress, setBillingAddress] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Billing address form state
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: ''
  });
  
  // Credit card form state
  const [enteringNewCard, setEnteringNewCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    card_number: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    cardholder_name: ''
  });
  
  // Delete modals
  const [showDeleteAddressModal, setShowDeleteAddressModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  
  // US States for dropdown
  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  
  // Generate years (current year to 20 years ahead)
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return year.toString();
  });
  
  // Generate months (1-12)
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    return { value: month, label: month };
  });
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBillingAddress();
    fetchSavedCards();
  }, [user]);
  
  const fetchBillingAddress = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/payments/getBillingAddress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.billing_address) {
          setBillingAddress(data.billing_address);
          setAddressForm({
            full_name: data.billing_address.full_name || '',
            address_line1: data.billing_address.address_line1 || '',
            address_line2: data.billing_address.address_line2 || '',
            city: data.billing_address.city || '',
            state: data.billing_address.state || '',
            postal_code: data.billing_address.postal_code || '',
            country: data.billing_address.country || 'USA',
            phone: data.billing_address.phone || ''
          });
          setEditingAddress(false);
        } else {
          setBillingAddress(null);
          setEditingAddress(true);
        }
      } else if (response.status === 404) {
        setBillingAddress(null);
        setEditingAddress(true);
      }
    } catch (err) {
      console.error('Error fetching billing address:', err);
      setBillingAddress(null);
      setEditingAddress(true);
    }
  };
  
  const fetchSavedCards = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/payments/getCreditCards`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedCards(data.credit_cards || []);
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    }
  };
  
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!addressForm.full_name || !addressForm.address_line1 || !addressForm.city || 
          !addressForm.state || !addressForm.postal_code || !addressForm.country) {
        notifyError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      
      let response;
      if (billingAddress) {
        response = await fetch(`${apiUrl}/payments/updateBillingAddress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressForm)
        });
      } else {
        response = await fetch(`${apiUrl}/payments/createBillingAddress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressForm)
        });
      }
      
      const data = await response.json();
      
      if (response.ok) {
        notifySuccess('Billing address saved successfully');
        const addressResponse = await fetch(`${apiUrl}/payments/getBillingAddress`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          setBillingAddress(addressData.billing_address);
          setEditingAddress(false);
        }
      } else {
        notifyError(data.message || 'Failed to save billing address');
      }
    } catch (err) {
      console.error('Error saving billing address:', err);
      notifyError('Failed to save billing address');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCreditCardClick = (cardId, e) => {
    e.stopPropagation();
    setCardToDelete(cardId);
    setShowDeleteCardModal(true);
  };
  
  const handleDeleteCreditCard = async () => {
    if (!cardToDelete) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/payments/deleteCreditCard/${cardToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        notifySuccess('Credit card deleted successfully');
        setSavedCards(savedCards.filter(card => card.credit_card_id !== cardToDelete));
        setShowDeleteCardModal(false);
        setCardToDelete(null);
      } else {
        notifyError(data.message || 'Failed to delete credit card');
        setShowDeleteCardModal(false);
        setCardToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting credit card:', err);
      notifyError('Failed to delete credit card');
      setShowDeleteCardModal(false);
      setCardToDelete(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    
    if (!cardForm.card_number || !cardForm.cvc || !cardForm.exp_month || !cardForm.exp_year || !cardForm.cardholder_name) {
      notifyError('Please fill in all card fields');
      return;
    }
    
    const cleanedCardNumber = cardForm.card_number.replace(/\s/g, '');
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      notifyError('Invalid card number');
      return;
    }
    
    if (cardForm.cvc.length < 3 || cardForm.cvc.length > 4) {
      notifyError('Invalid CVC');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      const addressResponse = await fetch(`${apiUrl}/payments/getBillingAddress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!addressResponse.ok || addressResponse.status === 404) {
        notifyError('Please save your billing address first before adding a payment method.');
        setLoading(false);
        return;
      }
      
      const addressData = await addressResponse.json();
      if (!addressData.billing_address || !addressData.billing_address.billing_address_id) {
        notifyError('Please save your billing address first before adding a payment method.');
        setLoading(false);
        return;
      }
      
      const billingAddressId = addressData.billing_address.billing_address_id;
      
      const expMonth = typeof cardForm.exp_month === 'string' 
        ? parseInt(cardForm.exp_month, 10) 
        : cardForm.exp_month;
      const expYear = typeof cardForm.exp_year === 'string' 
        ? parseInt(cardForm.exp_year, 10) 
        : cardForm.exp_year;
      
      const cardPayload = {
        card_number: cleanedCardNumber,
        cvc: cardForm.cvc,
        exp_month: expMonth,
        exp_year: expYear,
        billing_address_id: billingAddressId
      };
      
      const cardResponse = await fetch(`${apiUrl}/payments/saveCreditCard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cardPayload)
      });
      
      const cardData = await cardResponse.json();
      
      if (cardResponse.ok) {
        notifySuccess('Credit card saved successfully');
        setCardForm({
          card_number: '',
          cvc: '',
          exp_month: '',
          exp_year: '',
          cardholder_name: ''
        });
        setEnteringNewCard(false);
        fetchSavedCards();
      } else {
        notifyError(cardData.message || 'Failed to save credit card');
      }
    } catch (err) {
      console.error('Error saving credit card:', err);
      notifyError('Failed to save credit card');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmDeleteAddress = async () => {
    setShowDeleteAddressModal(false);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/payments/deleteBillingAddress`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        notifySuccess('Billing address deleted successfully');
        setBillingAddress(null);
        setAddressForm({
          full_name: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'USA',
          phone: ''
        });
        setEditingAddress(true);
        fetchSavedCards();
      } else {
        notifyError(data.message || 'Failed to delete billing address');
      }
    } catch (err) {
      console.error('Error deleting billing address:', err);
      notifyError('Failed to delete billing address');
    }
  };
  
  // Format card number with spaces
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar activeTab="settings" title="Settings" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Payment Settings</h1>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left Column: Billing Address */}
          <Card className="shadow-lg border-gray-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Billing Address</CardTitle>
                </div>
                {billingAddress && !editingAddress && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Saved</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              {billingAddress && !editingAddress ? (
                <div className="space-y-3 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <p className="text-sm text-gray-600 mb-3">
                      Your saved billing address is shown below. You can edit it or delete it.
                    </p>
                    
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Street Address</Label>
                        <p className="text-sm font-medium text-gray-900">{billingAddress.address_line1}</p>
                        {billingAddress.address_line2 && (
                          <p className="text-sm font-medium text-gray-900">{billingAddress.address_line2}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">City</Label>
                          <p className="text-sm font-medium text-gray-900">{billingAddress.city}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">State</Label>
                          <p className="text-sm font-medium text-gray-900">{billingAddress.state}</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Postal Code</Label>
                        <p className="text-sm font-medium text-gray-900">{billingAddress.postal_code}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 pt-2 border-t mt-2">
                      Address is saved. Edit fields above to update.
                    </p>
                  </div>
                  
                  <div className="flex gap-2 mt-auto pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingAddress(true)}
                    >
                      Edit Address
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      onClick={() => setShowDeleteAddressModal(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="text-sm font-medium text-gray-700 mb-2 block">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={addressForm.full_name}
                        onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address_line1" className="text-sm font-medium text-gray-700 mb-2 block">
                        Street Address
                      </Label>
                      <Input
                        id="address_line1"
                        value={addressForm.address_line1}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="123 Main St"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address_line2" className="text-sm font-medium text-gray-700 mb-2 block">
                        Address Line 2 (optional)
                      </Label>
                      <Input
                        id="address_line2"
                        value={addressForm.address_line2}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Apt 4B"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2 block">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="New York"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="state" className="text-sm font-medium text-gray-700 mb-2 block">
                          State
                        </Label>
                        <Select
                          value={addressForm.state}
                          onValueChange={(value) => {
                            setAddressForm(prev => ({ ...prev, state: value }));
                          }}
                        >
                          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {usStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700 mb-2 block">
                        Postal Code
                      </Label>
                      <Input
                        id="postal_code"
                        value={addressForm.postal_code}
                        onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="10001"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium" 
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Address'}
                    </Button>
                    {billingAddress && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => {
                          setEditingAddress(false);
                          fetchBillingAddress();
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Payment Method */}
          <Card className="shadow-lg border-gray-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <div className="space-y-3 flex flex-col flex-grow">
                <p className="text-sm text-gray-600 mb-3">
                  View your saved cards or add a new one.
                </p>
                
                {/* Saved Cards */}
                {savedCards.length > 0 && !enteringNewCard && (
                  <div className="space-y-2 mb-3 flex-grow">
                    {savedCards.map((card) => (
                      <div
                        key={card.credit_card_id}
                        className="relative p-4 border-2 rounded-lg border-gray-200 bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <CardBrandLogo brand={card.brand} />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{card.masked_pan}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCreditCardClick(card.credit_card_id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 flex items-center justify-center"
                            title="Delete card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {savedCards.length === 0 && !enteringNewCard && (
                  <div className="flex-grow flex items-center justify-center">
                    <p className="text-sm text-gray-500 text-center">No saved credit cards</p>
                  </div>
                )}
                
                {/* Enter Card Details Button */}
                {!enteringNewCard && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-gray-300 hover:bg-gray-50 mb-4"
                    onClick={() => {
                      setEnteringNewCard(true);
                    }}
                    disabled={!billingAddress}
                  >
                    {billingAddress ? 'Enter Card Details' : 'Save billing address first'}
                  </Button>
                )}
                
                {/* New Card Form */}
                {enteringNewCard && (
                  <form onSubmit={handleCardSubmit} className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="card_number" className="text-sm font-medium text-gray-700 mb-2 block">
                        Card Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="card_number"
                          value={cardForm.card_number}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            setCardForm({ ...cardForm, card_number: formatted });
                          }}
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      {cardForm.card_number && (
                        <div className="mt-2 flex justify-end">
                          <CardBrandLogo brand={detectCardBrand(cardForm.card_number)} />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="cardholder_name" className="text-sm font-medium text-gray-700 mb-2 block">
                        Cardholder Name
                      </Label>
                      <Input
                        id="cardholder_name"
                        value={cardForm.cardholder_name}
                        onChange={(e) => setCardForm({ ...cardForm, cardholder_name: e.target.value })}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Nate Smith"
                        required={enteringNewCard}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="exp_month" className="text-sm font-medium text-gray-700 mb-2 block">
                          Month
                        </Label>
                        <Select
                          value={cardForm.exp_month}
                          onValueChange={(value) => {
                            setCardForm(prev => ({ ...prev, exp_month: value }));
                          }}
                        >
                          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="MM" value={cardForm.exp_month}>
                              {cardForm.exp_month ? String(cardForm.exp_month).padStart(2, '0') : 'MM'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="exp_year" className="text-sm font-medium text-gray-700 mb-2 block">
                          Year
                        </Label>
                        <Select
                          value={cardForm.exp_year}
                          onValueChange={(value) => {
                            setCardForm(prev => ({ ...prev, exp_year: value }));
                          }}
                        >
                          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="YYYY" value={cardForm.exp_year}>
                              {cardForm.exp_year || 'YYYY'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="cvc" className="text-sm font-medium text-gray-700 mb-2 block">
                          CVV
                        </Label>
                        <Input
                          id="cvc"
                          type="password"
                          value={cardForm.cvc}
                          onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value.replace(/\D/g, '').substring(0, 4) })}
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="123"
                          maxLength={4}
                          required={enteringNewCard}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Card'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 text-sm text-gray-600 hover:text-gray-900"
                        onClick={() => {
                          setEnteringNewCard(false);
                          if (savedCards.length > 0) {
                            // Keep form state for re-entry
                          } else {
                            setCardForm({
                              card_number: '',
                              cvc: '',
                              exp_month: '',
                              exp_year: '',
                              cardholder_name: ''
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Delete Billing Address Modal */}
      <StrandsModal
        isOpen={showDeleteAddressModal}
        onClose={() => setShowDeleteAddressModal(false)}
        onConfirm={handleConfirmDeleteAddress}
        title="Delete Billing Address"
        message="Are you sure you want to delete your billing address? You will need to enter it again."
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />
      
      {/* Delete Credit Card Modal */}
      <StrandsModal
        isOpen={showDeleteCardModal}
        onClose={() => {
          setShowDeleteCardModal(false);
          setCardToDelete(null);
        }}
        onConfirm={handleDeleteCreditCard}
        title="Delete Credit Card"
        message="Are you sure you want to delete this credit card? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
}
