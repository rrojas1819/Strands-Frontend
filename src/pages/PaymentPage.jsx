import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, RewardsContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { notifySuccess, notifyError } from '../utils/notifications';
import { ArrowLeft, CreditCard, MapPin, Lock, Check, X, Trash2, Gift } from 'lucide-react';
import StrandsModal from '../components/StrandsModal';
import { formatInZone } from '../utils/time';

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

export default function PaymentPage() {
  const { user } = useContext(AuthContext);
  const { setRewardsCount } = useContext(RewardsContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const bookingId = location.state?.bookingId;
  const salonId = location.state?.salonId;
  const bookingAmount = location.state?.amount || 0;
  const bookingDetails = location.state?.bookingDetails || {};
  
  // Debug logging
  useEffect(() => {
    console.log('PaymentPage - Location state:', location.state);
    console.log('PaymentPage - salonId:', salonId);
    console.log('PaymentPage - bookingId:', bookingId);
  }, [location.state, salonId, bookingId]);
  
  const [loading, setLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [enteringNewCard, setEnteringNewCard] = useState(false);
  
  // Loyalty rewards state
  const [availableRewards, setAvailableRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState(bookingAmount);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValidating, setPromoCodeValidating] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [promoCodeData, setPromoCodeData] = useState(null);
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  
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
    
    if (!bookingId) {
      notifyError('No booking found. Please start over.');
      navigate('/dashboard');
      return;
    }
    
    fetchBillingAddress();
    fetchSavedCards();
    if (salonId) {
      fetchAvailableRewards();
    }
    // Initialize discounted amount
    setDiscountedAmount(bookingAmount);
  }, [user, bookingId, salonId, bookingAmount]);
  
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
  
  const fetchAvailableRewards = async () => {
    if (!salonId) return;
    
    setRewardsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/payments/availableRewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: salonId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableRewards(data.rewards || []);
      } else {
        console.error('Failed to fetch rewards:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error data:', errorData);
      }
    } catch (err) {
      console.error('Error fetching available rewards:', err);
    } finally {
      setRewardsLoading(false);
    }
  };
  
  const handleRewardSelect = (reward) => {
    if (selectedReward?.reward_id === reward.reward_id) {
      // Deselect if clicking the same reward
      setSelectedReward(null);
      setDiscountedAmount(bookingAmount);
    } else {
      // Clear promo code when selecting reward (mutual exclusivity)
      setPromoCode('');
      setPromoCodeData(null);
      setPromoCodeError('');
      setPromoDiscountAmount(0);
      
      // Select new reward and calculate discounted amount
      setSelectedReward(reward);
      const discount = reward.discount_percentage || 0;
      const discountAmount = (bookingAmount * discount) / 100;
      setDiscountedAmount(bookingAmount - discountAmount);
    }
  };

  const validatePromoCode = async (code) => {
    if (!code || !code.trim()) {
      setPromoCodeData(null);
      setPromoCodeError('');
      setPromoDiscountAmount(0);
      setDiscountedAmount(bookingAmount);
      return;
    }

    setPromoCodeValidating(true);
    setPromoCodeError('');
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/promotions/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          promo_code: code.trim().toUpperCase(),
          booking_id: bookingId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Promo code is valid
        setPromoCodeData(data.data);
        const discountAmount = data.data.pricing?.discount_amount || 0;
        setPromoDiscountAmount(discountAmount);
        setDiscountedAmount(data.data.pricing?.discounted_total || bookingAmount);
        setPromoCodeError('');
      } else {
        // Promo code is invalid
        setPromoCodeData(null);
        setPromoDiscountAmount(0);
        setDiscountedAmount(bookingAmount);
        
        // Set appropriate error message
        const errorMsg = data.message || 'This promo code is invalid.';
        if (errorMsg.toLowerCase().includes('expired')) {
          setPromoCodeError('This promo code has expired.');
        } else if (errorMsg.toLowerCase().includes('redeemed')) {
          setPromoCodeError('This promo code has already been redeemed.');
        } else if (errorMsg.toLowerCase().includes('cannot be applied')) {
          setPromoCodeError('This promo code cannot be applied.');
        } else {
          setPromoCodeError('This promo code is invalid.');
        }
      }
    } catch (err) {
      console.error('Error validating promo code:', err);
      setPromoCodeData(null);
      setPromoDiscountAmount(0);
      setDiscountedAmount(bookingAmount);
      setPromoCodeError('Failed to validate promo code. Please try again.');
    } finally {
      setPromoCodeValidating(false);
    }
  };

  const handlePromoCodeChange = (value) => {
    const trimmedValue = value.trim().toUpperCase();
    setPromoCode(trimmedValue);
    
    // Clear reward selection when entering promo code (mutual exclusivity)
    if (trimmedValue && selectedReward) {
      setSelectedReward(null);
      setDiscountedAmount(bookingAmount);
    }
    
    // Validate promo code after user stops typing (debounce)
    if (trimmedValue) {
      const timeoutId = setTimeout(() => {
        validatePromoCode(trimmedValue);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setPromoCodeData(null);
      setPromoCodeError('');
      setPromoDiscountAmount(0);
      setDiscountedAmount(bookingAmount);
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
      
      // Process payment
      const paymentResponse = await fetch(`${apiUrl}/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credit_card_id: creditCardId,
          billing_address_id: billingAddressId,
          amount: bookingAmount, // Always send full price, backend calculates discount
          booking_id: bookingId,
          use_loyalty_discount: selectedReward ? true : false,
          reward_id: selectedReward?.reward_id || null,
          promo_code: promoCodeData?.promo?.promo_code || null
        })
      });
      
      const paymentData = await paymentResponse.json();
      
      if (paymentResponse.ok) {
        notifySuccess('Payment processed successfully! Booking confirmed.');

        if (selectedReward) {
          setRewardsCount((prev) => Math.max((prev || 0) - 1, 0));
          setAvailableRewards((prev) => Array.isArray(prev) ? prev.filter((reward) => reward.reward_id !== selectedReward.reward_id) : []);
        }

        navigate('/appointments');
      } else {
        // Provide specific error messages for payment failures
        let errorMessage = paymentData.message || 'Payment failed';
        if (paymentResponse.status === 404) {
          if (paymentData.message && paymentData.message.includes('card')) {
            errorMessage = 'Credit card not found. Please try a different card.';
          } else if (paymentData.message && paymentData.message.includes('address')) {
            errorMessage = 'Billing address not found. Please update your billing address.';
          } else if (paymentData.message && paymentData.message.includes('booking')) {
            errorMessage = 'Booking not found. Please start over.';
          }
        } else if (paymentResponse.status === 400) {
          if (paymentData.message && paymentData.message.includes('amount')) {
            errorMessage = 'Invalid payment amount. Please contact support.';
          } else if (paymentData.message && paymentData.message.includes('status')) {
            errorMessage = 'This booking can no longer be paid. Please start a new booking.';
          }
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Payment error:', err);
      notifyError(err.message || 'Payment processing failed');
      // Don't delete booking on error - user should be able to retry
      // Booking will only be deleted if user backs out of payment page
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    handleDeletePendingBooking();
    navigate(-1);
  };
  
  const handleDeletePendingBooking = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${apiUrl}/bookings/${bookingId}/deletePendingBooking`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Error deleting pending booking:', err);
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Complete payment</h1>
        </div>

        {/* Booking Details Summary */}
        {bookingDetails && (bookingDetails.salon || bookingDetails.stylist || bookingDetails.date) && (
          <Card className="mb-4 shadow-lg border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bookingDetails.salon && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Salon</Label>
                    <p className="text-sm font-medium text-gray-900">{bookingDetails.salon}</p>
                  </div>
                )}
                {bookingDetails.stylist && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Stylist</Label>
                    <p className="text-sm font-medium text-gray-900">{bookingDetails.stylist}</p>
                  </div>
                )}
                {bookingDetails.date && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Date</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(bookingDetails.date + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                {bookingDetails.time && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Time</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {(() => {
                        const timeValue = bookingDetails.time;
                        // Check if it's an ISO 8601 string (has 'T' and timezone indicator: Z, +HH:MM, or -HH:MM)
                        if (timeValue.includes('T') && (
                          timeValue.includes('Z') || 
                          timeValue.includes('+') || 
                          /[+-]\d{2}:\d{2}$/.test(timeValue)
                        )) {
                          // ISO string - format using timezone (default to America/New_York)
                          try {
                            return formatInZone(timeValue, 'America/New_York', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          } catch (err) {
                            // Fallback if formatting fails
                            return timeValue;
                          }
                        } else if (timeValue.includes(':')) {
                          // Legacy HH:MM format
                          try {
                            const date = new Date(`2000-01-01T${timeValue}`);
                            if (isNaN(date.getTime())) {
                              return timeValue; // Return as-is if invalid
                            }
                            return date.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            });
                          } catch (err) {
                            return timeValue;
                          }
                        } else {
                          // Return as-is if format is unknown
                          return timeValue;
                        }
                      })()}
                    </p>
                  </div>
                )}
                {bookingDetails.services && bookingDetails.services.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Services</Label>
                    <div className="flex flex-wrap gap-2">
                      {bookingDetails.services.map((service, idx) => (
                        <span key={idx} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promo Code Section */}
        <Card className="mb-4 shadow-lg border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Promo Code</CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1">Enter a promo code to save on this booking</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => handlePromoCodeChange(e.target.value)}
                  placeholder="Enter promo code (e.g., ABC-123)"
                  className="flex-1 font-mono uppercase"
                  disabled={promoCodeValidating || loading}
                />
                {promoCodeValidating && (
                  <div className="flex items-center px-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {promoCodeError && (
                <p className="text-sm text-red-600">{promoCodeError}</p>
              )}
              {promoCodeData && !promoCodeError && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Promo code applied: {promoCodeData.promo?.promo_code}
                  </p>
                  <p className="text-xs text-green-700">
                    {promoCodeData.promo?.description || 'Discount applied successfully'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Rewards Section */}
        {salonId && (
          <Card className="mb-4 shadow-lg border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Available Rewards</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {promoCode ? 'Promo code is applied. Clear promo code to use rewards.' : 'Redeem a loyalty reward to save on this booking'}
              </p>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading rewards...</p>
                </div>
              ) : availableRewards.length > 0 ? (
                <div className="space-y-3">
                  {availableRewards.map((reward) => {
                    const isSelected = selectedReward?.reward_id === reward.reward_id;
                    const discountAmount = (bookingAmount * (reward.discount_percentage || 0)) / 100;
                    const isDisabled = !!promoCode; // Disable if promo code is entered
                    return (
                      <div
                        key={reward.reward_id}
                        onClick={() => !isDisabled && handleRewardSelect(reward)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isDisabled
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-sm cursor-pointer'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {reward.discount_percentage}% Off
                              </p>
                              {reward.note && (
                                <p className="text-sm text-gray-600 mt-0.5">{reward.note}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Save ${discountAmount.toFixed(2)} on this booking
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              -${discountAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">No rewards available for this salon</p>
                  <p className="text-xs text-gray-500 mt-1">Visit salons to earn rewards!</p>
                </div>
              )}
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
                {bookingAmount > 0 && (
                  <div className="border-t pt-3 mt-auto">
                    {(selectedReward || promoCodeData) && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm text-gray-600">
                          ${typeof bookingAmount === 'number' ? bookingAmount.toFixed(2) : parseFloat(bookingAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedReward && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-green-600">Discount ({selectedReward.discount_percentage}% off)</span>
                        <span className="text-sm font-medium text-green-600">
                          -${((bookingAmount * (selectedReward.discount_percentage || 0)) / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {promoCodeData && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-green-600">
                          Promo Code ({promoCodeData.promo?.discount_pct || promoCodeData.pricing?.discount_percentage}% off)
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          -${(promoCodeData.pricing?.discount_amount || promoDiscountAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base font-medium text-gray-700">Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${(selectedReward || promoCodeData)
                          ? (typeof discountedAmount === 'number' ? discountedAmount.toFixed(2) : parseFloat(discountedAmount || 0).toFixed(2))
                          : (typeof bookingAmount === 'number' ? bookingAmount.toFixed(2) : parseFloat(bookingAmount || 0).toFixed(2))}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Process Payment Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 mt-3" 
                  disabled={loading || (!selectedCardId && !enteringNewCard) || !billingAddress || promoCodeValidating}
                  title={!billingAddress ? 'Please save your billing address first' : promoCodeValidating ? 'Validating promo code...' : ''}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : `Process Payment & Book`}
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
