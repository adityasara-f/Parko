import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { KeyRound, ShieldAlert, Star, X, Check, Clock, AlertCircle } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedAccess, setSelectedAccess] = useState<any | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [disputeBookingId, setDisputeBookingId] = useState<number | null>(null);
  const [disputeType, setDisputeType] = useState<string>('space_occupied');
  const [disputeDesc, setDisputeDesc] = useState<string>('');

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/bookings/my');
      if (res.success && res.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // View Access Details
  const handleViewAccess = async (bookingId: number) => {
    const res = await apiRequest(`/bookings/${bookingId}/access`);
    if (res.success && res.access) {
      setSelectedAccess(res.access);
    } else {
      alert(res.error || 'Failed to fetch access instructions');
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const res = await apiRequest(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Driver cancelled via web interface' }),
    });

    if (res.success) {
      setActionMessage(res.message);
      fetchBookings();
    } else {
      alert(res.error || 'Failed to cancel booking');
    }
  };

  // Submit Review
  const handleSubmitReview = async () => {
    if (!reviewBookingId) return;
    const res = await apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: reviewBookingId,
        rating,
        comment,
      }),
    });

    if (res.success) {
      setActionMessage('Review submitted successfully!');
      setReviewBookingId(null);
      setComment('');
      fetchBookings();
    } else {
      alert(res.error || 'Failed to submit review');
    }
  };

  // Submit Dispute
  const handleSubmitDispute = async () => {
    if (!disputeBookingId || !disputeDesc) return;
    const res = await apiRequest('/disputes', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: disputeBookingId,
        issueType: disputeType,
        description: disputeDesc,
      }),
    });

    if (res.success) {
      setActionMessage('Dispute registered for administrator investigation.');
      setDisputeBookingId(null);
      setDisputeDesc('');
      fetchBookings();
    } else {
      alert(res.error || 'Failed to submit dispute');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
            My Parking Bookings
          </h1>
          <p className="text-xs text-parko-muted mt-0.5">
            Manage your active reservations, digital access codes, and driver receipts
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-xs text-parko-muted">
          Loading your reservations...
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-parko-border p-8">
          <Clock className="w-10 h-10 text-parko-muted mx-auto mb-3" />
          <h3 className="font-bold text-base text-parko-charcoal">No bookings found</h3>
          <p className="text-xs text-parko-muted mt-1">
            You haven't reserved any parking slots yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.booking_id}
              className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-parko-charcoal">
                    Booking #{b.booking_id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      b.booking_status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : b.booking_status === 'pending_approval' || b.booking_status === 'pending_payment'
                        ? 'bg-amber-50 text-amber-700'
                        : b.booking_status === 'completed'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {b.booking_status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-parko-charcoal">
                  {b.space_title}
                </h3>

                <div className="text-xs text-parko-muted flex items-center gap-3">
                  <span>
                    📅 {new Date(b.start_time).toLocaleDateString()} {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold text-parko-charcoal">
                    ₹{b.amount} {b.currency}
                  </span>
                </div>

                {b.cancellation_reason && (
                  <div className="text-[11px] text-red-600 font-medium">
                    Reason: {b.cancellation_reason}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {(b.booking_status === 'confirmed' || b.booking_status === 'completed') && (
                  <button
                    onClick={() => handleViewAccess(b.booking_id)}
                    className="px-3.5 py-2 rounded-xl bg-parko-charcoal hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-parko-coral" />
                    Access Details
                  </button>
                )}

                {(b.booking_status === 'confirmed' || b.booking_status === 'pending_approval' || b.booking_status === 'pending_payment') && (
                  <button
                    onClick={() => handleCancelBooking(b.booking_id)}
                    className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                  >
                    Cancel Slot
                  </button>
                )}

                {b.booking_status === 'completed' && !b.driver_review_id && (
                  <button
                    onClick={() => setReviewBookingId(b.booking_id)}
                    className="px-3.5 py-2 rounded-xl border border-parko-border bg-parko-sand/60 hover:bg-parko-sand text-parko-charcoal text-xs font-bold flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    Review Host
                  </button>
                )}

                <button
                  onClick={() => setDisputeBookingId(b.booking_id)}
                  title="Raise issue to administrator"
                  className="p-2 rounded-xl text-parko-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Details Modal */}
      {selectedAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift relative">
            <button
              onClick={() => setSelectedAccess(null)}
              className="absolute top-4 right-4 p-1 text-parko-muted hover:text-parko-charcoal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-parko-charcoal mb-1">
              Confirmed Access Information
            </h3>
            <p className="text-xs text-parko-muted mb-4">
              Released exclusively for Booking #{selectedAccess.booking_id}
            </p>

            <div className="space-y-3 bg-parko-sand/40 p-4 rounded-2xl text-xs">
              <div>
                <span className="font-bold text-parko-charcoal block">Exact Address:</span>
                <span className="text-parko-charcoal/90">{selectedAccess.exact_address}</span>
              </div>
              <div>
                <span className="font-bold text-parko-charcoal block">Access Instructions & Gate Codes:</span>
                <span className="text-parko-charcoal/90">{selectedAccess.access_instructions}</span>
              </div>
              {selectedAccess.private_notes && (
                <div>
                  <span className="font-bold text-parko-charcoal block">Host Notes:</span>
                  <span className="text-parko-charcoal/90">{selectedAccess.private_notes}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAccess(null)}
              className="w-full mt-5 py-3 rounded-2xl bg-parko-charcoal text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <h3 className="text-xl font-extrabold text-parko-charcoal mb-3">
              Leave a Review for Host
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-2"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the driveway access and host communication?"
                rows={3}
                className="w-full p-3 rounded-xl border border-parko-border text-xs focus:outline-none focus:ring-1 focus:ring-parko-coral"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReviewBookingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-parko-border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 py-2.5 rounded-xl bg-parko-charcoal text-white text-xs font-bold"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <h3 className="text-xl font-extrabold text-parko-charcoal mb-2">
              Submit Dispute to Admin
            </h3>
            <p className="text-xs text-parko-muted mb-4">
              Booking #{disputeBookingId} &bull; Admin will review resolution
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-parko-charcoal mb-1">Issue Category</label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-parko-border bg-parko-sand/40"
                >
                  <option value="space_occupied">Space was already occupied</option>
                  <option value="access_denied">Gate locked / Access denied</option>
                  <option value="cleanliness">Driveway debris / Obstruction</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-parko-charcoal mb-1">Detailed Description</label>
                <textarea
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Explain exactly what happened upon arrival..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-parko-border text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDisputeBookingId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-parko-border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDispute}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Register Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
