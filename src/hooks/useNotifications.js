import { useState, useEffect, useCallback, useRef } from 'react';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const previousCountRef = useRef(0);
  const eventListenersRef = useRef([]);

  // Add event listener for count changes
  const onCountChange = useCallback((callback) => {
    eventListenersRef.current.push(callback);
    return () => {
      eventListenersRef.current = eventListenersRef.current.filter(cb => cb !== callback);
    };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Use optimized endpoint that returns just the unread count number
      const response = await fetch(`${apiUrl}/notifications/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-cache' // Always get fresh count
      });

      if (response.ok) {
        // Backend returns just a number (unread_count)
        const count = await response.json();
        const unreadCountValue = typeof count === 'number' ? count : (count.unread_count || count.count || 0);
        
        // Check if count changed and notify listeners
        if (previousCountRef.current !== unreadCountValue) {
          const oldCount = previousCountRef.current;
          previousCountRef.current = unreadCountValue;
          setUnreadCount(unreadCountValue);
          
          // Notify all listeners that count changed
          eventListenersRef.current.forEach(callback => {
            try {
              callback(unreadCountValue, oldCount);
            } catch (err) {
              console.error('Error in notification count change listener:', err);
            }
          });
        } else {
          // Update state even if count didn't change (for initial load)
          setUnreadCount(unreadCountValue);
          previousCountRef.current = unreadCountValue;
        }
      } else {
        // If endpoint doesn't exist or fails, fallback to 0
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // Don't update count on error to avoid flickering
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();
    
    // Poll every 5 seconds for real-time updates (faster than before)
    const interval = setInterval(fetchUnreadCount, 5000);
    
    return () => {
      clearInterval(interval);
      eventListenersRef.current = [];
    };
  }, [fetchUnreadCount]);

  return { 
    unreadCount, 
    loading, 
    refresh: fetchUnreadCount, 
    setUnreadCount,
    onCountChange // Expose event listener for count changes
  };
}

