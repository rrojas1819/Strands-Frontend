import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/inbox?page=1&limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.notifications) {
          // Count unread notifications from the first page
          // For badge display, we show count from first page
          // If there are more pages with unread, the badge will show at least the first page count
          const unread = data.data.notifications.filter(n => n.status === 'UNREAD').length;
          setUnreadCount(unread);
          
          // If there are more pages and we have unread on first page, 
          // we could fetch more, but for performance we'll just show first page count
          // The actual inbox will show all unread when opened
        }
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 10 seconds for real-time updates (faster polling)
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refresh: fetchUnreadCount, setUnreadCount };
}

