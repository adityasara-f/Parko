import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { PlusCircle, Calendar, Check, X, ShieldAlert, Clock, AlertCircle } from 'lucide-react';

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancellation request modal
  const [cancelModalBookingId, setCancelModalBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

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
            Driver requests awaiting your call
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

      {/* Incoming Requests Section (Crucial state machine test) */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-parko-charcoal mb-4">
          Incoming Booking Requests
        </h2>

        {bookings.length === 0 ? (
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
                </div>

                <div className="flex items-center gap-2">
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

    </div>
  );
};
