import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import StrandsModal from './ui/strands-modal';
import { Star, Users, ChevronLeft, ChevronRight, MessageSquare, Edit, Trash2, X } from 'lucide-react';
import { notifyError, notifySuccess } from '../utils/notifications';

export default function StaffReviews({ employeeId, canReply = false, canReview = false, forOwner = false, onError, onReviewChange }) {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 0,
    avg_rating: null,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  const [myReview, setMyReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({});

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState(null);

  useEffect(() => {
    if (forOwner || employeeId) {
      fetchReviews();
      if (canReview && !forOwner) {
        fetchMyReview();
      }
    }
  }, [employeeId, canReview, forOwner]);

  const fetchReviews = async (offset = 0) => {
    if (!forOwner && !employeeId) return;
    
    setReviewsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const endpoint = forOwner 
        ? `${apiUrl}/staff-reviews/owner/all?limit=20&offset=${offset}`
        : `${apiUrl}/staff-reviews/employee/${employeeId}/all?limit=20&offset=${offset}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!forOwner && response.status === 404) {
        try {
          const errorData = await response.json();
          if (errorData.message?.includes('Employee not found') || errorData.message?.includes('employee')) {
            if (onError) onError('Employee information not found. Please refresh the page.');
          } else {
            setReviews([]);
            setReviewsMeta({
              total: 0,
              avg_rating: null,
              limit: 20,
              offset: 0,
              hasMore: false
            });
            return;
          }
        } catch (e) {
          setReviews([]);
          setReviewsMeta({
            total: 0,
            avg_rating: null,
            limit: 20,
            offset: 0,
            hasMore: false
          });
          return;
        }
        
        setReviews([]);
        setReviewsMeta({
          total: 0,
          avg_rating: null,
          limit: 20,
          offset: 0,
          hasMore: false
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load reviews' }));
        if (onError) onError(errorData.message || 'Failed to load reviews');
        setReviews([]);
        setReviewsMeta({
          total: 0,
          avg_rating: null,
          limit: 20,
          offset: 0,
          hasMore: false
        });
        return;
      }

      const data = await response.json();
      
      setReviews(data.data || []);
      setReviewsMeta({
        total: data.meta?.total || 0,
        avg_rating: data.meta?.avg_rating || null,
        limit: data.meta?.limit || 20,
        offset: data.meta?.offset || 0,
        hasMore: data.meta?.hasMore || false
      });
    } catch (error) {
      if (onError) onError('Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchMyReview = async () => {
    if (!employeeId || !canReview) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/staff-reviews/employee/${employeeId}/myReview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        // No review yet - this is expected and not an error
        setMyReview(null);
        setReviewRating(0);
        setReviewMessage('');
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        setMyReview(data.data || null);
        if (data.data) {
          setReviewRating(data.data.rating || 0);
          setReviewMessage(data.data.message || '');
        }
      }
    } catch (error) {
      // Silently handle errors - user might not have permission or review doesn't exist
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating <= 0) {
      notifyError('Please select a rating');
      return;
    }

    setReviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const url = myReview 
        ? `${apiUrl}/staff-reviews/update/${myReview.staff_review_id}`
        : `${apiUrl}/staff-reviews/create`;
      
      const method = myReview ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          rating: parseFloat(reviewRating),
          message: reviewMessage.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        notifySuccess(myReview ? 'Review updated successfully' : 'Review submitted successfully');
        setShowReviewForm(false);
        setShowConfirmModal(false);
        fetchMyReview();
        fetchReviews(reviewsMeta.offset);
        if (onReviewChange) {
          onReviewChange();
        }
      } else {
        let errorMsg = data.message || 'Failed to submit review';
        if (response.status === 403) {
          errorMsg = 'You can review a stylist only after a completed service with them';
        } else if (response.status === 409) {
          errorMsg = 'You have already reviewed this stylist';
        }
        notifyError(errorMsg);
      }
    } catch (error) {
      notifyError('Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;

    setReviewLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/staff-reviews/delete/${myReview.staff_review_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        notifySuccess('Review deleted successfully');
        setShowConfirmModal(false);
        setMyReview(null);
        setReviewRating(0);
        setReviewMessage('');
        setShowReviewForm(false);
        fetchReviews(reviewsMeta.offset);
        if (onReviewChange) {
          onReviewChange();
        }
      } else {
        notifyError(data.message || 'Failed to delete review');
      }
    } catch (error) {
      notifyError('Failed to delete review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewsPagination = (direction) => {
    const newOffset = direction === 'next' 
      ? reviewsMeta.offset + reviewsMeta.limit
      : Math.max(0, reviewsMeta.offset - reviewsMeta.limit);
    fetchReviews(newOffset);
  };

  const handleStartReply = (reviewId) => {
    setReplyingTo(reviewId);
    setReplyText('');
    setEditingReply(null);
  };

  const handleStartEdit = (reply) => {
    setEditingReply(reply.staff_reply_id);
    setReplyText(reply.message);
    setReplyingTo(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setEditingReply(null);
    setReplyText('');
  };

  const handleCreateReply = async (reviewId) => {
    if (!replyText.trim()) {
      if (onError) onError('Please enter a reply message');
      return;
    }

    setReplyLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/staff-reviews/replies/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_review_id: reviewId,
          message: replyText.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setReplyingTo(null);
        setReplyText('');
        fetchReviews(reviewsMeta.offset);
      } else {
        if (onError) onError(data.message || 'Failed to create reply');
      }
    } catch (error) {
      if (onError) onError('Failed to create reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdateReply = async (replyId) => {
    if (!replyText.trim()) {
      if (onError) onError('Please enter a reply message');
      return;
    }

    setReplyLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/staff-reviews/replies/update/${replyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: replyText.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setEditingReply(null);
        setReplyText('');
        fetchReviews(reviewsMeta.offset);
      } else {
        if (onError) onError(data.message || 'Failed to update reply');
      }
    } catch (error) {
      if (onError) onError('Failed to update reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeleteReply = (replyId) => {
    setDeletingReplyId(replyId);
  };

  const confirmDeleteReply = async () => {
    if (!deletingReplyId) return;

    setReplyLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/staff-reviews/replies/delete/${deletingReplyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setDeletingReplyId(null);
        fetchReviews(reviewsMeta.offset);
      } else {
        if (onError) onError(data.message || 'Failed to delete reply');
      }
    } catch (error) {
      if (onError) onError('Failed to delete reply');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {canReview && user?.role === 'CUSTOMER' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">{myReview ? 'Edit Your Review' : 'Write a Review'}</h3>
            {showReviewForm ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  <div 
                    className="flex"
                    style={{ gap: '4px', margin: 0, padding: 0 }}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeRating = hoverRating > 0 ? hoverRating : reviewRating;
                      const fullStars = Math.floor(activeRating);
                      const hasHalfStar = activeRating % 1 === 0.5 && Math.ceil(activeRating) === star;
                      const isFull = star <= fullStars;
                      const isHalf = hasHalfStar;
                      
                      return (
                        <div
                          key={star}
                          className="relative"
                          style={{ 
                            width: '24px', 
                            height: '24px', 
                            flexShrink: 0,
                            isolation: 'isolate',
                            overflow: 'hidden',
                            margin: 0,
                            padding: 0,
                            boxSizing: 'border-box'
                          }}
                        >
                          <Star className="w-6 h-6 text-gray-300 absolute pointer-events-none" style={{ left: 0, top: 0, margin: 0 }} />
                          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ margin: 0, padding: 0 }}>
                            <Star
                              className="w-6 h-6 text-yellow-500 fill-current"
                              style={{
                                left: 0,
                                top: 0,
                                margin: 0,
                                clipPath: isHalf 
                                  ? 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' 
                                  : isFull 
                                  ? 'none' 
                                  : 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="absolute focus:outline-none z-20 bg-transparent border-0 cursor-pointer"
                            style={{ 
                              left: 0, 
                              top: 0, 
                              width: '50%', 
                              height: '100%',
                              margin: 0,
                              padding: 0,
                              minWidth: 0,
                              minHeight: 0
                            }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              setHoverRating(star - 0.5);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewRating(star - 0.5);
                            }}
                            aria-label={`${star - 0.5} stars`}
                          />
                          <button
                            type="button"
                            className="absolute focus:outline-none z-20 bg-transparent border-0 cursor-pointer"
                            style={{ 
                              left: '50%', 
                              top: 0, 
                              width: '50%', 
                              height: '100%',
                              margin: 0,
                              padding: 0,
                              minWidth: 0,
                              minHeight: 0
                            }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              setHoverRating(star);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewRating(star);
                            }}
                            aria-label={`${star} stars`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
                  <Textarea
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    placeholder="Share your experience..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      if (!reviewRating || reviewRating <= 0) {
                        notifyError('Please select a rating');
                        return;
                      }
                      setConfirmModalConfig({
                        title: myReview ? 'Update Review' : 'Submit Review',
                        message: myReview 
                          ? 'Are you sure you want to update your review?'
                          : 'Are you sure you want to submit this review?',
                        type: 'info',
                        onConfirm: () => {
                          handleSubmitReview();
                        }
                      });
                      setShowConfirmModal(true);
                    }}
                    disabled={reviewLoading}
                  >
                    {myReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                  {myReview && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirmModalConfig({
                          title: 'Delete Review',
                          message: 'Are you sure you want to delete your review? This action cannot be undone.',
                          type: 'warning',
                          onConfirm: () => {
                            handleDeleteReview();
                          }
                        });
                        setShowConfirmModal(true);
                      }}
                      disabled={reviewLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReviewForm(false);
                      if (myReview) {
                        setReviewRating(myReview.rating);
                        setReviewMessage(myReview.message || '');
                      } else {
                        setReviewRating(0);
                        setReviewMessage('');
                      }
                    }}
                    disabled={reviewLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : myReview ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFullStar = myReview.rating >= star;
                        const isHalfStar = myReview.rating === star - 0.5;
                        return (
                          <div key={star} className="relative">
                            <Star className="w-4 h-4 text-gray-300" />
                            {isFullStar || isHalfStar ? (
                              <div className="absolute inset-0 overflow-hidden">
                                <Star
                                  className={`w-4 h-4 text-yellow-500 fill-current ${
                                    isHalfStar ? 'opacity-50' : ''
                                  }`}
                                  style={{
                                    clipPath: isHalfStar 
                                      ? 'inset(0 50% 0 0)' 
                                      : 'none'
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {myReview.message || 'No comment'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewForm(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReviewForm(true)}
              >
                Write a Review
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Staff Reviews</h2>
          <p className="text-muted-foreground">
            {forOwner ? 'See what customers are saying about your staff' : 'See what customers are saying'}
          </p>
        </div>
      </div>

      {reviewsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      ) : reviewsMeta.total === 0 ? (
        <Card>
          <CardContent className="text-center pt-16 pb-12">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Reviews Yet</h3>
            <p className="text-sm text-muted-foreground">
              Customer reviews will appear here once customers leave feedback.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div className="ml-2">
                  <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {reviewsMeta.avg_rating ? (
                        <>
                          <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                          <span className="text-2xl font-bold ml-2">{reviewsMeta.avg_rating}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold">N/A</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      ({reviewsMeta.total} {reviewsMeta.total === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const rating = reviewsMeta.avg_rating || 0;
                    const isFull = star <= Math.floor(rating);
                    const isHalf = !isFull && star === Math.ceil(rating) && rating % 1 !== 0;
                    return (
                      <div key={star} className="relative w-5 h-5">
                        <Star className={`w-5 h-5 text-gray-300`} />
                        {isFull && (
                          <Star className={`w-5 h-5 fill-yellow-400 text-yellow-400 absolute top-0 left-0`} />
                        )}
                        {isHalf && (
                          <div className="absolute top-0 left-0 w-5 h-5 overflow-hidden">
                            <Star className={`w-5 h-5 fill-yellow-400 text-yellow-400`} style={{ clipPath: 'inset(0 50% 0 0)' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.staff_review_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{review.user?.name || 'Anonymous'}</h4>
                        <div className="flex items-center space-x-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const rating = review.rating || 0;
                            const isFull = star <= Math.floor(rating);
                            const isHalf = !isFull && star === Math.ceil(rating) && rating % 1 !== 0;
                            return (
                              <div key={star} className="relative w-4 h-4">
                                <Star className={`w-4 h-4 text-gray-300`} />
                                {isFull && (
                                  <Star className={`w-4 h-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0`} />
                                )}
                                {isHalf && (
                                  <div className="absolute top-0 left-0 w-4 h-4 overflow-hidden">
                                    <Star className={`w-4 h-4 fill-yellow-400 text-yellow-400`} style={{ clipPath: 'inset(0 50% 0 0)' }} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {review.message && (
                    <p className="text-sm text-foreground mt-3">{review.message}</p>
                  )}

                  {forOwner && review.employee && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        For: {review.employee.name || 'Unknown Employee'}
                      </Badge>
                    </div>
                  )}

                  {canReply && !review.reply && replyingTo !== review.staff_review_id && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartReply(review.staff_review_id)}
                        disabled={replyLoading}
                        className="flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Reply</span>
                      </Button>
                    </div>
                  )}

                  {canReply && replyingTo === review.staff_review_id && (
                    <div className="mt-4 pt-4 border-t border-muted">
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {replyText.length}/2000 characters
                          </span>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelReply}
                              disabled={replyLoading}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCreateReply(review.staff_review_id)}
                              disabled={replyLoading || !replyText.trim()}
                            >
                              {replyLoading ? 'Sending...' : 'Send Reply'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {review.reply && (
                    <div className="mt-4 pt-4 border-t border-muted">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Star className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-foreground">
                                {review.reply.user?.name || 'Stylist'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {forOwner ? 'Staff Reply' : 'Stylist'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(review.reply.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      {editingReply === review.reply.staff_reply_id ? (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {replyText.length}/2000 characters
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelReply}
                                disabled={replyLoading}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateReply(review.reply.staff_reply_id)}
                                disabled={replyLoading || !replyText.trim()}
                              >
                                {replyLoading ? 'Updating...' : 'Update Reply'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-foreground mb-0 leading-tight">{review.reply.message}</p>
                          {canReply && (
                            <div className="flex justify-end space-x-2 -mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(review.reply)}
                                disabled={replyLoading}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReply(review.reply.staff_reply_id)}
                                disabled={replyLoading}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {reviewsMeta.total > reviewsMeta.limit && (
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(reviewsMeta.offset + 1, reviewsMeta.total)} -{' '}
                {Math.min(reviewsMeta.offset + reviewsMeta.limit, reviewsMeta.total)} of{' '}
                {reviewsMeta.total} reviews
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleReviewsPagination('prev')}
                  disabled={reviewsLoading || reviewsMeta.offset === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReviewsPagination('next')}
                  disabled={reviewsLoading || !reviewsMeta.hasMore}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <StrandsModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmModalConfig.title || ''}
        message={confirmModalConfig.message || ''}
        type={confirmModalConfig.type || 'info'}
        onConfirm={() => {
          if (confirmModalConfig.onConfirm) {
            confirmModalConfig.onConfirm();
          }
        }}
        confirmText="Confirm"
        showCancel={true}
        cancelText="Cancel"
      />

      <StrandsModal
        isOpen={deletingReplyId !== null}
        onClose={() => setDeletingReplyId(null)}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? This action cannot be undone."
        type="warning"
        onConfirm={confirmDeleteReply}
        confirmText="Delete"
        showCancel={true}
        cancelText="Cancel"
      />
    </div>
  );
}

