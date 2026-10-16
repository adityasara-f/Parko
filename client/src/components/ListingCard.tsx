import React from 'react';
import { Star, ShieldCheck, Zap, Clock, Navigation } from 'lucide-react';

export interface ParkingSpace {
  space_id: number;
  title: string;
  description: string;
  vehicle_category: string;
  hourly_rate: string | number;
  access_method: string;
  approval_mode: string;
  approximate_latitude: string | number;
  approximate_longitude: string | number;
  city_name: string;
  currency: string;
  host_name?: string;
  average_rating: string | number;
  total_reviews: number;
}

interface ListingCardProps {
  space: ParkingSpace;
  isSelected: boolean;
  onSelect: (space: ParkingSpace) => void;
  onBook: (space: ParkingSpace) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  space,
  isSelected,
  onSelect,
  onBook,
}) => {
  const formatVehicle = (cat: string) => {
    switch (cat) {
      case 'compact_car': return 'Compact Car';
      case 'suv': return 'SUV / Large';
      case 'two_wheeler': return 'Two-Wheeler';
      case 'ev_car': return 'EV Car with Charger';
      default: return 'All Vehicles';
    }
  };

  const formatAccess = (method: string) => {
    switch (method) {
      case 'barrier_gate': return 'Boom Barrier';
      case 'automated_code': return 'Digital Keypad';
      case 'host_meet': return 'Host Guided';
      case 'key_pass': return 'Key Lockbox';
      default: return 'Open Driveway';
    }
  };

  return (
    <div
      onClick={() => onSelect(space)}
      className={`group cursor-pointer rounded-2xl p-4 transition-all border ${
        isSelected
          ? 'bg-white border-parko-coral shadow-lift ring-2 ring-parko-coral/20'
          : 'bg-white/80 hover:bg-white border-parko-border hover:border-parko-charcoal/20 shadow-xs'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          {/* Tags */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-parko-sand text-[11px] font-semibold text-parko-charcoal">
              {formatVehicle(space.vehicle_category)}
            </span>
            {space.approval_mode === 'instant' ? (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-bold text-emerald-700">
                <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                Instant Book
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-[11px] font-bold text-amber-700">
                <Clock className="w-3 h-3 text-amber-500" />
                Host Approval
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-parko-charcoal group-hover:text-parko-coral transition-colors line-clamp-1">
            {space.title}
          </h3>

          <p className="text-xs text-parko-muted line-clamp-1 mt-0.5">
            {space.description}
          </p>
        </div>

        {/* Pricing badge */}
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-parko-charcoal">
            ₹{parseFloat(String(space.hourly_rate)).toFixed(0)}
            <span className="text-xs font-normal text-parko-muted">/hr</span>
          </div>
          <div className="text-[10px] text-parko-muted">Incl. demo taxes</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-parko-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-parko-charcoal/70">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold text-parko-charcoal">
              {Number(space.average_rating) > 0 ? space.average_rating : 'New'}
            </span>
            {space.total_reviews > 0 && (
              <span className="text-parko-muted">({space.total_reviews})</span>
            )}
          </span>

          <span className="flex items-center gap-1 text-[11px] text-parko-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {formatAccess(space.access_method)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook(space);
          }}
          className="px-3 py-1.5 rounded-xl bg-parko-charcoal hover:bg-parko-coral text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
        >
          Book Now
          <Navigation className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
