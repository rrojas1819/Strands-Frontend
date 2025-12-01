import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import StrandsModal from './ui/strands-modal';
import { Star, Users, ChevronLeft, ChevronRight, MessageSquare, Edit, Trash2, X } from 'lucide-react';

export default function SalonReviews({ salonId, salonName, canReply = false, onError }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 0,
    avg_rating: null,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState(null);

  useEffect(() => {
    if (salonId) {
      fetchReviews();
    }
  }, [salonId]);

  const fetchReviews = async (offset = 0) => {
    if (!salonId) return;
    
    setReviewsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/reviews/salon/${salonId}/all?limit=20&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not JSON, use the text
        }
        console.error('Failed to fetch reviews:', errorData.message || errorText);
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
      
      // Backend returns { data: [...], meta: {...} }
      const reviewsArray = Array.isArray(data.data) ? data.data : [];
      const meta = data.meta || {};
      
      setReviews(reviewsArray);
      setReviewsMeta({
        total: meta.total || 0,
        avg_rating: meta.avg_rating || null,
        limit: meta.limit || 20,
        offset: meta.offset || 0,
        hasMore: meta.hasMore !== undefined ? meta.hasMore : (reviewsArray.length < (meta.total || 0))
      });
    } catch (error) {
      console.error('Fetch reviews error:', error);
      if (onError) onError('Failed to load reviews');
      setReviews([]);
      setReviewsMeta({
        total: 0,
        avg_rating: null,
        limit: 20,
        offset: 0,
        hasMore: false
      });
    } finally {
      setReviewsLoading(false);
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
    setEditingReply(reply.reply_id);
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
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/reviews/replies/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          review_id: reviewId,
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
      console.error('Create reply error:', error);
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
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/reviews/replies/update/${replyId}`, {
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
      console.error('Update reply error:', error);
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
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/reviews/replies/delete/${deletingReplyId}`, {
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
      console.error('Delete reply error:', error);
      if (onError) onError('Failed to delete reply');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Salon Reviews</h2>
          <p className="text-muted-foreground">
            {salonName ? `See what customers are saying about ${salonName}` : 'See what customers are saying'}
          </p>
        </div>
      </div>

      {reviewsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      ) : (reviewsMeta.total === 0 || reviews.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
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
              <Card key={review.review_id} className="hover:shadow-md transition-shadow">
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

                  {canReply && !review.reply && replyingTo !== review.review_id && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartReply(review.review_id)}
                        disabled={replyLoading}
                        className="flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Reply</span>
                      </Button>
                    </div>
                  )}

                  {canReply && replyingTo === review.review_id && (
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
                              onClick={() => handleCreateReply(review.review_id)}
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
                                {review.reply.user?.name || 'Salon Owner'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                Owner
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
                      {editingReply === review.reply.reply_id ? (
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
                                onClick={() => handleUpdateReply(review.reply.reply_id)}
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
                                onClick={() => handleDeleteReply(review.reply.reply_id)}
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

