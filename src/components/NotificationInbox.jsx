import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mail, Clock, CheckCircle, Eye, Trash2, Copy, Check, ChevronLeft, ChevronRight, Filter, CheckCheck, Trash } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import StrandsModal from './ui/strands-modal';
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'sonner';
import { decryptMessage, isEncrypted } from '../utils/decryption';
import { DateTime } from 'luxon';

// Notification encryption key (should match backend)
const NOTIFICATION_ENCRYPTION_KEY = '78049334f68ba40c1b067f494995bb0128ebf739d56821917aa2d9bb0e72f3a1';

export default function NotificationInbox({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingRead, setMarkingRead] = useState(null); // Track which notification is being marked as read
  const [deletingId, setDeletingId] = useState(null); // Track which notification is being deleted
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [copiedPromoCode, setCopiedPromoCode] = useState(null);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [filter, setFilter] = useState('all'); // Filter: 'all', 'bookings', 'rewards', 'products', 'reviews'
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState({}); // Cache for decrypted messages
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
  const filterRef = useRef('all');

  const formatNotificationDateTime = (value) => {
    if (!value) return '';
    try {
      const dt = DateTime.fromISO(value).toLocal();
      if (!dt.isValid) return value;
      return dt.toLocaleString(DateTime.DATETIME_MED);
    } catch {
      return value;
    }
  };

  const fetchNotifications = useCallback(async (page = 1, showToast = false, filterParam = null) => {
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
      
      // Use filterParam if provided, otherwise use current filter state
      const currentFilter = filterParam !== null ? filterParam : filterRef.current;
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add filter if not 'all'
      if (currentFilter && currentFilter !== 'all') {
        params.append('filter', currentFilter);
      }
      
      const response = await fetch(`${apiUrl}/notifications/inbox?${params.toString()}`, {
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
        
        // Decrypt messages if encrypted
        const decryptionPromises = newNotifications.map(async (notif) => {
          if (isEncrypted(notif.message)) {
            try {
              const decrypted = await decryptMessage(notif.message, NOTIFICATION_ENCRYPTION_KEY);
              setDecryptedMessages(prev => ({
                ...prev,
                [notif.notification_id]: decrypted
              }));
              return { ...notif, message: decrypted };
            } catch (err) {
              console.error('Failed to decrypt message:', err);
              return notif; // Return original if decryption fails
            }
          }
          return notif;
        });
        
        const decryptedNotifications = await Promise.all(decryptionPromises);
        
        // Check for new notifications (compare IDs)
        if (lastNotificationIdsRef.current.size > 0) {
          const newIds = new Set(decryptedNotifications.map(n => n.notification_id));
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
        lastNotificationIdsRef.current = new Set(decryptedNotifications.map(n => n.notification_id));
        
        setNotifications(decryptedNotifications);
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
                  read_at_formatted: data.data?.read_at
                    ? formatNotificationDateTime(data.data.read_at)
                    : formatNotificationDateTime(new Date().toISOString())
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

  const markAllAsRead = useCallback(async () => {
    if (markingAllRead) return;
    
    setMarkingAllRead(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setMarkingAllRead(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.data?.count || 0;
        
        // Update all notifications to read status
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            status: 'READ',
            read_at: data.data?.read_at || new Date().toISOString(),
            read_at_formatted: data.data?.read_at
              ? formatNotificationDateTime(data.data.read_at)
              : formatNotificationDateTime(new Date().toISOString())
          }))
        );
        
        // Update unread count
        setUnreadCount(0);
        
        // Refresh unread count in background
        refreshUnreadCount();
        
        toast.success(`Marked ${count} notification${count !== 1 ? 's' : ''} as read`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to mark all as read');
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  }, [markingAllRead, refreshUnreadCount, setUnreadCount]);

  const deleteAllNotifications = useCallback(async () => {
    if (deletingAll) return;
    
    setDeletingAll(true);
    setShowDeleteAllConfirm(false);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setDeletingAll(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/delete-all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.data?.count || 0;
        
        // Clear all notifications
        setNotifications([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          total_pages: 0,
          page: 1
        }));
        currentPageRef.current = 1;
        
        // Update unread count
        setUnreadCount(0);
        
        // Refresh unread count in background
        refreshUnreadCount();
        
        toast.success(`Deleted ${count} notification${count !== 1 ? 's' : ''}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to delete all notifications');
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      toast.error('Failed to delete all notifications');
    } finally {
      setDeletingAll(false);
    }
  }, [deletingAll, refreshUnreadCount, setUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      // Reset to page 1 and filter to 'all' when modal opens
      currentPageRef.current = 1;
      filterRef.current = 'all';
      setFilter('all');
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchNotifications(1, false, 'all');
    } else {
      // Clear notification IDs when modal closes
      lastNotificationIdsRef.current.clear();
    }
  }, [isOpen, fetchNotifications]);

  // Separate effect for polling - uses ref to track current page and filter
  useEffect(() => {
    if (isOpen) {
      // Start polling for new notifications every 5 seconds when inbox is open
      pollingIntervalRef.current = setInterval(() => {
        // Use refs to get current page and filter (avoids stale closure issues)
        fetchNotifications(currentPageRef.current, false, filterRef.current); // Don't show toast when inbox is open
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

  // Update filter ref when filter changes
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    filterRef.current = newFilter;
    currentPageRef.current = 1;
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchNotifications(1, false, newFilter);
  }, [fetchNotifications]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages && newPage !== pagination.page) {
      currentPageRef.current = newPage;
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchNotifications(newPage, false, filterRef.current);
    }
  }, [pagination.page, pagination.total_pages, fetchNotifications]);

  // Sync page input with pagination state
  useEffect(() => {
    setPageInputValue(pagination.page.toString());
  }, [pagination.page]);

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.total_pages) {
      handlePageChange(pageNum);
    } else {
      setPageInputValue(pagination.page.toString());
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > pagination.total_pages) {
      setPageInputValue(pagination.page.toString());
    } else if (pageNum !== pagination.page) {
      handlePageChange(pageNum);
    }
  };

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

  // Extract all promo codes from notification message
  const extractPromoCodes = (message) => {
    if (!message) return [];
    // Look for patterns like "XXX-XXXX", "ABC-123", etc.
    const promoPattern = /([A-Z0-9]{3,4}-[A-Z0-9]{3,4})/gi;
    const matches = message.match(promoPattern);
    if (matches) {
      // Return unique codes in uppercase
      return [...new Set(matches.map(m => m.toUpperCase()))];
    }
    return [];
  };

  const handleCopyPromoCode = async (promoCode) => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopiedPromoCode(promoCode);
      toast.success('Promo code copied to clipboard!');
      setTimeout(() => setCopiedPromoCode(null), 2000);
    } catch (err) {
      toast.error('Failed to copy promo code');
    }
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAllRead || notifications.length === 0 || notifications.every(n => n.status === 'READ')}
              className="flex items-center gap-1"
            >
              {markingAllRead ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  Marking...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={deletingAll || notifications.length === 0}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deletingAll ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4" />
                  Delete All
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
            {['all', 'bookings', 'rewards', 'products', 'reviews'].map((filterOption) => (
              <Button
                key={filterOption}
                variant={filter === filterOption ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(filterOption)}
                disabled={loading}
                className="capitalize"
              >
                {filterOption === 'all' ? 'All' : filterOption}
              </Button>
            ))}
          </div>
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
                            {decryptedMessages[notification.notification_id] || notification.message}
                          </div>
                          {/* Promo Code Copy Section - Only show if not already redeemed */}
                          {(() => {
                            // Don't show copy section for redeemed promo codes
                            if (notification.type_code === 'PROMO_REDEEMED') {
                              return null;
                            }
                            
                            // Extract all promo codes from message
                            const messagePromoCodes = extractPromoCodes(notification.message);
                            // Also check if notification has a promo_code field
                            const notificationPromoCode = notification.promo_code ? [notification.promo_code.toUpperCase()] : [];
                            // Combine and get unique codes
                            const allPromoCodes = [...new Set([...messagePromoCodes, ...notificationPromoCode])];
                            
                            if (allPromoCodes.length > 0) {
                              return (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                  <p className="text-xs font-medium text-blue-900 mb-2">
                                    {allPromoCodes.length === 1 ? 'Promo Code:' : 'Promo Codes:'}
                                  </p>
                                  {allPromoCodes.map((promoCode, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input
                                        value={promoCode}
                                        readOnly
                                        className="font-mono font-bold text-lg bg-white border-0 text-blue-900 cursor-pointer flex-1"
                                        onClick={(e) => e.target.select()}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyPromoCode(promoCode)}
                                        className="flex items-center gap-1"
                                      >
                                        {copiedPromoCode === promoCode ? (
                                          <>
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span className="text-green-600">Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {notification.sent && (
                              <span>Sent: {formatNotificationDateTime(notification.sent)}</span>
                            )}
                            {(notification.read_at || notification.read_at_formatted) && (
                              <span>
                                Read: {formatNotificationDateTime(notification.read_at || notification.read_at_formatted)}
                              </span>
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notifications
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="h-9 px-3"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                {/* Page Number Input */}
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Page</span>
                  <Input
                    type="number"
                    min={1}
                    max={pagination.total_pages}
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    onWheel={(e) => e.target.blur()} // Disable scroll wheel
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePageInputSubmit(e);
                      }
                    }}
                    className="w-16 h-9 text-center text-sm font-medium border-gray-300 focus:border-primary focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    style={{ WebkitAppearance: 'textfield' }}
                    disabled={loading}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">of {pagination.total_pages}</span>
                </form>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages || loading}
                  className="h-9 px-3"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
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

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => e.stopPropagation()}>
          <StrandsModal
            isOpen={showDeleteAllConfirm}
            onClose={() => {
              setShowDeleteAllConfirm(false);
            }}
            title="Delete All Notifications"
            message={`Are you sure you want to delete all ${pagination.total} notification${pagination.total !== 1 ? 's' : ''}? This action cannot be undone.`}
            type="warning"
            onConfirm={() => {
              deleteAllNotifications();
            }}
            confirmText="Delete All"
            showCancel={true}
            cancelText="Cancel"
          />
        </div>
      )}
    </div>
  );
}

