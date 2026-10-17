import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { PlusCircle, Check, Star, Calendar, X, Plus } from 'lucide-react';

export const OwnerDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancellation request modal
  const [cancelModalBookingId, setCancelModalBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Host review of driver modal
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewDriverName, setReviewDriverName] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  // Add availability window modal for existing space
  const [availSpaceId, setAvailSpaceId] = useState<number | null>(null);
  const [availDate, setAvailDate] = useState(new Date().toISOString().split('T')[0]);
  const [availStart, setAvailStart] = useState('08:00');
  const [availEnd, setAvailEnd] = useState('20:00');

  const loadData = async () => {
    setLoading(true);
    try {
      const dashRes = await apiRequest('/owner/dashboard');
      if (dashRes.success && dashRes.stats) {
        setStats(dashRes.stats);
      }

      const spacesRes = await apiRequest('/owner/spaces');
      if (spacesRes.success && spacesRes.spaces) {
        setSpaces(spacesRes.spaces);
      }

      const bookingsRes = await apiRequest('/owner/bookings');
      if (bookingsRes.success && bookingsRes.bookings) {
        setBookings(bookingsRes.bookings);
      }
    } catch (err) {
      console.error('Owner data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Host Approval / Decline Decision
  const handleDecision = async (bookingId: number, decision: 'approve' | 'decline') => {
    const res = await apiRequest(`/owner/bookings/${bookingId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });

    if (res.success) {
      alert(res.message);
      loadData();
    } else {
      alert(res.error || 'Failed to process decision');
    }
  };

  // Handle Host Cancellation Request (Requires admin resolution)
  const handleHostCancelRequest = async () => {
    if (!cancelModalBookingId || !cancelReason) return;
    const res = await apiRequest(`/owner/bookings/${cancelModalBookingId}/request-cancellation`, {
      method: 'POST',
      body: JSON.stringify({ reason: cancelReason }),
    });

    if (res.success) {
      alert(res.message);
      setCancelModalBookingId(null);
      setCancelReason('');
      loadData();
    } else {
      alert(res.error || 'Failed to submit cancellation request');
    }
  };

  // Submit Host Review of Driver (Mutual Review requirement)
  const handleSubmitDriverReview = async () => {
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
      alert('Review for driver submitted successfully!');
      setReviewBookingId(null);
      setComment('');
      loadData();
    } else {
      alert(res.error || 'Failed to submit review');
    }
  };

  // Add Availability to existing space
  const handleAddAvailability = async () => {
    if (!availSpaceId) return;
    if (availEnd <= availStart) {
      alert('End time must be after start time');
      return;
    }

    const res = await apiRequest(`/owner/spaces/${availSpaceId}/availability`, {
      method: 'POST',
      body: JSON.stringify({
        windows: [{
          start_time: `${availDate} ${availStart}:00`,
          end_time: `${availDate} ${availEnd}:00`
        }]
      })
    });

    if (res.success) {
      alert(res.message);
      setAvailSpaceId(null);
      loadData();
    } else {
      alert(res.error || 'Failed to add availability window');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
            Owner Workspace
          </h1>
          <p className="text-xs text-parko-muted mt-0.5">
            Manage your driveways, view booking requests, and verify listing visibility
          </p>
        </div>

        <Link
          to="/owner/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-parko-charcoal hover:bg-black text-white text-xs font-bold shadow-soft transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-parko-coral" />
          List New Space
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase tracking-wider mb-1">
            Active Listings
          </div>
          <div className="text-3xl font-extrabold text-parko-charcoal">
            {stats?.active_listings || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            {stats?.pending_listings || 0} pending admin review
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase tracking-wider mb-1">
            Pending Approvals
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {stats?.pending_approvals || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            Driver requests awaiting your decision
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase tracking-wider mb-1">
            Upcoming Bookings
          </div>
          <div className="text-3xl font-extrabold text-parko-charcoal">
            {stats?.upcoming_bookings || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            Slots reserved and confirmed
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase tracking-wider mb-1">
            Demo Earnings
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            ₹{stats?.total_earnings || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            Completed reservations
          </div>
        </div>
      </div>

      {/* Incoming Requests Section */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-parko-charcoal mb-4">
          Incoming Booking Requests & History
        </h2>

        {loading ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-parko-border text-xs text-parko-muted">
            Loading booking requests...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-parko-border text-xs text-parko-muted">
            No booking requests received yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.booking_id}
                className="bg-white rounded-2xl p-5 border border-parko-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-parko-charcoal">
                      Request #{b.booking_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.booking_status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : b.booking_status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : b.booking_status === 'completed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {b.booking_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-parko-charcoal">
                    {b.space_title} &bull; Driver: {b.driver_name} ({b.driver_phone})
                  </h3>

                  <div className="text-xs text-parko-muted mt-0.5">
                    Schedule: {new Date(b.start_time).toLocaleString()} &rarr; {new Date(b.end_time).toLocaleTimeString()} &bull; Total: ₹{b.amount}
                  </div>

                  {b.cancellation_reason && (
                    <div className="text-[11px] text-red-600 font-medium mt-1">
                      Reason: {b.cancellation_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {b.booking_status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleDecision(b.booking_id, 'approve')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecision(b.booking_id, 'decline')}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {b.booking_status === 'confirmed' && (
                    <button
                      onClick={() => setCancelModalBookingId(b.booking_id)}
                      className="px-3 py-1.5 rounded-xl border border-parko-border text-parko-charcoal hover:bg-parko-sand text-xs font-bold"
                    >
                      Request Cancellation
                    </button>
                  )}

                  {/* Mutual Review: Host Reviews Driver after completed booking */}
                  {b.booking_status === 'completed' && !b.host_review_id && (
                    <button
                      onClick={() => {
                        setReviewBookingId(b.booking_id);
                        setReviewDriverName(b.driver_name);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-parko-border bg-parko-sand/60 hover:bg-parko-sand text-parko-charcoal text-xs font-bold flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      Review Driver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Listings Section */}
      <div>
        <h2 className="text-lg font-extrabold text-parko-charcoal mb-4">
          My Parking Space Listings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((s) => (
            <div
              key={s.space_id}
              className="bg-white rounded-3xl p-5 border border-parko-border shadow-xs space-y-3"
            >
              <div className="flex justify-between items-start">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    s.listing_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : s.listing_status === 'pending_verification'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {s.listing_status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-base font-extrabold text-parko-charcoal">
                  ₹{s.hourly_rate}/hr
                </span>
              </div>

              <h3 className="font-bold text-sm text-parko-charcoal line-clamp-1">
                {s.title}
              </h3>
              <p className="text-xs text-parko-muted line-clamp-2">
                {s.description}
              </p>

              <div className="pt-3 border-t border-parko-border text-xs text-parko-muted space-y-1">
                <div>Private Address: <span className="font-medium text-parko-charcoal">{s.exact_address}</span></div>
                <div>Approval Mode: <span className="font-medium text-parko-charcoal">{s.approval_mode}</span></div>
              </div>

              <div className="pt-2 border-t border-parko-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setAvailSpaceId(s.space_id)}
                  className="px-3 py-1.5 rounded-xl border border-parko-border text-xs font-bold text-parko-charcoal hover:bg-parko-sand flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-parko-coral" />
                  Add Availability
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Host Cancellation Modal (Mandatory reason required) */}
      {cancelModalBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <h3 className="text-xl font-extrabold text-parko-charcoal mb-2">
              Request Booking Cancellation
            </h3>
            <p className="text-xs text-parko-muted mb-4">
              Per Parko safety policy, hosts cannot silently cancel confirmed bookings. An administrator will review your reason. Slot remains protected until approved.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Mandatory reason (e.g., burst water pipe on driveway, emergency repair)..."
              rows={3}
              className="w-full p-3 rounded-xl border border-parko-border text-xs mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalBookingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-parko-border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleHostCancelRequest}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Submit to Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mutual Review: Host Reviews Driver Modal */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <h3 className="text-xl font-extrabold text-parko-charcoal mb-1">
              Review Driver: {reviewDriverName}
            </h3>
            <p className="text-xs text-parko-muted mb-4">
              Booking #{reviewBookingId} &bull; Provide honest host feedback on punctuality and vehicle parking.
            </p>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1.5"
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
                placeholder="Was the driver on time? Did they follow driveway instructions?"
                rows={3}
                className="w-full p-3 rounded-xl border border-parko-border text-xs focus:ring-1 focus:ring-parko-coral"
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
                onClick={handleSubmitDriverReview}
                className="flex-1 py-2.5 rounded-xl bg-parko-charcoal text-white text-xs font-bold shadow-soft"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Availability Modal */}
      {availSpaceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-extrabold text-parko-charcoal">
                Add Availability Window
              </h3>
              <button onClick={() => setAvailSpaceId(null)} className="p-1 text-parko-muted hover:text-parko-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-parko-muted mb-4">
              Add a new dated availability slot to Space #{availSpaceId} stored in <code>AVAILABILITY_WINDOW</code>.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-parko-charcoal mb-1">Date</label>
                <input
                  type="date"
                  value={availDate}
                  onChange={(e) => setAvailDate(e.target.value)}
                  className="w-full p-2.5 border border-parko-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-parko-charcoal mb-1">Start Time</label>
                  <input
                    type="time"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="w-full p-2.5 border border-parko-border rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-parko-charcoal mb-1">End Time</label>
                  <input
                    type="time"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="w-full p-2.5 border border-parko-border rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAvailSpaceId(null)}
                className="flex-1 py-2.5 rounded-xl border border-parko-border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAvailability}
                className="flex-1 py-2.5 rounded-xl bg-parko-charcoal text-white text-xs font-bold flex items-center justify-center gap-1 shadow-soft"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
