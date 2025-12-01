/**
 * Analytics utility for tracking user engagement
 * Used for AFDV 1.1: Admin user engagement metrics
 */

// Track sent requests to prevent duplicate calls
const sentSalonViews = new Set();
const inProgressSalonViews = new Set();

export const trackUserAction = async (eventType, data = {}) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    await fetch(`${apiUrl}/admin/analytics/user-engagement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        ...data
      })
    });
  } catch (err) {
    console.error('Error tracking user action:', err);
  }
};

export const trackSalonView = async (salonId, userId) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Create unique key to prevent duplicate calls
    const viewKey = `salon_${salonId}_user_${userId || 'anonymous'}`;
    
    // Check if already sent or in progress (within same session)
    if (sentSalonViews.has(viewKey)) {
      console.log('Salon view already tracked, skipping duplicate:', salonId);
      return;
    }
    
    // Check if request is already in progress
    if (inProgressSalonViews.has(viewKey)) {
      console.log('Salon view already in progress, skipping duplicate:', salonId);
      return;
    }

    // Mark as in progress immediately to prevent simultaneous calls
    inProgressSalonViews.add(viewKey);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const endpoint = `${apiUrl}/salons/track-salon-event`;
    
    console.log('Tracking salon view - Endpoint:', endpoint, 'Salon ID:', salonId);
    
    try {
      // Track salon view click event (matches backend trackSalonEvent)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salon_id: salonId,
          event_name: 'view_details_click',
          amount: 1
        })
      });
      
      if (!response.ok) {
        console.error('Failed to track salon view:', response.status, response.statusText);
        // Remove from in progress if failed so it can be retried
        inProgressSalonViews.delete(viewKey);
      } else {
        // Mark as sent to prevent duplicates, remove from in progress
        sentSalonViews.add(viewKey);
        inProgressSalonViews.delete(viewKey);
        console.log('Salon view tracked successfully');
      }
    } finally {
      // Clean up in progress flag after a delay in case of network issues
      setTimeout(() => {
        inProgressSalonViews.delete(viewKey);
      }, 1000);
    }
  } catch (err) {
    console.error('Error tracking salon view:', err);
  }
};

export const trackBooking = (salonId, stylistId, serviceIds, userId) => {
  return trackUserAction('book_appointment', {
    salon_id: salonId,
    stylist_id: stylistId,
    service_ids: serviceIds,
    user_id: userId
  });
};

export const trackLogin = (userId) => {
  return trackUserAction('user_login', { user_id: userId });
};

