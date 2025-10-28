/**
 * Analytics utility for tracking user engagement
 * Used for AFDV 1.1: Admin user engagement metrics
 */

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

export const trackSalonView = (salonId, userId) => {
  return trackUserAction('view_salon_details', { salon_id: salonId, user_id: userId });
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

