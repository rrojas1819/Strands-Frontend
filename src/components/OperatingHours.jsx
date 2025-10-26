import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Clock } from 'lucide-react';

const WEEKDAYS = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' }
];

const OperatingHours = ({ onSuccess, onError }) => {
  const [weeklyHours, setWeeklyHours] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOperatingHours = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/getHours`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setWeeklyHours(data.data.weekly_hours || {});
        } else {
          const emptyHours = {};
          WEEKDAYS.forEach(day => {
            emptyHours[day.value] = {
              is_open: false,
              start_time: '',
              end_time: ''
            };
          });
          setWeeklyHours(emptyHours);
        }
      } catch (error) {
        console.error('Error fetching operating hours:', error);
        const emptyHours = {};
        WEEKDAYS.forEach(day => {
          emptyHours[day.value] = {
            is_open: false,
            start_time: '',
            end_time: ''
          };
        });
        setWeeklyHours(emptyHours);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchOperatingHours();
  }, []);

  const handleDayChange = (day, field, value) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDay = (day) => {
    const currentState = weeklyHours[day]?.is_open || false;
    const newState = {
      ...weeklyHours[day],
      is_open: !currentState,
      start_time: !currentState ? weeklyHours[day]?.start_time || '09:00' : '',
      end_time: !currentState ? weeklyHours[day]?.end_time || '17:00' : ''
    };

    setWeeklyHours(prev => ({
      ...prev,
      [day]: newState
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      
      const cleanedHours = {};
      Object.entries(weeklyHours).forEach(([day, hours]) => {
        if (hours.is_open && hours.start_time && hours.end_time) {
          cleanedHours[day] = {
            start_time: hours.start_time,
            end_time: hours.end_time
          };
        }
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/setHours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ weekly_hours: cleanedHours })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.('Operating hours updated successfully!');
      } else {
        setError(data.message || 'Failed to save operating hours');
        onError?.(data.message || 'Failed to save operating hours');
      }
    } catch (error) {
      console.error('Operating hours error:', error);
      const errorMessage = 'Failed to save operating hours. Please try again.';
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
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operating Hours
          </h3>
          <p className="text-muted-foreground">
            Set your salon's operating hours for each day of the week. These hours will be used to determine when customers can book appointments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {WEEKDAYS.map(day => {
                const dayHours = weeklyHours[day.value] || { is_open: false, start_time: '', end_time: '' };
                return (
                  <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 w-32">
                      <span className="font-medium">{day.label}</span>
                    </div>

                    {dayHours.is_open && (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={dayHours.start_time || ''}
                            onChange={(e) => handleDayChange(day.value, 'start_time', e.target.value)}
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required={dayHours.is_open}
                          />
                          <span className="text-muted-foreground">to</span>
                          <input
                            type="time"
                            value={dayHours.end_time || ''}
                            onChange={(e) => handleDayChange(day.value, 'end_time', e.target.value)}
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required={dayHours.is_open}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium"
                        >
                          Open
                        </button>
                      </>
                    )}

                    {!dayHours.is_open && (
                      <>
                        <div className="flex-1"></div>
                        <button
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium"
                        >
                          Closed
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
              {isLoading ? 'Saving...' : 'Save Operating Hours'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperatingHours;

