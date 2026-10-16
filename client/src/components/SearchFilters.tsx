import React, { useState } from 'react';
import { Search, SlidersHorizontal, Clock, ArrowUpDown } from 'lucide-react';

interface SearchFiltersProps {
  onSearch: (filters: {
    vehicleCategory?: string;
    maxPrice?: number;
    approvalMode?: string;
    minRating?: number;
    startTime?: string;
    durationHours?: number;
  }) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ onSearch }) => {
  const [vehicleCategory, setVehicleCategory] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [approvalMode, setApprovalMode] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleApply = () => {
    onSearch({
      vehicleCategory: vehicleCategory === 'all' ? undefined : vehicleCategory,
      maxPrice: maxPrice || undefined,
      approvalMode: approvalMode || undefined,
      minRating: minRating > 0 ? minRating : undefined,
      durationHours
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-parko-border shadow-xs mb-4">
      {/* Top search row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-parko-muted uppercase tracking-wider mb-1">
            Vehicle
          </label>
          <select
            value={vehicleCategory}
            onChange={(e) => {
              setVehicleCategory(e.target.value);
              onSearch({ vehicleCategory: e.target.value === 'all' ? undefined : e.target.value, maxPrice, approvalMode, minRating, durationHours });
            }}
            className="w-full text-xs font-semibold bg-parko-sand/60 border border-parko-border rounded-xl px-3 py-2 text-parko-charcoal focus:outline-none focus:ring-1 focus:ring-parko-coral"
          >
            <option value="all">All Vehicles</option>
            <option value="compact_car">Compact Car / Sedan</option>
            <option value="suv">SUV / Large</option>
            <option value="two_wheeler">Two-Wheeler</option>
            <option value="ev_car">EV Car (with plug)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-parko-muted uppercase tracking-wider mb-1">
            Duration
          </label>
          <div className="flex items-center gap-1">
            <select
              value={durationHours}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDurationHours(val);
                onSearch({ vehicleCategory: vehicleCategory === 'all' ? undefined : vehicleCategory, maxPrice, approvalMode, minRating, durationHours: val });
              }}
              className="w-full text-xs font-semibold bg-parko-sand/60 border border-parko-border rounded-xl px-3 py-2 text-parko-charcoal focus:outline-none focus:ring-1 focus:ring-parko-coral"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={3}>3 hours</option>
              <option value={5}>5 hours</option>
              <option value={8}>8 hours (Full day)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-parko-muted uppercase tracking-wider mb-1">
            Max Rate (₹{maxPrice}/hr)
          </label>
          <input
            type="range"
            min={15}
            max={100}
            step={5}
            value={maxPrice}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMaxPrice(val);
              onSearch({ vehicleCategory: vehicleCategory === 'all' ? undefined : vehicleCategory, maxPrice: val, approvalMode, minRating, durationHours });
            }}
            className="w-full accent-parko-coral cursor-pointer mt-2"
          />
        </div>
      </div>

      {/* Advanced filters toggle */}
      <div className="mt-3 pt-2.5 border-t border-parko-border/60 flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-parko-charcoal/70 hover:text-parko-charcoal flex items-center gap-1"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-parko-coral" />
          {showAdvanced ? 'Hide filters' : 'More filters'}
        </button>

        <span className="text-[11px] text-parko-muted">
          Vellore market &bull; Demo data active
        </span>
      </div>

      {/* Advanced expandable section */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-parko-border/60 grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-parko-muted mb-1">
              Booking Type
            </label>
            <select
              value={approvalMode}
              onChange={(e) => {
                setApprovalMode(e.target.value);
                onSearch({ vehicleCategory: vehicleCategory === 'all' ? undefined : vehicleCategory, maxPrice, approvalMode: e.target.value || undefined, minRating, durationHours });
              }}
              className="w-full text-xs font-semibold bg-parko-sand/60 border border-parko-border rounded-xl px-2.5 py-1.5"
            >
              <option value="">Any Mode</option>
              <option value="instant">Instant Booking only</option>
              <option value="manual_5min">Fast Owner Approval (5-10 min)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-parko-muted mb-1">
              Min Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinRating(val);
                onSearch({ vehicleCategory: vehicleCategory === 'all' ? undefined : vehicleCategory, maxPrice, approvalMode, minRating: val > 0 ? val : undefined, durationHours });
              }}
              className="w-full text-xs font-semibold bg-parko-sand/60 border border-parko-border rounded-xl px-2.5 py-1.5"
            >
              <option value={0}>Any Rating</option>
              <option value={4}>4.0+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
