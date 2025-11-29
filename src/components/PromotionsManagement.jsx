import React, { useState } from 'react';
import { Button } from './ui/button';
import { Gift, Send, Users, Bell, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const PromotionsManagement = ({ salonId, salonName, salonTimezone, onSuccess, onError }) => {
  const [promotionType, setPromotionType] = useState('individual');
  const [messageType, setMessageType] = useState('standard');
  const [promoData, setPromoData] = useState({
    email: '',
    description: '',
    discount_pct: 10,
    expires_at: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingUnusedOffers, setIsSendingUnusedOffers] = useState(false);
  const [error, setError] = useState('');
  const [unusedOffersError, setUnusedOffersError] = useState('');

  const handleInputChange = (field, value) => {
    setPromoData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'No expiration';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStandardMessage = () => {
    const discountPctNum = Number(promoData.discount_pct) || 0;
    const expiresFragment = promoData.expires_at 
      ? (() => {
          const tz = salonTimezone || 'America/New_York';
          const date = DateTime.fromISO(promoData.expires_at, { zone: tz });
          return ` Offer expires on ${date.toFormat('MMM d, yyyy')}.`;
        })()
      : '';
    return `Thanks for being a loyal customer at ${salonName || '[Salon Name]'}! Use promo code XXX-XXXX for ${discountPctNum}% off your next visit.${expiresFragment}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if ((messageType === 'custom' && !promoData.description) || !promoData.discount_pct || !promoData.expires_at) {
      setError(messageType === 'custom' 
        ? 'Description, discount percentage, and expiration date are required'
        : 'Discount percentage and expiration date are required');
      setIsLoading(false);
      return;
    }

    const discountPctNum = Number(promoData.discount_pct);
    if (Number.isNaN(discountPctNum) || discountPctNum <= 0 || discountPctNum > 100) {
      setError('Discount percentage must be a number between 0 and 100');
      setIsLoading(false);
      return;
    }

    if (promotionType === 'individual' && !promoData.email) {
      setError('Email is required for individual promotions');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const requestBody = {
        discount_pct: discountPctNum
      };

      if (messageType === 'custom' && promoData.description) {
        requestBody.description = promoData.description;
      }

      if (promoData.expires_at) {
        const date = new Date(promoData.expires_at);
        date.setHours(23, 59, 59, 999);
        requestBody.expires_at = date.toISOString();
      }

      let endpoint;
      if (promotionType === 'individual') {
        requestBody.email = promoData.email;
        endpoint = `${apiUrl}/promotions/salons/${salonId}/sendPromoToCustomer`;
      } else {
        endpoint = `${apiUrl}/promotions/salons/${salonId}/issue-promotions`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        const message = promotionType === 'individual' 
          ? 'Promotion sent to customer successfully!'
          : `Promotions sent to ${data.data?.promotions_created || 0} Gold customers!`;
        onSuccess?.(message, 'promotion-send');
        setPromoData({
          email: '',
          description: '',
          discount_pct: 10,
          expires_at: ''
        });
        setMessageType('standard');
      } else {
        const errorMsg = data.message || 'Failed to send promotion';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      console.error('Promotion error:', error);
      const errorMessage = 'Failed to send promotion. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendUnusedOffers = async () => {
    setIsSendingUnusedOffers(true);
    setUnusedOffersError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/notifications/owner/send-unused-offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        const message = data.message || 'Notifications sent successfully to all customers with unused offers!';
        if (onSuccess) {
          onSuccess(message, 'promotion-reminder');
        } else {
          alert(message);
        }
      } else {
        const errorMessage = data.message || 'Failed to send unused offers notifications';
        setUnusedOffersError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to send unused offers notifications. Please try again.';
      setUnusedOffersError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSendingUnusedOffers(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Send Unused Offers Notification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Remind Customers About Unused Offers
          </CardTitle>
          <CardDescription>
            Send notifications to all customers who have unused promo codes or loyalty discounts. This helps remind them to use their available offers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                This will send reminders to all customers who have:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Unused promotional codes</li>
                <li>Available loyalty discounts</li>
              </ul>
            </div>
            <Button
              id="send-reminders-button"
              onClick={handleSendUnusedOffers}
              disabled={isSendingUnusedOffers}
              className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingUnusedOffers ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminders
                </>
              )}
            </Button>
          </div>
          {unusedOffersError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {unusedOffersError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      <div className="bg-background border rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Send Promotions</h3>
          <p className="text-muted-foreground">
            Send promotional offers to retain your loyal customers
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Send To</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setPromotionType('individual');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                promotionType === 'individual'
                  ? 'bg-gray-200 border-gray-400 font-medium shadow-sm'
                  : 'bg-background border-gray-300 hover:bg-muted/50'
              }`}
            >
              <Send className="w-4 h-4" />
              Individual Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setPromotionType('bulk');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                promotionType === 'bulk'
                  ? 'bg-gray-200 border-gray-400 font-medium shadow-sm'
                  : 'bg-background border-gray-300 hover:bg-muted/50'
              }`}
            >
              <Users className="w-4 h-4" />
              All Gold Customers
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {promotionType === 'individual' 
              ? 'Send a promotion to a specific customer by email'
              : 'Send promotions to all Gold customers (5+ visits)'}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Message Type</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setMessageType('standard');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                messageType === 'standard'
                  ? 'bg-gray-200 border-gray-400 font-medium shadow-sm'
                  : 'bg-background border-gray-300 hover:bg-muted/50'
              }`}
            >
              Standard Message
            </button>
            <button
              type="button"
              onClick={() => {
                setMessageType('custom');
                setError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                messageType === 'custom'
                  ? 'bg-gray-200 border-gray-400 font-medium shadow-sm'
                  : 'bg-background border-gray-300 hover:bg-muted/50'
              }`}
            >
              Custom Message
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {messageType === 'standard' 
              ? 'Use a standard promotional message'
              : 'Write your own custom promotional message'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotionType === 'individual' && (
              <div>
                <label className="block text-sm font-medium mb-2">Customer Email</label>
                <input
                  id="promotion-email-input"
                  type="email"
                  value={promoData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customer must have at least one booking with your salon
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Discount Percentage (%)</label>
              <input
                id="promotion-discount-input"
                type="number"
                min="1"
                max="100"
                value={promoData.discount_pct}
                onChange={(e) => handleInputChange('discount_pct', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage off (1-100%)
              </p>
            </div>
          </div>

          {messageType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">Promotion Description</label>
              <textarea
                id="promotion-description-input"
                value={promoData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Special offer for our loyal customers..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will be included in the promotion notification
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Expiration Date</label>
            <input
              id="promotion-expiration-input"
              type="date"
              value={promoData.expires_at}
              onChange={(e) => handleInputChange('expires_at', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Promotion will expire at 11:59 PM on the selected date
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Preview
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Discount:</strong> {promoData.discount_pct || 0}% off
              </p>
              <p>
                <strong>Description:</strong> {messageType === 'standard' 
                  ? getStandardMessage()
                  : (() => {
                      const standardMsg = getStandardMessage();
                      const customMsg = promoData.description?.trim();
                      return customMsg ? `${standardMsg}\n${customMsg}` : standardMsg;
                    })()}
              </p>
              <p>
                <strong>Expires:</strong> {promoData.expires_at 
                  ? (() => {
                      const tz = salonTimezone || 'America/New_York';
                      const date = DateTime.fromISO(promoData.expires_at, { zone: tz });
                      return `${date.toFormat('MMM d, yyyy')} at 11:59 PM`;
                    })()
                  : 'No expiration'}
              </p>
              {promotionType === 'individual' && (
                <p>
                  <strong>Recipient:</strong> {promoData.email || 'No email entered'}
                </p>
              )}
              {promotionType === 'bulk' && (
                <p className="text-muted-foreground">
                  Will be sent to all Gold customers (5+ visits)
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              id="promotion-send-button"
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Sending...' : (promotionType === 'individual' ? 'Send Promotion' : 'Send to All Gold Customers')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromotionsManagement;
