import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mail, Clock, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import StrandsModal from './ui/strands-modal';
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'sonner';

export default function NotificationInbox({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingRead, setMarkingRead] = useState(null); // Track which notification is being marked as read
  const [deletingId, setDeletingId] = useState(null); // Track which notification is being deleted
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    total_pages: 0,
    has_more: false
  });
  const { refresh: refreshUnreadCount, setUnreadCount } = useNotifications();
  const pollingIntervalRef = useRef(null);
  const lastNotificationIdsRef = useRef(new Set());
  const currentPageRef = useRef(1);

  const fetchNotifications = useCallback(async (page = 1, showToast = false) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const limit = 5; // Fixed limit
      const response = await fetch(`${apiUrl}/notifications/inbox?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const data = await response.json();
      
      if (data.data && data.data.notifications) {
        const newNotifications = data.data.notifications;
        
        // Check for new notifications (compare IDs)
        if (lastNotificationIdsRef.current.size > 0) {
          const newIds = new Set(newNotifications.map(n => n.notification_id));
          const hasNewNotifications = Array.from(newIds).some(id => !lastNotificationIdsRef.current.has(id));
          
          if (hasNewNotifications) {
            // New notification detected - refresh unread count
            refreshUnreadCount();
            // Show toast if requested (only when inbox is closed)
            if (showToast) {
              toast.info('New notification received');
            }
          }
        }
        
        // Update last known notification IDs
        lastNotificationIdsRef.current = new Set(newNotifications.map(n => n.notification_id));
        
        setNotifications(newNotifications);
        const newPagination = {
          page: data.data.pagination.page,
          limit: data.data.pagination.limit,
          total: data.data.pagination.total,
          total_pages: data.data.pagination.total_pages,
          has_more: data.data.pagination.has_more
        };
        setPagination(newPagination);
        // Update ref for polling
        currentPageRef.current = newPagination.page;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount]);

  const markAsRead = useCallback(async (notificationId) => {
    if (markingRead === notificationId) return; // Prevent duplicate calls
    
    setMarkingRead(notificationId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setMarkingRead(null);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_id: notificationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Optimistically update unread count instantly (before API completes)
        setUnreadCount((prev) => Math.max(0, prev - 1));
        
        // Update local state - mark notification as read
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.notification_id === notificationId
              ? { 
                  ...notif, 
                  status: 'READ', 
                  read_at: data.data?.read_at || new Date().toISOString(), 
                  read_at_formatted: data.data?.read_at ? new Date(data.data.read_at).toLocaleString() : new Date().toLocaleString()
                }
              : notif
          )
        );
        
        // Refresh unread count in background to ensure accuracy
        refreshUnreadCount().catch(() => {
          // If refresh fails, revert the optimistic update
          setUnreadCount((prev) => prev + 1);
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error marking notification as read:', errorData.message || 'Failed to mark as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    } finally {
      setMarkingRead(null);
    }
  }, [markingRead, refreshUnreadCount, setUnreadCount]);

  const handleDeleteClick = useCallback((notificationId) => {
    setNotificationToDelete(notificationId);
    setShowDeleteConfirm(true);
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    if (deletingId === notificationId) return; // Prevent duplicate calls
    
    setDeletingId(notificationId);
    setShowDeleteConfirm(false);
    setNotificationToDelete(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setDeletingId(null);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Ensure notificationId is a number if it's a string
      const id = typeof notificationId === 'string' ? parseInt(notificationId, 10) : notificationId;
      
      // DELETE endpoint: /api/notifications/delete/:notification_id
      const response = await fetch(`${apiUrl}/notifications/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Get current state before updating
        const currentNotifications = notifications;
        const currentPage = pagination.page;
        const currentTotal = pagination.total;
        
        // Remove notification from local state
        setNotifications((prev) => prev.filter((notif) => notif.notification_id !== notificationId));
        
        // Update pagination - check if we need to go to previous page
        const wasLastItemOnPage = currentNotifications.length === 1;
        const shouldGoToPreviousPage = wasLastItemOnPage && currentPage > 1;
        
        if (shouldGoToPreviousPage) {
          const previousPage = currentPage - 1;
          currentPageRef.current = previousPage;
          setPagination((prev) => ({
            ...prev,
            page: previousPage,
            total: Math.max(0, currentTotal - 1)
          }));
          // Fetch previous page
          setTimeout(() => fetchNotifications(previousPage), 100);
        } else {
          // Just update the total count
          setPagination((prev) => ({
            ...prev,
            total: Math.max(0, currentTotal - 1)
          }));
        }
        
        // Refresh unread count
        await refreshUnreadCount();
        
        toast.success('Notification deleted');
        // Note: Inbox stays open so user can continue deleting more notifications
      } else {
        // Handle different error statuses
        let errorMessage = `Failed to delete notification (${response.status})`;
        
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.message || errorMessage;
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, refreshUnreadCount, notifications, pagination, fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      // Reset to page 1 when modal opens
      currentPageRef.current = 1;
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchNotifications(1);
    } else {
      // Clear notification IDs when modal closes
      lastNotificationIdsRef.current.clear();
    }
  }, [isOpen, fetchNotifications]);

  // Separate effect for polling - uses ref to track current page
  useEffect(() => {
    if (isOpen) {
      // Start polling for new notifications every 5 seconds when inbox is open
      pollingIntervalRef.current = setInterval(() => {
        // Use ref to get current page (avoids stale closure issues)
        fetchNotifications(currentPageRef.current, false); // Don't show toast when inbox is open
      }, 5000); // Poll every 5 seconds
    } else {
      // Clear polling when modal closes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, fetchNotifications]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages && newPage !== pagination.page) {
      currentPageRef.current = newPage;
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchNotifications(newPage);
    }
  }, [pagination.page, pagination.total_pages, fetchNotifications]);

  const getNotificationIcon = (typeCode) => {
    switch (typeCode) {
      case 'APPOINTMENT_REMINDER':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'APPOINTMENT_CONFIRMED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (status) => {
    if (status === 'UNREAD') {
      return <Badge variant="default" className="bg-blue-500 text-white text-xs">New</Badge>;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
      onClick={(e) => {
        // Don't close inbox if delete confirmation modal is open
        if (!showDeleteConfirm) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => fetchNotifications(1)} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`p-4 rounded-lg border transition-all ${
                    notification.status === 'UNREAD'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-background border-gray-200'
                  } ${deletingId === notification.notification_id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type_code)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-foreground">
                              {notification.sender_email || 'System'}
                            </p>
                            {getNotificationBadge(notification.status)}
                            {markingRead === notification.notification_id && (
                              <span className="text-xs text-muted-foreground">Marking as read...</span>
                            )}
                            {deletingId === notification.notification_id && (
                              <span className="text-xs text-muted-foreground">Deleting...</span>
                            )}
                          </div>
                          <div className="text-sm text-foreground mb-2 whitespace-pre-line break-words overflow-wrap-anywhere leading-relaxed">
                            {notification.message}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {notification.sent && (
                              <span>Sent: {notification.sent}</span>
                            )}
                            {notification.read_at_formatted && (
                              <span>Read: {notification.read_at_formatted}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {notification.status === 'UNREAD' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.notification_id);
                              }}
                              disabled={markingRead === notification.notification_id || deletingId === notification.notification_id}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Read</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(notification.notification_id);
                            }}
                            disabled={markingRead === notification.notification_id || deletingId === notification.notification_id}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{deletingId === notification.notification_id ? 'Deleting...' : 'Delete'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Modal - Higher z-index to be above inbox */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => e.stopPropagation()}>
          <StrandsModal
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setNotificationToDelete(null);
              // Keep main inbox open - don't close it
            }}
            title="Delete Notification"
            message="Are you sure you want to delete this notification? This action cannot be undone."
            type="warning"
            onConfirm={() => {
              if (notificationToDelete) {
                deleteNotification(notificationToDelete);
                // Keep main inbox open after deletion
              }
            }}
            confirmText="Delete"
            showCancel={true}
            cancelText="Cancel"
          />
        </div>
      )}
    </div>
  );
}

