import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { ShieldAlert, Check, X, Ban, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'disputes'>('listings');

  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dispute resolution modal
  const [resolvingDispute, setResolvingDispute] = useState<any | null>(null);
  const [resolutionText, setResolutionText] = useState<string>('');
  const [approveCancellation, setApproveCancellation] = useState<boolean>(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const mRes = await apiRequest('/admin/metrics');
      if (mRes.success && mRes.metrics) setMetrics(mRes.metrics);

      const lRes = await apiRequest('/admin/listings');
      if (lRes.success && lRes.listings) setListings(lRes.listings);

      const uRes = await apiRequest('/admin/users');
      if (uRes.success && uRes.users) setUsers(uRes.users);

      const dRes = await apiRequest('/admin/disputes');
      if (dRes.success && dRes.disputes) setDisputes(dRes.disputes);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Listing Verification Decision
  const handleListingDecide = async (spaceId: number, status: 'approved' | 'rejected') => {
    const res = await apiRequest(`/admin/listings/${spaceId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });

    if (res.success) {
      alert(res.message);
      loadAll();
    } else {
      alert(res.error || 'Failed to update listing');
    }
  };

  // Toggle Space Suspension
  const handleSpaceStatus = async (spaceId: number, status: 'approved' | 'suspended') => {
    const res = await apiRequest(`/admin/listings/${spaceId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });

    if (res.success) {
      alert(res.message);
      loadAll();
    }
  };

  // User Verification
  const handleUserVerify = async (userId: number, status: 'verified' | 'rejected') => {
    const res = await apiRequest(`/admin/users/${userId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });

    if (res.success) {
      alert(res.message);
      loadAll();
    }
  };

  // Toggle User Suspension
  const handleUserStatus = async (userId: number, status: 'active' | 'suspended') => {
    const res = await apiRequest(`/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });

    if (res.success) {
      alert(res.message);
      loadAll();
    }
  };

  // Resolve Dispute
  const handleResolveDispute = async () => {
    if (!resolvingDispute || !resolutionText) return;
    const res = await apiRequest(`/admin/disputes/${resolvingDispute.dispute_id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        resolution: resolutionText,
        approveCancellation,
      }),
    });

    if (res.success) {
      alert(res.message);
      setResolvingDispute(null);
      setResolutionText('');
      loadAll();
    } else {
      alert(res.error || 'Failed to resolve dispute');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Administrator Restricted Area
          </div>
          <h1 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
            Parko Control Center
          </h1>
          <p className="text-xs text-parko-muted mt-0.5">
            Backend configured authority (User ID #1). Inspect verifications, safety suspensions, and disputes.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="p-2.5 rounded-2xl bg-white border border-parko-border hover:bg-parko-sand text-parko-charcoal shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase mb-1">Listings Review</div>
          <div className="text-2xl font-extrabold text-parko-charcoal">
            {metrics?.spaces?.pending_spaces || 0} Pending
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            {metrics?.spaces?.approved_spaces || 0} currently public
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase mb-1">Open Disputes</div>
          <div className="text-2xl font-extrabold text-red-600">
            {metrics?.disputes?.open_disputes || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            Requires resolution
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase mb-1">Registered Users</div>
          <div className="text-2xl font-extrabold text-parko-charcoal">
            {metrics?.users?.total_users || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            {metrics?.users?.suspended_users || 0} suspended
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-parko-border shadow-xs">
          <div className="text-xs font-bold text-parko-muted uppercase mb-1">Platform Volume</div>
          <div className="text-2xl font-extrabold text-parko-charcoal">
            ₹{metrics?.bookings?.total_volume || 0}
          </div>
          <div className="text-[11px] text-parko-muted mt-1">
            {metrics?.bookings?.confirmed_bookings || 0} confirmed bookings
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-parko-border mb-6 max-w-md">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'listings' ? 'bg-parko-charcoal text-white shadow-xs' : 'text-parko-muted'
          }`}
        >
          Listing Verifications ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'disputes' ? 'bg-parko-charcoal text-white shadow-xs' : 'text-parko-muted'
          }`}
        >
          Disputes & Cancellations ({disputes.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'users' ? 'bg-parko-charcoal text-white shadow-xs' : 'text-parko-muted'
          }`}
        >
          Users & Accounts ({users.length})
        </button>
      </div>

      {/* TAB 1: LISTINGS VERIFICATION QUEUE */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {listings.map((l) => (
            <div
              key={l.space_id}
              className="bg-white rounded-3xl p-6 border border-parko-border shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-parko-charcoal">
                      Space #{l.space_id}: {l.title}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        l.listing_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : l.listing_status === 'pending_verification'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {l.listing_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-parko-muted mt-0.5">
                    Host: {l.host_name} &bull; {l.host_email} &bull; {l.host_phone}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {l.listing_status === 'pending_verification' && (
                    <>
                      <button
                        onClick={() => handleListingDecide(l.space_id, 'approved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleListingDecide(l.space_id, 'rejected')}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {l.listing_status === 'approved' && (
                    <button
                      onClick={() => handleSpaceStatus(l.space_id, 'suspended')}
                      className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Suspend Listing
                    </button>
                  )}

                  {l.listing_status === 'suspended' && (
                    <button
                      onClick={() => handleSpaceStatus(l.space_id, 'approved')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      Restore Listing
                    </button>
                  )}
                </div>
              </div>

              {/* Private Location details visible exclusively to admin */}
              <div className="p-3.5 bg-parko-sand/40 rounded-2xl border border-parko-border text-xs space-y-1">
                <div><span className="font-bold text-parko-charcoal">Protected Exact Address:</span> {l.exact_address}</div>
                <div><span className="font-bold text-parko-charcoal">Precise Coords:</span> ({l.precise_latitude}, {l.precise_longitude})</div>
                <div><span className="font-bold text-parko-charcoal">Private Notes:</span> {l.private_notes || 'None'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DISPUTES & CANCELLATION REQUESTS */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div
              key={d.dispute_id}
              className="bg-white rounded-3xl p-6 border border-parko-border shadow-xs space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-parko-charcoal">
                      Dispute #{d.dispute_id} &bull; Booking #{d.booking_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.dispute_status === 'open' ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {d.dispute_status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-parko-sand text-[10px] font-bold text-parko-charcoal">
                      {d.issue_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-parko-muted mt-0.5">
                    Reported by: {d.reporter_name} ({d.reporter_email})
                  </div>
                </div>

                {d.dispute_status === 'open' && (
                  <button
                    onClick={() => {
                      setResolvingDispute(d);
                      setResolutionText('');
                    }}
                    className="px-4 py-2 rounded-xl bg-parko-charcoal text-white text-xs font-bold"
                  >
                    Resolve Dispute
                  </button>
                )}
              </div>

              <div className="text-xs text-parko-charcoal/90 bg-parko-sand/30 p-3 rounded-2xl">
                {d.description}
              </div>

              {d.resolution && (
                <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                  <span className="font-bold">Admin Resolution:</span> {d.resolution}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: USERS & ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.user_id}
              className="bg-white rounded-2xl p-5 border border-parko-border shadow-xs flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-parko-charcoal">
                    User #{u.user_id}: {u.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {u.account_status.toUpperCase()}
                  </span>
                  {u.verification_status && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {u.verification_type}: {u.verification_status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-parko-muted mt-0.5">
                  {u.email} &bull; {u.phone}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {u.verification_status === 'pending' && (
                  <button
                    onClick={() => handleUserVerify(u.user_id, 'verified')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    Verify ID
                  </button>
                )}

                {u.account_status === 'active' ? (
                  <button
                    onClick={() => handleUserStatus(u.user_id, 'suspended')}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50"
                  >
                    Suspend User
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserStatus(u.user_id, 'active')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {resolvingDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-parko-border shadow-lift">
            <h3 className="text-xl font-extrabold text-parko-charcoal mb-2">
              Resolve Dispute #{resolvingDispute.dispute_id}
            </h3>

            {resolvingDispute.issue_type === 'owner_cancellation' && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <span className="font-bold">Owner Cancellation Decision:</span>
                <div className="mt-1 flex gap-4">
                  <label className="flex items-center gap-1 font-semibold">
                    <input
                      type="radio"
                      name="cancelDecision"
                      checked={approveCancellation}
                      onChange={() => setApproveCancellation(true)}
                    />
                    Approve Cancellation (Releases Slot)
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    <input
                      type="radio"
                      name="cancelDecision"
                      checked={!approveCancellation}
                      onChange={() => setApproveCancellation(false)}
                    />
                    Reject (Retains Slot)
                  </label>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-parko-charcoal mb-1">
                Administrative Resolution Notes
              </label>
              <textarea
                rows={3}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="State the resolution and actions communicated to participants..."
                className="w-full p-2.5 rounded-xl border border-parko-border text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setResolvingDispute(null)}
                className="flex-1 py-2.5 rounded-xl border border-parko-border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                className="flex-1 py-2.5 rounded-xl bg-parko-charcoal text-white text-xs font-bold"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
