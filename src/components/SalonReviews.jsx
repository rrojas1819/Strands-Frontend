import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Star, Users, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SalonReviews({ salonId, onError }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 0,
    avg_rating: null,
    limit: 20,
    offset: 0,
    hasMore: false
  });

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
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/reviews/salon/${salonId}/all?limit=20&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setReviews(data.data || []);
        setReviewsMeta({
          total: data.meta?.total || 0,
          avg_rating: data.meta?.avg_rating || null,
          limit: data.meta?.limit || 20,
          offset: data.meta?.offset || 0,
          hasMore: data.meta?.hasMore || false
        });
      } else {
        console.error('Failed to fetch reviews:', data.message);
        if (onError) onError(data.message || 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
      if (onError) onError('Failed to load reviews');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Salon Reviews</h2>
          <p className="text-muted-foreground">See what customers are saying about your salon</p>
        </div>
      </div>

      {reviewsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      ) : reviewsMeta.total === 0 ? (
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="ml-2 mt-1">
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
                  {review.comment && (
                    <p className="text-sm text-foreground mt-3">{review.comment}</p>
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
    </div>
  );
}

