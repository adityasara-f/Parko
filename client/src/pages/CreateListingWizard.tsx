import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { ArrowLeft, ArrowRight, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export const CreateListingWizard: React.FC = () => {
  const navigate = useNavigate();

  // Step 1 to 5
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('compact_car');
  const [accessMethod, setAccessMethod] = useState('open_driveway');

  const [exactAddress, setExactAddress] = useState('');
  const [preciseLat, setPreciseLat] = useState('12.9350000');
  const [preciseLng, setPreciseLng] = useState('79.1450000');
  const [privateNotes, setPrivateNotes] = useState('');

  const [hourlyRate, setHourlyRate] = useState('40.00');
  const [approvalMode, setApprovalMode] = useState('instant');

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/owner/spaces', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          vehicle_category: vehicleCategory,
          hourly_rate: hourlyRate,
          access_method: accessMethod,
          approval_mode: approvalMode,
          exact_address: exactAddress,
          precise_latitude: preciseLat,
          precise_longitude: preciseLng,
          private_notes: privateNotes,
        }),
      });

      if (res.success) {
        setStep(5); // Success step
      } else {
        setError(res.error || 'Failed to submit listing');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Wizard Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/owner')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-parko-charcoal hover:text-parko-coral transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Owner View
        </button>
        <h1 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
          List Your Parking Space
        </h1>
        <p className="text-xs text-parko-muted mt-0.5">
          Follow the 4-step guided wizard. Submitted spaces enter administrator verification before public display.
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mt-6 max-w-md mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  step === s
                    ? 'bg-parko-charcoal text-white ring-4 ring-parko-coral/20'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-parko-sand text-parko-muted'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <div className="w-12 sm:w-16 h-1 bg-parko-border mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* STEP 1: Space Details */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft space-y-4">
          <h2 className="text-lg font-extrabold text-parko-charcoal">
            Step 1: Space Characteristics
          </h2>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">Listing Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Covered Driveway near VIT Katpadi Gate"
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium focus:ring-1 focus:ring-parko-coral"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">Public Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe surface, lighting, CCTV coverage, and accessibility..."
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Vehicle Category</label>
              <select
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-semibold bg-parko-sand/30"
              >
                <option value="compact_car">Compact Car / Sedan</option>
                <option value="suv">SUV / Large Vehicle</option>
                <option value="two_wheeler">Two-Wheeler</option>
                <option value="ev_car">EV Car (with plug)</option>
                <option value="all">All Vehicle Types</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Access Method</label>
              <select
                value={accessMethod}
                onChange={(e) => setAccessMethod(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-semibold bg-parko-sand/30"
              >
                <option value="open_driveway">Open Driveway</option>
                <option value="barrier_gate">Boom Barrier / Automatic Gate</option>
                <option value="automated_code">Digital Keypad Code</option>
                <option value="host_meet">Host Meet / Guided</option>
                <option value="key_pass">Key Lockbox</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                if (!title || !description) return setError('Title and description are required');
                setError(null);
                setStep(2);
              }}
              className="px-6 py-2.5 rounded-2xl bg-parko-charcoal text-white text-xs font-bold flex items-center gap-1.5"
            >
              Continue to Location
              <ArrowRight className="w-4 h-4 text-parko-coral" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Private Location (Strictly Protected) */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-parko-charcoal">
              Step 2: Private Space Location
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-parko-pink text-[10px] font-bold text-parko-charcoal">
              Protected Record
            </span>
          </div>

          <p className="text-xs text-parko-muted">
            The exact address and private notes entered here are stored in <code>PRIVATE_SPACE_LOCATION</code> and are never displayed in public search or listing cards.
          </p>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">Exact Street Address</label>
            <input
              type="text"
              required
              value={exactAddress}
              onChange={(e) => setExactAddress(e.target.value)}
              placeholder="House/Plot #, Street Name, Area, Vellore 632014"
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Precise Latitude</label>
              <input
                type="text"
                value={preciseLat}
                onChange={(e) => setPreciseLat(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">Precise Longitude</label>
              <input
                type="text"
                value={preciseLng}
                onChange={(e) => setPreciseLng(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">Private Access Notes & Gate Codes</label>
            <textarea
              rows={2}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="e.g., Lockbox combination is 9942*. Released only after booking confirmation."
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium"
            />
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-2xl border border-parko-border text-xs font-bold"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!exactAddress) return setError('Exact street address is required');
                setError(null);
                setStep(3);
              }}
              className="px-6 py-2.5 rounded-2xl bg-parko-charcoal text-white text-xs font-bold flex items-center gap-1.5"
            >
              Continue to Pricing
              <ArrowRight className="w-4 h-4 text-parko-coral" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pricing & Approval Mode */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft space-y-4">
          <h2 className="text-lg font-extrabold text-parko-charcoal">
            Step 3: Hourly Pricing & Approval Rules
          </h2>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">Hourly Rate (INR ₹)</label>
            <input
              type="number"
              step="5"
              min="10"
              max="500"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-extrabold text-parko-charcoal"
            />
            <p className="text-[11px] text-parko-muted mt-1">
              Hourly pricing is the active model. Daily rate is automatically computed per contract.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-2">Booking Approval Policy</label>
            <div className="space-y-2 text-xs">
              {[
                { id: 'instant', title: 'Instant Booking', desc: 'Drivers can book immediately with a 3-minute payment checkout window.' },
                { id: 'manual_5min', title: 'Manual Fast Approval (5-min response)', desc: 'Eligible for immediate parkers. You receive a 5-minute window to approve.' },
                { id: 'manual_10min', title: 'Manual Fast Approval (10-min response)', desc: 'You receive 10 minutes to accept incoming requests.' },
                { id: 'manual_30min', title: 'Standard Approval (30-min window)', desc: 'Reserved for advance/future bookings. Not offered for immediate parking.' }
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                    approvalMode === m.id
                      ? 'border-parko-coral bg-parko-coral/5 ring-1 ring-parko-coral'
                      : 'border-parko-border hover:bg-parko-sand/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="approvalMode"
                    value={m.id}
                    checked={approvalMode === m.id}
                    onChange={(e) => setApprovalMode(e.target.value)}
                    className="mt-0.5 accent-parko-coral"
                  />
                  <div>
                    <div className="font-bold text-parko-charcoal">{m.title}</div>
                    <div className="text-[11px] text-parko-muted">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-2xl border border-parko-border text-xs font-bold"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-2xl bg-parko-charcoal text-white text-xs font-bold flex items-center gap-1.5"
            >
              Review Listing
              <ArrowRight className="w-4 h-4 text-parko-coral" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-6 border border-parko-border shadow-soft space-y-4">
          <h2 className="text-lg font-extrabold text-parko-charcoal">
            Step 4: Review Listing Summary
          </h2>

          <div className="p-4 rounded-2xl bg-parko-sand/50 space-y-2 text-xs">
            <div><span className="font-bold">Title:</span> {title}</div>
            <div><span className="font-bold">Vehicle:</span> {vehicleCategory}</div>
            <div><span className="font-bold">Hourly Rate:</span> ₹{hourlyRate}/hr</div>
            <div><span className="font-bold">Approval Mode:</span> {approvalMode}</div>
            <div><span className="font-bold">Exact Address (Protected):</span> {exactAddress}</div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Upon submission, your listing enters <code>pending_verification</code>. A platform administrator reviews listing safety before public display.</span>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2.5 rounded-2xl border border-parko-border text-xs font-bold"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-parko-coral hover:bg-red-500 text-white text-xs font-bold shadow-coral-glow"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Success Confirmation */}
      {step === 5 && (
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-lift text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-extrabold text-parko-charcoal">
            Listing Submitted!
          </h2>

          <p className="text-xs text-parko-muted max-w-md mx-auto">
            Your space has been recorded in the database. Initial availability windows have been configured. The platform administrator can now approve your space.
          </p>

          <button
            onClick={() => navigate('/owner')}
            className="px-6 py-3 rounded-2xl bg-parko-charcoal text-white text-xs font-bold"
          >
            Go to Owner Dashboard
          </button>
        </div>
      )}

    </div>
  );
};
