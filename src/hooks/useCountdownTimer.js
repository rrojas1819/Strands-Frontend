import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for countdown timer based on expiration time
 * @param {string|null} expiresAt - ISO string of expiration time
 * @param {function} onExpire - Callback function when timer expires
 * @returns {object} - { minutes, seconds, isExpired, formattedTime }
 */
export function useCountdownTimer(expiresAt, onExpire) {
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  const hasCalledExpireRef = useRef(false);

  // Keep onExpire callback ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset expiration flag when expiresAt changes
  useEffect(() => {
    hasCalledExpireRef.current = false;
    setIsExpired(false);
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining({ minutes: 0, seconds: 0 });
      setIsExpired(false);
      return;
    }

    const calculateRemainingTime = () => {
      try {
        const now = new Date();
        const expires = new Date(expiresAt);
        
        // Validate dates
        if (isNaN(expires.getTime())) {
          console.error('Invalid expiresAt date:', expiresAt);
          setTimeRemaining({ minutes: 0, seconds: 0 });
          setIsExpired(true);
          return;
        }
        
        const remaining = expires - now;

        if (remaining <= 0) {
          setTimeRemaining({ minutes: 0, seconds: 0 });
          setIsExpired(true);
          
          // Call onExpire callback only once
          if (onExpireRef.current && !hasCalledExpireRef.current) {
            hasCalledExpireRef.current = true;
            onExpireRef.current();
          }
          
          return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        // Ensure non-negative values
        setTimeRemaining({ 
          minutes: Math.max(0, minutes), 
          seconds: Math.max(0, seconds) 
        });
        setIsExpired(false);
      } catch (error) {
        console.error('Error calculating remaining time:', error);
        setTimeRemaining({ minutes: 0, seconds: 0 });
        setIsExpired(true);
      }
    };

    // Calculate immediately
    calculateRemainingTime();

    // Set up interval to update every second
    intervalRef.current = setInterval(calculateRemainingTime, 1000);

    // Cleanup interval on unmount or when expiresAt changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [expiresAt]);

  // Format time as "M:SS"
  const formattedTime = `${timeRemaining.minutes}:${timeRemaining.seconds.toString().padStart(2, '0')}`;

  return {
    minutes: timeRemaining.minutes,
    seconds: timeRemaining.seconds,
    isExpired,
    formattedTime
  };
}
