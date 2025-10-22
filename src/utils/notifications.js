import { toast } from 'sonner';

/**
 * Strands Notification System
 * Reusable notification utilities for consistent UX across the platform
 */

// Success notifications
export const notifySuccess = (title, description = '', duration = 4000) => {
  toast.success(title, {
    description,
    duration,
    className: 'strands-success-toast',
  });
};

// Error notifications
export const notifyError = (title, description = '', duration = 4000) => {
  toast.error(title, {
    description,
    duration,
    className: 'strands-error-toast',
  });
};

// Info notifications
export const notifyInfo = (title, description = '', duration = 3000) => {
  toast.info(title, {
    description,
    duration,
    className: 'strands-info-toast',
  });
};

// Warning notifications
export const notifyWarning = (title, description = '', duration = 4000) => {
  toast.warning(title, {
    description,
    duration,
    className: 'strands-warning-toast',
  });
};

// Loading notifications
export const notifyLoading = (title, description = '') => {
  return toast.loading(title, {
    description,
    className: 'strands-loading-toast',
  });
};

// Update loading notification
export const updateNotification = (toastId, title, description = '', type = 'success') => {
  const notificationTypes = {
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
  };
  
  const notificationFn = notificationTypes[type] || toast.success;
  
  notificationFn(title, {
    description,
    id: toastId,
    className: `strands-${type}-toast`,
  });
};

// Dismiss notification
export const dismissNotification = (toastId) => {
  toast.dismiss(toastId);
};

// Predefined notification templates for common actions
export const Notifications = {
  // Salon Management
  salonApproved: (salonName) => notifySuccess(
    'Salon Approved!',
    `${salonName} has been successfully approved and is now live on the platform.`,
    4000
  ),
  
  salonRejected: (salonName) => notifyError(
    'Salon Rejected',
    `${salonName} registration has been rejected and will not appear on the platform.`,
    4000
  ),
  
  // Authentication
  loginSuccess: (userName) => notifySuccess(
    'Welcome back!',
    `Hello ${userName}, you've been successfully logged in.`,
    3000
  ),
  
  logoutSuccess: () => notifyInfo(
    'Logged out',
    'You have been successfully logged out.',
    2000
  ),
  
  // General Actions
  saveSuccess: (itemName) => notifySuccess(
    'Saved!',
    `${itemName} has been successfully saved.`,
    3000
  ),
  
  deleteSuccess: (itemName) => notifySuccess(
    'Deleted!',
    `${itemName} has been successfully deleted.`,
    3000
  ),
  
  updateSuccess: (itemName) => notifySuccess(
    'Updated!',
    `${itemName} has been successfully updated.`,
    3000
  ),
  
  // Errors
  networkError: () => notifyError(
    'Connection Error',
    'Unable to connect to the server. Please check your internet connection.',
    5000
  ),
  
  validationError: (message) => notifyError(
    'Validation Error',
    message,
    4000
  ),
  
  // Loading states
  loading: (action) => notifyLoading(
    'Processing...',
    `Please wait while we ${action}.`
  ),
};

export default {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
  notifyLoading,
  updateNotification,
  dismissNotification,
  Notifications,
};
