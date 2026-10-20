import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { ParkingSpace } from '../components/ListingCard';
import { MapView } from '../components/MapView';
import { Navigation, Clock, ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft, CalendarClock } from 'lucide-react';

export const BookingFlowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isImmediate = searchParams.get('immediate') !== 'false';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [windows, setWindows] = useState<any[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);
  const [routePreview, setRoutePreview] = useState<{ destination_lat: number; destination_lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);

  // Booking step: 'select_time' -> 'hold_created' -> 'confirmed'
  const [step, setStep] = useState<'select_time' | 'hold_created' | 'confirmed'>('select_time');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [startTime, setStartTime] = useState<string>('');
  const [bookingData, setBookingData] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking'>('upi');
  const [holdTimer, setHoldTimer] = useState<number>(180); // 3 mins default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load space & availability
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const res = await apiRequest(`/spaces/${id}`);
      if (res.success && res.space) {
        setSpace(res.space);
      }

      const availRes = await apiRequest(`/spaces/${id}/availability`);
      if (availRes.success && availRes.windows) {
        // Filter: if immediate mode, only show windows that start now or soon
        const now = new Date();
        let filtered = availRes.windows as any[];

        if (isImmediate) {
          // Show windows that are currently open (started, not yet ended)
          filtered = filtered.filter((w: any) => new Date(w.start_time) <= now && new Date(w.end_time) > now);
        } else {
          // Show all future windows (start_time in the future or currently open)
          filtered = filtered.filter((w: any) => new Date(w.end_time) > now);
        }

        setWindows(filtered);

        if (filtered.length > 0) {
          setSelectedWindowId(filtered[0].availability_id);
          // Set default start time
          const wStart = new Date(filtered[0].start_time);
          const effectiveStart = wStart < now ? now : wStart;
          // Round up to next 30-minute boundary
          effectiveStart.setMinutes(Math.ceil(effectiveStart.getMinutes() / 30) * 30, 0, 0);
          const localIso = new Date(effectiveStart.getTime() - effectiveStart.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setStartTime(localIso);
        }
      }
    }
    loadData();
  }, [id, isImmediate]);

  // Load pre-booking route disclosure (Requires Authentication!)
  useEffect(() => {
    async function loadRoute() {
      if (!id || !user) return;
      try {
        const res = await apiRequest(`/spaces/${id}/route-preview`);
        if (res.success && res.routePreview) {
          setRoutePreview({
            destination_lat: Number(res.routePreview.destination_lat),
            destination_lng: Number(res.routePreview.destination_lng),
          });
        }
      } catch (err) {
        console.error('Route disclosure preview failed:', err);
      }
    }
    loadRoute();
  }, [id, user]);

  // Get driver geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn('Geolocation error:', err)
      );
    }
  }, []);

  // Hold countdown effect
  useEffect(() => {
    let interval: any;
    if (step === 'hold_created' && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, holdTimer]);

  // When window selection changes, auto-update the start time
  const handleWindowChange = (windowId: number) => {
    setSelectedWindowId(windowId);
    const w = windows.find((win: any) => win.availability_id === windowId);
    if (w) {
      const now = new Date();
      const wStart = new Date(w.start_time);
      const effectiveStart = wStart < now ? now : wStart;
      effectiveStart.setMinutes(Math.ceil(effectiveStart.getMinutes() / 30) * 30, 0, 0);
      const localIso = new Date(effectiveStart.getTime() - effectiveStart.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setStartTime(localIso);
    }
  };

  if (!space) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-xs font-semibold text-parko-muted animate-pulse">
          Loading parking bay details...
        </div>
      </div>
    );
  }

  // Calculate estimated total
  const estimatedTotal = (parseFloat(String(space.hourly_rate)) * durationHours).toFixed(2);

  // Validate that start is within selected window
  const getStartTimeValidation = (): string | null => {
    if (!startTime || !selectedWindowId) return null;
    const w = windows.find((win: any) => win.availability_id === selectedWindowId);
    if (!w) return null;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    const wStart = new Date(w.start_time);
    const wEnd = new Date(w.end_time);
    if (start < wStart) return `Start time must be at or after window opens: ${wStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (end > wEnd) return `Booking ends at ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} but window closes at ${wEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Reduce duration or pick an earlier start.`;
    if (start < new Date()) return 'Start time cannot be in the past.';
    return null;
  };

  // Handle Step 1: Submit Booking Hold
  const handleCreateHold = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/book/${id}` } } });
      return;
    }

    if (!selectedWindowId) {
      setError('Please select an active availability window');
      return;
    }

    if (!startTime) {
      setError('Please select a start time');
      return;
    }

    const validationError = getStartTimeValidation();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

      const res = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          spaceId: space.space_id,
          availabilityId: selectedWindowId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      if (res.success && res.booking) {
        setBookingData(res.booking);
        setHoldTimer(res.booking.hold_seconds || 180);
        setStep('hold_created');
      } else {
        setError(res.error || 'Failed to hold booking slot');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Complete Simulated Payment
  const handleCompletePayment = async () => {
    if (!bookingData) return;
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest(`/bookings/${bookingData.booking_id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });

      if (res.success) {
        setStep('confirmed');
      } else {
        setError(res.error || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validationMsg = getStartTimeValidation();
  const selectedWindow = windows.find((w: any) => w.availability_id === selectedWindowId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-parko-charcoal hover:text-parko-coral transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Booking Configuration & Payment (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Info */}
          <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-parko-sand text-xs font-bold text-parko-charcoal">
                {space.vehicle_category.replace(/_/g, ' ').toUpperCase()}
              </span>
              {space.approval_mode === 'instant' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                  <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                  Instant Booking
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Host Approval Required
                </span>
              )}
              {isImmediate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-parko-coral/10 text-xs font-bold text-parko-coral">
                  Immediate
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
              {space.title}
            </h1>
            <p className="text-xs text-parko-muted mt-1 leading-relaxed">
              {space.description}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Duration & Availability */}
          {step === 'select_time' && (
            <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft space-y-5">
              <h2 className="text-base font-extrabold text-parko-charcoal">
                1. Select Availability Window, Arrival Time &amp; Duration
              </h2>

              {/* No windows available message */}
              {windows.length === 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
                  {isImmediate
                    ? 'No availability window is open right now for immediate booking. Go back and try "Later / Scheduled" to book a future slot.'
                    : 'No upcoming availability windows found for this space.'}
                </div>
              )}

              {windows.length > 0 && (
                <>
                  {/* Availability Window Selector */}
                  <div>
                    <label className="block text-xs font-bold text-parko-charcoal mb-1">
                      Available Host Window
                    </label>
                    <select
                      value={selectedWindowId || ''}
                      onChange={(e) => handleWindowChange(Number(e.target.value))}
                      className="w-full text-xs font-semibold bg-parko-sand/40 border border-parko-border rounded-xl p-2.5"
                    >
                      {windows.map((w: any) => {
                        const wStart = new Date(w.start_time);
                        const wEnd = new Date(w.end_time);
                        return (
                          <option key={w.availability_id} value={w.availability_id}>
                            {wStart.toLocaleDateString()} {wStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {wEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </option>
                        );
                      })}
                    </select>
                    {selectedWindow && (
                      <p className="mt-1 text-[11px] text-parko-muted">
                        Window open: {new Date(selectedWindow.start_time).toLocaleString()} → {new Date(selectedWindow.end_time).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Arrival Time Picker */}
                    <div>
                      <label className="block text-xs font-bold text-parko-charcoal mb-1 flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-parko-coral" />
                        Arrival Time
                      </label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        className="w-full text-xs font-semibold bg-parko-sand/40 border border-parko-border rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-parko-coral"
                      />
                      {validationMsg && (
                        <p className="mt-1 text-[11px] text-red-600 font-semibold">{validationMsg}</p>
                      )}
                    </div>

                    {/* Duration Selector */}
                    <div>
                      <label className="block text-xs font-bold text-parko-charcoal mb-1">
                        Parking Duration
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full text-xs font-semibold bg-parko-sand/40 border border-parko-border rounded-xl p-2.5"
                      >
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={3}>3 hours</option>
                        <option value={4}>4 hours</option>
                        <option value={6}>6 hours</option>
                        <option value={8}>8 hours (Full day)</option>
                      </select>
                    </div>
                  </div>

                  {/* Exact Route Disclosure Notice */}
                  <div className="p-4 rounded-2xl bg-parko-sand/60 border border-parko-border text-xs text-parko-charcoal space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-parko-charcoal">
                      <Navigation className="w-4 h-4 text-parko-coral" />
                      Exact Destination Route Disclosed
                    </div>
                    <p className="text-[11px] text-parko-muted leading-relaxed">
                      As an authenticated driver, the map preview shows the exact destination route. Gate access codes and addresses are released immediately upon booking confirmation.
                    </p>
                  </div>

                  {/* Price summary & CTA */}
                  <div className="pt-4 border-t border-parko-border flex items-center justify-between">
                    <div>
                      <div className="text-xs text-parko-muted">Authoritative Total</div>
                      <div className="text-2xl font-extrabold text-parko-charcoal">
                        ₹{estimatedTotal}
                        <span className="text-xs font-normal text-parko-muted"> (₹{space.hourly_rate} &times; {durationHours}h)</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateHold}
                      disabled={loading || windows.length === 0 || !!validationMsg}
                      className="px-6 py-3 rounded-2xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-lift transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Reserving slot...' : user ? 'Reserve & Proceed' : 'Sign in to Reserve'}
                      <ArrowRight className="w-4 h-4 text-parko-coral" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Checkout Hold & Simulated Payment */}
          {step === 'hold_created' && bookingData && (
            <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-lift space-y-6">
              
              {/* Countdown Alert */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {bookingData.booking_type === 'instant' ? 'Slot Reserved: Checkout Hold Active' : 'Booking Request Sent — Awaiting Owner Approval'}
                    </div>
                    <div className="text-[11px] text-amber-700">
                      {bookingData.booking_type === 'instant'
                        ? 'Complete demo payment before timer expires.'
                        : 'Owner has been notified. If approved, you will get 3 minutes to pay.'}
                    </div>
                  </div>
                </div>
                <div className="text-xl font-extrabold font-mono text-amber-900">
                  {Math.floor(holdTimer / 60)}:{(holdTimer % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {/* Booking Summary */}
              <div className="p-4 rounded-2xl bg-parko-sand/40 border border-parko-border text-xs space-y-1">
                <div className="font-bold text-parko-charcoal mb-2">Booking Summary</div>
                <div className="flex justify-between">
                  <span className="text-parko-muted">Space</span>
                  <span className="font-semibold text-parko-charcoal">{space.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-parko-muted">Arrival</span>
                  <span className="font-semibold text-parko-charcoal">{new Date(startTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-parko-muted">Duration</span>
                  <span className="font-semibold text-parko-charcoal">{durationHours} hour{durationHours > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between border-t border-parko-border pt-1 mt-1">
                  <span className="font-bold text-parko-charcoal">Total</span>
                  <span className="font-extrabold text-parko-coral">₹{bookingData.amount} INR</span>
                </div>
              </div>

              {/* Only show payment UI for instant bookings (owner-approval waits for owner) */}
              {bookingData.booking_type === 'instant' && (
                <>
                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold text-parko-charcoal mb-2">
                      Simulated Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'upi', label: 'UPI (GPay / PhonePe)' },
                        { id: 'card', label: 'Credit / Debit Card' },
                        { id: 'net_banking', label: 'Net Banking' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                            paymentMethod === m.id
                              ? 'border-parko-coral bg-parko-coral/10 text-parko-charcoal ring-1 ring-parko-coral'
                              : 'border-parko-border bg-white text-parko-muted hover:border-parko-charcoal'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  <div className="p-3.5 bg-parko-sand/50 rounded-2xl border border-parko-border text-[11px] text-parko-charcoal/80 space-y-1">
                    <div className="font-bold text-parko-charcoal flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Parko Cancellation Guarantee
                    </div>
                    <div>Free cancellation up to 2 hours before arrival, plus a 2-minute post-confirmation grace period.</div>
                  </div>

                  <div className="pt-4 border-t border-parko-border flex items-center justify-between">
                    <div>
                      <div className="text-xs text-parko-muted">Final Amount</div>
                      <div className="text-2xl font-extrabold text-parko-charcoal">
                        ₹{bookingData.amount} INR
                      </div>
                    </div>

                    <button
                      onClick={handleCompletePayment}
                      disabled={loading || holdTimer <= 0}
                      className="px-6 py-3.5 rounded-2xl bg-parko-coral hover:bg-red-500 text-white font-extrabold text-xs shadow-coral-glow transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Confirming...' : 'Complete Demo Payment'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {/* Owner-approval: go to My Bookings to wait */}
              {bookingData.booking_type === 'owner_approved' && (
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => navigate('/bookings')}
                    className="px-6 py-3 rounded-2xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-soft"
                  >
                    View in My Bookings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Confirmed & Access Released */}
          {step === 'confirmed' && (
            <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-lift text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-2xl font-extrabold text-parko-charcoal">
                Booking Confirmed!
              </h2>

              <p className="text-xs text-parko-muted max-w-md mx-auto">
                Your payment was simulated successfully. Gate codes, host instructions, and precise street addresses are now unlocked in your Bookings tab.
              </p>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => navigate('/bookings')}
                  className="px-6 py-3 rounded-2xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-soft"
                >
                  View Access Details in My Bookings
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Map & Route Disclosure Panel (5 Cols) */}
        <div className="lg:col-span-5 h-[520px] bg-white rounded-3xl border border-parko-border shadow-soft overflow-hidden relative">
          <MapView
            spaces={[space]}
            selectedSpace={space}
            onSelectSpace={() => {}}
            routePreviewCoords={routePreview ? [routePreview.destination_lat, routePreview.destination_lng] : null}
            center={[Number(space.approximate_latitude), Number(space.approximate_longitude)]}
            driverLocation={driverLocation}
          />
        </div>

      </div>
    </div>
  );
};
