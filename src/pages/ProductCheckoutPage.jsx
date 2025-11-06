import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { notifySuccess, notifyError } from '../utils/notifications';
import { ArrowLeft, CreditCard, MapPin, Lock, Check, X, Trash2 } from 'lucide-react';
import StrandsModal from '../components/StrandsModal';

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

export default function ProductCheckoutPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { salonId } = useParams();
  
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [salonName, setSalonName] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [enteringNewCard, setEnteringNewCard] = useState(false);
  
  // Modal states
  const [showDeleteAddressModal, setShowDeleteAddressModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  
  // Billing address state
  const [billingAddress, setBillingAddress] = useState(null);
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
  
  // Credit card state
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [saveCard, setSaveCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    card_number: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    cardholder_name: ''
  });
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
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
    
    if (!salonId) {
      notifyError('No salon selected. Please start over.');
      navigate('/dashboard');
      return;
    }
    
    fetchSalonName();
    fetchCart();
    fetchBillingAddress();
    fetchSavedCards();
  }, [user, salonId]);

  const fetchSalonName = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const salons = data.data || [];
        const salon = salons.find(s => s.salon_id == salonId);
        if (salon) {
          setSalonName(salon.name);
        }
      }
    } catch (err) {
      console.error('Error fetching salon name:', err);
    }
  };
  
  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/products/customer/view-cart/${salonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        setCartItems(items);
        const calculatedSubtotal = items.reduce((sum, item) => {
          return sum + (parseFloat(item.price || 0) * (item.quantity || 0));
        }, 0);
        setSubtotal(calculatedSubtotal);
        const calculatedTax = calculatedSubtotal * 0.06625;
        setTax(calculatedTax);
        setTotal(calculatedSubtotal + calculatedTax);
      } else if (response.status === 404) {
        setCartItems([]);
        setSubtotal(0);
        setTax(0);
        setTotal(0);
      } else {
        const errorData = await response.json();
        notifyError(errorData.message || 'Failed to load cart');
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      notifyError('Failed to load cart');
    }
  };
  
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
          // Pre-fill form with existing address
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
          // No billing address exists, show form
          setBillingAddress(null);
          setEditingAddress(true);
        }
      } else if (response.status === 404) {
        // No billing address exists, show form
        setBillingAddress(null);
        setEditingAddress(true);
      }
    } catch (err) {
      console.error('Error fetching billing address:', err);
      // If error, show form to allow user to create address
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
        // Auto-select first card if available
        if (data.credit_cards && data.credit_cards.length > 0 && !selectedCardId) {
          setSelectedCardId(data.credit_cards[0].credit_card_id);
        }
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
      
      // Validate required fields
      if (!addressForm.full_name || !addressForm.address_line1 || !addressForm.city || 
          !addressForm.state || !addressForm.postal_code || !addressForm.country) {
        notifyError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      
      let response;
      if (billingAddress) {
        // Update existing address
        response = await fetch(`${apiUrl}/payments/updateBillingAddress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressForm)
        });
      } else {
        // Create new address
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
        // Fetch the updated address
        const addressResponse = await fetch(`${apiUrl}/payments/getBillingAddress`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          setBillingAddress(addressData.billing_address);
        }
        setEditingAddress(false);
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
  
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCardId && !enteringNewCard) {
      notifyError('Please select a card or enter a new one');
      return;
    }
    
    if (enteringNewCard) {
      // Validate new card form
      if (!cardForm.card_number || !cardForm.cvc || !cardForm.exp_month || !cardForm.exp_year || !cardForm.cardholder_name) {
        notifyError('Please fill in all card fields');
        return;
      }
      
      // Validate card number format (basic)
      const cleanedCardNumber = cardForm.card_number.replace(/\s/g, '');
      if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
        notifyError('Invalid card number');
        return;
      }
      
      if (cardForm.cvc.length < 3 || cardForm.cvc.length > 4) {
        notifyError('Invalid CVC');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      let creditCardId;
      let billingAddressId;
      
      // Get billing address ID
      const addressResponse = await fetch(`${apiUrl}/payments/getBillingAddress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!addressResponse.ok) {
        if (addressResponse.status === 404) {
          notifyError('Please save your billing address first before adding a payment method.');
          setEditingAddress(true);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch billing address');
      }
      
      const addressData = await addressResponse.json();
      
      if (!addressData.billing_address || !addressData.billing_address.billing_address_id) {
        notifyError('Please save your billing address first before adding a payment method.');
        setEditingAddress(true);
        setLoading(false);
        return;
      }
      
      billingAddressId = addressData.billing_address.billing_address_id;
      
      // Handle card selection/creation
      if (enteringNewCard) {
        // Save card (permanent or temporary)
        if (saveCard) {
          // Save as permanent card
          // Parse month and year - handle string "03" vs number 3
          const expMonth = typeof cardForm.exp_month === 'string' 
            ? parseInt(cardForm.exp_month, 10) 
            : cardForm.exp_month;
          const expYear = typeof cardForm.exp_year === 'string' 
            ? parseInt(cardForm.exp_year, 10) 
            : cardForm.exp_year;
          
          const cardPayload = {
            card_number: cardForm.card_number.replace(/\s/g, ''),
            cvc: cardForm.cvc,
            exp_month: expMonth,
            exp_year: expYear,
            billing_address_id: billingAddressId
          };
          
          // Validate payload before sending
          if (!cardPayload.card_number || cardPayload.card_number.length < 13) {
            throw new Error('Please enter a valid card number.');
          }
          if (!cardPayload.cvc || cardPayload.cvc.length < 3) {
            throw new Error('Please enter a valid CVC code.');
          }
          if (!cardPayload.exp_month || cardPayload.exp_month < 1 || cardPayload.exp_month > 12) {
            throw new Error('Please select a valid expiration month.');
          }
          if (!cardPayload.exp_year || cardPayload.exp_year < new Date().getFullYear()) {
            throw new Error('Please select a valid expiration year.');
          }
          if (!cardPayload.billing_address_id) {
            throw new Error('Billing address is required. Please save your billing address first.');
          }
          
          // Ensure all values are numbers (not NaN)
          if (isNaN(cardPayload.exp_month) || isNaN(cardPayload.exp_year)) {
            throw new Error('Invalid expiration date. Please check month and year.');
          }
          
          console.log('Saving permanent card with payload:', {
            ...cardPayload,
            card_number: cardPayload.card_number.substring(0, 4) + '****',
            cvc: '***'
          });
          
          const cardResponse = await fetch(`${apiUrl}/payments/saveCreditCard`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cardPayload)
          });
          
          let cardData;
          try {
            cardData = await cardResponse.json();
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Server returned an invalid response. Please try again.');
          }
          
          if (!cardResponse.ok) {
            // Log full error details for debugging
            console.error('Card save error - Full details:', {
              status: cardResponse.status,
              statusText: cardResponse.statusText,
              headers: Object.fromEntries(cardResponse.headers.entries()),
              data: cardData,
              payload: {
                ...cardPayload,
                card_number: cardPayload.card_number.substring(0, 4) + '****',
                cvc: '***'
              }
            });
            
            // Provide specific error messages for card validation failures
            let errorMessage = cardData.message || 'Failed to save card';
            if (cardData.message && (cardData.message.includes('Invalid card number') || cardData.message.includes('Luhn'))) {
              errorMessage = 'Invalid card number. Please check your card details and try again.';
            } else if (cardData.message && cardData.message.includes('expiration')) {
              errorMessage = 'Invalid expiration date. Please check the month and year.';
            } else if (cardData.message && cardData.message.includes('CVC')) {
              errorMessage = 'Invalid CVC code. Please check the 3-4 digit code on the back of your card.';
            } else if (cardData.message && cardData.message.includes('already saved')) {
              errorMessage = 'This card is already saved. Please use your saved card.';
            } else if (cardData.message && cardData.message.includes('billing address')) {
              errorMessage = 'Billing address not found. Please save your billing address first.';
            } else if (cardResponse.status === 500) {
              // 500 errors are backend issues - check backend console for actual error
              errorMessage = cardData.message || 'Server error occurred. The backend may be experiencing issues. Please check the backend console logs for details.';
              console.error('Backend 500 Error - Check backend console for the actual error stack trace');
            }
            throw new Error(errorMessage);
          }
          
          creditCardId = cardData.data.credit_card_id;
        } else {
          // Save as temporary card (for one-time use)
          // Parse month and year - handle string "03" vs number 3
          const expMonth = typeof cardForm.exp_month === 'string' 
            ? parseInt(cardForm.exp_month, 10) 
            : cardForm.exp_month;
          const expYear = typeof cardForm.exp_year === 'string' 
            ? parseInt(cardForm.exp_year, 10) 
            : cardForm.exp_year;
          
          const cardPayload = {
            card_number: cardForm.card_number.replace(/\s/g, ''),
            cvc: cardForm.cvc,
            exp_month: expMonth,
            exp_year: expYear,
            billing_address_id: billingAddressId
          };
          
          // Validate payload before sending
          if (!cardPayload.card_number || cardPayload.card_number.length < 13) {
            throw new Error('Please enter a valid card number.');
          }
          if (!cardPayload.cvc || cardPayload.cvc.length < 3) {
            throw new Error('Please enter a valid CVC code.');
          }
          if (!cardPayload.exp_month || cardPayload.exp_month < 1 || cardPayload.exp_month > 12) {
            throw new Error('Please select a valid expiration month.');
          }
          if (!cardPayload.exp_year || cardPayload.exp_year < new Date().getFullYear()) {
            throw new Error('Please select a valid expiration year.');
          }
          if (!cardPayload.billing_address_id) {
            throw new Error('Billing address is required. Please save your billing address first.');
          }
          
          // Ensure all values are numbers (not NaN)
          if (isNaN(cardPayload.exp_month) || isNaN(cardPayload.exp_year)) {
            throw new Error('Invalid expiration date. Please check month and year.');
          }
          
          console.log('Saving temporary card with payload:', {
            ...cardPayload,
            card_number: cardPayload.card_number.substring(0, 4) + '****',
            cvc: '***'
          });
          
          const cardResponse = await fetch(`${apiUrl}/payments/saveTempCreditCard`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cardPayload)
          });
          
          const cardData = await cardResponse.json();
          
          if (!cardResponse.ok) {
            // Provide specific error messages for card validation failures
            let errorMessage = cardData.message || 'Failed to use temporary card';
            if (cardData.message && (cardData.message.includes('Invalid card number') || cardData.message.includes('Luhn'))) {
              errorMessage = 'Invalid card number. Please check your card details and try again.';
            } else if (cardData.message && cardData.message.includes('expiration')) {
              errorMessage = 'Invalid expiration date. Please check the month and year.';
            } else if (cardData.message && cardData.message.includes('CVC')) {
              errorMessage = 'Invalid CVC code. Please check the 3-4 digit code on the back of your card.';
            } else if (cardData.message && cardData.message.includes('already have a saved')) {
              errorMessage = 'You already have a saved credit card. Please use your saved card or save this new card.';
            } else if (cardData.message && cardData.message.includes('billing address')) {
              errorMessage = 'Billing address not found. Please save your billing address first.';
            } else if (cardResponse.status === 500) {
              // Log full error details for debugging
              console.error('Temporary card save error - Full response:', {
                status: cardResponse.status,
                statusText: cardResponse.statusText,
                data: cardData,
                payload: {
                  ...cardPayload,
                  card_number: cardPayload.card_number.substring(0, 4) + '****',
                  cvc: '***'
                }
              });
              errorMessage = cardData.message || 'Server error. Please check your card details and try again. If the problem persists, contact support.';
            }
            throw new Error(errorMessage);
          }
          
          creditCardId = cardData.data.credit_card_id;
        }
      } else {
        // Use saved card directly
        if (!selectedCardId) {
          throw new Error('Please select a card');
        }
        creditCardId = selectedCardId;
      }
      
      // Process checkout
      const checkoutResponse = await fetch(`${apiUrl}/products/customer/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: parseInt(salonId),
          credit_card_id: creditCardId,
          billing_address_id: billingAddressId
        })
      });
      
      const checkoutData = await checkoutResponse.json();
      
      if (checkoutResponse.ok) {
        notifySuccess('Order placed successfully!');
        navigate('/order-history');
      } else {
        // Provide specific error messages for checkout failures
        let errorMessage = checkoutData.message || 'Checkout failed';
        if (checkoutResponse.status === 404) {
          if (checkoutData.message && checkoutData.message.includes('card')) {
            errorMessage = 'Credit card not found. Please try a different card.';
          } else if (checkoutData.message && checkoutData.message.includes('address')) {
            errorMessage = 'Billing address not found. Please update your billing address.';
          } else if (checkoutData.message && checkoutData.message.includes('cart')) {
            errorMessage = 'Cart not found. Please add items to your cart.';
          }
        } else if (checkoutResponse.status === 400) {
          if (checkoutData.message && checkoutData.message.includes('insufficient')) {
            errorMessage = 'Insufficient stock. Some items may no longer be available.';
          } else if (checkoutData.message && checkoutData.message.includes('stock')) {
            errorMessage = 'Some products are out of stock. Please update your cart.';
          }
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      notifyError(err.message || 'Checkout processing failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    navigate(`/cart/${salonId}`);
  };
  
  const handleDeleteCreditCardClick = (creditCardId, e) => {
    e.stopPropagation(); // Prevent card selection when clicking delete
    setCardToDelete(creditCardId);
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
        // Remove from saved cards list
        setSavedCards(savedCards.filter(card => card.credit_card_id !== cardToDelete));
        // Clear selection if deleted card was selected
        if (selectedCardId === cardToDelete) {
          setSelectedCardId(null);
          if (savedCards.length > 1) {
            // Select first remaining card
            const remainingCards = savedCards.filter(card => card.credit_card_id !== cardToDelete);
            if (remainingCards.length > 0) {
              setSelectedCardId(remainingCards[0].credit_card_id);
            }
          }
        }
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
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={loading}
            className="mb-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Complete Order</h1>
          {salonName && (
            <p className="text-sm text-gray-600 mt-1">Ordering from {salonName}</p>
          )}
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <Card className="mb-4 shadow-lg border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order Summary</CardTitle>
                {salonName && (
                  <span className="text-xs text-gray-500">{salonName}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex justify-between items-center py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ${(parseFloat(item.price || 0) * (item.quantity || 0)).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (6.625%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                      Your saved billing address is shown below. You can edit it or proceed with payment.
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
                            console.log('State changed to:', value);
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
              <form onSubmit={handleCardSubmit} className="space-y-3 flex flex-col flex-grow">
                <p className="text-sm text-gray-600 mb-3">
                  Select a saved card or enter new card details.
                </p>
                
                {/* Saved Cards */}
                {savedCards.length > 0 && !enteringNewCard && (
                  <div className="space-y-2 mb-3 flex-grow">
                    {savedCards.map((card) => (
                      <div
                        key={card.credit_card_id}
                        onClick={() => {
                          setSelectedCardId(card.credit_card_id);
                          setEnteringNewCard(false);
                        }}
                        className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedCardId === card.credit_card_id
                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
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
                          <div className="flex items-center gap-2">
                            {selectedCardId === card.credit_card_id && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCreditCardClick(card.credit_card_id, e)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                              title="Delete card"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      setSelectedCardId(null);
                    }}
                  >
                    Enter Card Details
                  </Button>
                )}
                
                {/* New Card Form */}
                {enteringNewCard && (
                  <div className="space-y-4 border-t pt-4">
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
                            console.log('Month changed to:', value);
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
                            console.log('Year changed to:', value);
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
                    
                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="save_card"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="save_card" className="text-sm text-gray-600 cursor-pointer leading-5">
                        Save this card for future use
                      </Label>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => {
                        setEnteringNewCard(false);
                        if (savedCards.length > 0) {
                          setSelectedCardId(savedCards[0].credit_card_id);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                {/* Total Amount Display */}
                {total > 0 && (
                  <div className="border-t pt-3 mt-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tax</span>
                        <span className="text-sm font-medium">${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-base font-medium text-gray-700">Total</span>
                        <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Process Payment Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 mt-3" 
                  disabled={loading || (!selectedCardId && !enteringNewCard) || !billingAddress || cartItems.length === 0}
                  title={!billingAddress ? 'Please save your billing address first' : cartItems.length === 0 ? 'Your cart is empty' : ''}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : `Complete Order`}
                </Button>
                
                {/* Security Notice */}
                <p className="text-xs text-center text-gray-500 pt-1">
                  <Lock className="h-3 w-3 inline mr-1" />
                  Your payment information is secure and encrypted
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
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
