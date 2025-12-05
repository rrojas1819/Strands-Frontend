import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

const LoyaltyConfiguration = ({ onSuccess, onError }) => {
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    target_visits: 6,
    discount_percentage: 50,
    note: '50% off any service after 6 visits',
    active: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isNoteManuallyEdited, setIsNoteManuallyEdited] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);

  // Generate default description based on target_visits and discount_percentage
  const generateDefaultNote = (visits, discount) => {
    const visitsNum = parseInt(visits) || 0;
    const discountNum = parseInt(discount) || 0;
    if (visitsNum === 0 || discountNum === 0) {
      return '';
    }
    return `Take ${discountNum}% off your visit every ${visitsNum} ${visitsNum === 1 ? 'booking' : 'bookings'}!`;
  };

  useEffect(() => {
    const fetchLoyaltyProgram = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/getLoyaltyProgram`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setLoyaltyConfig({
            target_visits: data.programData.target_visits,
            discount_percentage: data.programData.discount_percentage,
            note: data.programData.note,
            active: data.programData.active
          });
          setIsNoteManuallyEdited(true); // Don't auto-update existing descriptions
          setIsUpdateMode(true);
        } else if (response.status === 404) {
          setIsUpdateMode(false);
          // Set default note for new programs
          const defaultNote = generateDefaultNote(6, 50);
          setLoyaltyConfig(prev => ({
            ...prev,
            note: defaultNote
          }));
        } else {
          console.error('Failed to fetch loyalty program');
          setIsUpdateMode(false);
        }
      } catch (error) {
        console.error('Error fetching loyalty program:', error);
        setIsUpdateMode(false);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLoyaltyProgram();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      
      const endpoint = isUpdateMode ? 
        `${import.meta.env.VITE_API_URL}/salons/updateLoyaltyProgram` :
        `${import.meta.env.VITE_API_URL}/salons/configureLoyaltyProgram`;
      
      const method = isUpdateMode ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_visits: parseInt(loyaltyConfig.target_visits),
          discount_percentage: parseInt(loyaltyConfig.discount_percentage),
          note: loyaltyConfig.note,
          active: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.(isUpdateMode ? 'Loyalty program updated successfully!' : 'Loyalty program created successfully!');
      } else {
        setError(data.message || 'Failed to save loyalty program');
        onError?.(data.message || 'Failed to save loyalty program');
      }
    } catch (error) {
      console.error('Loyalty config error:', error);
      const errorMessage = 'Failed to save loyalty program. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-background border rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Loyalty Rewards Program</h3>
          <p className="text-muted-foreground">
            Configure your salon's loyalty program and rewards for repeat customers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Appointments Required for Reward</label>
              <input
                type="number"
                min="1"
                max="100"
                value={loyaltyConfig.target_visits}
                onChange={(e) => {
                  const visits = parseInt(e.target.value) || 0;
                  const discount = parseInt(loyaltyConfig.discount_percentage) || 0;
                  // Auto-update description unless user is currently editing it
                  const newNote = isDescriptionFocused ? loyaltyConfig.note : generateDefaultNote(visits, discount);
                  setLoyaltyConfig({
                    ...loyaltyConfig,
                    target_visits: e.target.value,
                    note: newNote
                  });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of completed appointments needed to earn a reward
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reward Discount (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={loyaltyConfig.discount_percentage}
                onChange={(e) => {
                  const discount = parseInt(e.target.value) || 0;
                  const visits = parseInt(loyaltyConfig.target_visits) || 0;
                  // Auto-update description unless user is currently editing it
                  const newNote = isDescriptionFocused ? loyaltyConfig.note : generateDefaultNote(visits, discount);
                  setLoyaltyConfig({
                    ...loyaltyConfig,
                    discount_percentage: e.target.value,
                    note: newNote
                  });
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage off for the reward service
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reward Description</label>
            <textarea
              value={loyaltyConfig.note}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => setIsDescriptionFocused(false)}
              onChange={(e) => {
                setIsNoteManuallyEdited(true);
                setLoyaltyConfig({...loyaltyConfig, note: e.target.value});
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder={generateDefaultNote(loyaltyConfig.target_visits, loyaltyConfig.discount_percentage)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This message will be shown to customers when they earn a reward. Auto-generated based on your settings above.
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Program:</strong> Visit {loyaltyConfig.target_visits} times, get {loyaltyConfig.discount_percentage}% off your next service
              </p>
              <p className="text-muted-foreground">
                {loyaltyConfig.note || 'No description provided'}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading || isLoadingData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Saving...' : (isUpdateMode ? 'Update Loyalty Settings' : 'Create Loyalty Settings')}
            </Button>
          </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoyaltyConfiguration;
