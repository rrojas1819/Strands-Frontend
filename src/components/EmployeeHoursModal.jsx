import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Clock } from 'lucide-react';

const WEEKDAYS = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' }
];

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatErrorMessage = (errorMsg) => {
  if (!errorMsg) return errorMsg;
  
  // If message already contains AM/PM, it's already formatted - return as-is
  if (/\d{1,2}:\d{2}\s*[AP]M/i.test(errorMsg)) {
    return errorMsg;
  }
  
  // Match 24-hour format times (HH:MM:SS or HH:MM)
  // Only match times that look like 24-hour format (hours can be 00-23)
  const timePattern = /\b([0-2]?\d):(\d{2})(?::(\d{2}))?\b/g;
  return errorMsg.replace(timePattern, (match, hours, minutes) => {
    const hour = parseInt(hours, 10);
    // Only format valid 24-hour times (0-23)
    if (hour >= 0 && hour <= 23) {
      const timePart = `${hours.padStart(2, '0')}:${minutes}`;
      return formatTime12Hour(timePart);
    }
    return match;
  });
};

const EmployeeHoursModal = ({ isOpen, onClose, employee, onSuccess, onError }) => {
  const [weeklyAvailability, setWeeklyAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeAvailability();
    }
  }, [isOpen, employee]);

  const fetchEmployeeAvailability = async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/getEmployeeAvailability/${employee.employee_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const weeklyAvailability = data.data.weekly_availability || {};
        setWeeklyAvailability(weeklyAvailability);
      } else {
        const emptyAvailability = {};
        WEEKDAYS.forEach(day => {
          emptyAvailability[day.value] = {
            is_available: false,
            start_time: '',
            end_time: ''
          };
        });
        setWeeklyAvailability(emptyAvailability);
      }
    } catch (error) {
      console.error('Error fetching employee availability:', error);
      const emptyAvailability = {};
      WEEKDAYS.forEach(day => {
        emptyAvailability[day.value] = {
          is_available: false,
          start_time: '',
          end_time: ''
        };
      });
      setWeeklyAvailability(emptyAvailability);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDayChange = (day, field, value) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDay = (day) => {
    const currentState = weeklyAvailability[day]?.is_available || false;
    const salonHours = weeklyAvailability[day]?.salon_hours;
    
    const newState = {
      ...weeklyAvailability[day],
      is_available: !currentState,
      start_time: !currentState && salonHours ? salonHours.start_time.substring(0, 5) : '',
      end_time: !currentState && salonHours ? salonHours.end_time.substring(0, 5) : ''
    };

    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: newState
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      const token = localStorage.getItem('auth_token');
      
      // Build availability object - send null for unavailable days to delete them
      // Include all days so backend knows which ones to delete
      const cleanedAvailability = {};
      WEEKDAYS.forEach(({ value: day }) => {
        const availability = weeklyAvailability[day];
        if (availability?.is_available && availability.start_time && availability.end_time) {
          // Day is available - send the hours
          cleanedAvailability[day] = {
            start_time: availability.start_time,
            end_time: availability.end_time
          };
        } else {
          // Day is not available or missing - send null to delete it
          cleanedAvailability[day] = null;
        }
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/setEmployeeAvailability/${employee.employee_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ weekly_availability: cleanedAvailability })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.('Employee hours updated successfully!');
        onClose();
      } else {
        const errorMessages = data.errors || [data.message || 'Failed to save employee hours'];
        // Format error messages to convert 24-hour times to 12-hour format
        const formattedErrors = Array.isArray(errorMessages) 
          ? errorMessages.map(err => formatErrorMessage(err))
          : [formatErrorMessage(errorMessages)];
        setErrors(formattedErrors);
        // Pass formatted errors as a single string or array to onError callback
        // If it's an array, join with newlines for the modal
        const errorForCallback = Array.isArray(formattedErrors) 
          ? formattedErrors.join('\n')
          : formattedErrors[0];
        onError?.(errorForCallback);
      }
    } catch (error) {
      console.error('Employee hours error:', error);
      const errorMessage = 'Failed to save employee hours. Please try again.';
      setErrors([errorMessage]);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <h2 className="text-xl font-semibold">Set Hours - {employee.full_name}</h2>
                <p className="text-sm text-muted-foreground">{employee.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {WEEKDAYS.map(day => {
                  const dayAvail = weeklyAvailability[day.value] || { is_available: false, start_time: '', end_time: '' };
                  const salonHours = dayAvail.salon_hours;
                  
                  return (
                    <div key={day.value} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 w-32">
                          <span className="font-medium">{day.label}</span>
                        </div>

                        {dayAvail.is_available && (
                          <>
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="time"
                                value={dayAvail.start_time || ''}
                                onChange={(e) => handleDayChange(day.value, 'start_time', e.target.value)}
                                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={dayAvail.is_available}
                              />
                              <span className="text-muted-foreground">to</span>
                              <input
                                type="time"
                                value={dayAvail.end_time || ''}
                                onChange={(e) => handleDayChange(day.value, 'end_time', e.target.value)}
                                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={dayAvail.is_available}
                              />
                            </div>
                            {salonHours && (
                              <p className="text-xs text-muted-foreground">
                                Salon: {formatTime12Hour(salonHours.start_time.substring(0, 5))} - {formatTime12Hour(salonHours.end_time.substring(0, 5))}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors font-medium whitespace-nowrap"
                            >
                              Available
                            </button>
                          </>
                        )}

                        {!dayAvail.is_available && (
                          <>
                            <div className="flex-1"></div>
                            {salonHours ? (
                              <p className="text-xs text-muted-foreground">
                                Salon open: {formatTime12Hour(salonHours.start_time.substring(0, 5))} - {formatTime12Hour(salonHours.end_time.substring(0, 5))}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Salon closed</p>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium whitespace-nowrap"
                              disabled={!salonHours}
                            >
                              Not Available
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md space-y-1">
                {errors.map((error, idx) => (
                  <p key={idx} className="text-sm">{formatErrorMessage(error)}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isLoadingData}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Save Hours'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHoursModal;

