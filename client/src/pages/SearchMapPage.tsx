import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { ListingCard, ParkingSpace } from '../components/ListingCard';
import { MapView } from '../components/MapView';
import { SearchFilters } from '../components/SearchFilters';
import { WelcomeOverlay } from '../components/WelcomeOverlay';
import { Split, MapPin, RefreshCw, X, ChevronRight, Zap, ShieldCheck } from 'lucide-react';

export const SearchMapPage: React.FC = () => {
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [splitRatio, setSplitRatio] = useState<number>(45); // Left panel 45%, map 55%
  const [activeTabMobile, setActiveTabMobile] = useState<'list' | 'map'>('list');

  const fetchSpaces = async (filterParams: any = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterParams.vehicleCategory) query.append('vehicleCategory', filterParams.vehicleCategory);
      if (filterParams.maxPrice) query.append('maxPrice', String(filterParams.maxPrice));
      if (filterParams.approvalMode) query.append('approvalMode', filterParams.approvalMode);
      if (filterParams.minRating) query.append('minRating', String(filterParams.minRating));

      const res = await apiRequest(`/spaces/search?${query.toString()}`);
      if (res.success && res.spaces) {
        setSpaces(res.spaces);
        if (res.spaces.length > 0 && !selectedSpace) {
          setSelectedSpace(res.spaces[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load spaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleBook = (space: ParkingSpace) => {
    navigate(`/book/${space.space_id}`);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      {/* First-visit welcome overlay over visible map */}
      <WelcomeOverlay onDismiss={() => {}} />

      {/* Mobile switcher */}
      <div className="md:hidden flex bg-white border-b border-parko-border p-2">
        <button
          onClick={() => setActiveTabMobile('list')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTabMobile === 'list'
              ? 'bg-parko-charcoal text-white'
              : 'text-parko-muted hover:text-parko-charcoal'
          }`}
        >
          Spaces ({spaces.length})
        </button>
        <button
          onClick={() => setActiveTabMobile('map')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTabMobile === 'map'
              ? 'bg-parko-charcoal text-white'
              : 'text-parko-muted hover:text-parko-charcoal'
          }`}
        >
          Interactive Map
        </button>
      </div>

      {/* Main Split-screen container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Search & Listings */}
        <div
          style={{ width: `${splitRatio}%` }}
          className={`h-full flex flex-col bg-parko-ivory border-r border-parko-border z-20 transition-all ${
            activeTabMobile === 'map' ? 'hidden md:flex' : 'flex w-full md:w-auto'
          }`}
        >
          {/* Header & Filters */}
          <div className="p-4 border-b border-parko-border bg-parko-ivory/95 backdrop-blur-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-extrabold text-parko-charcoal tracking-tight">
                  Vellore Parking Spaces
                </h1>
                <p className="text-xs text-parko-muted">
                  {spaces.length} verified demo bays available
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchSpaces()}
                  title="Refresh results"
                  className="p-2 rounded-xl bg-white border border-parko-border hover:bg-parko-sand text-parko-charcoal transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setSplitRatio(splitRatio === 50 ? 65 : 50)}
                  title="Toggle panel width"
                  className="hidden md:flex p-2 rounded-xl bg-white border border-parko-border hover:bg-parko-sand text-parko-charcoal transition-colors shadow-xs"
                >
                  <Split className="w-3.5 h-3.5 text-parko-coral" />
                </button>
              </div>
            </div>

            <SearchFilters onSearch={fetchSpaces} />
          </div>

          {/* Listings List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-parko-muted">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-parko-coral" />
                <span className="text-xs font-semibold">Searching nearby spaces...</span>
              </div>
            ) : spaces.length === 0 ? (
              <div className="text-center py-16 p-4 bg-white/60 rounded-3xl border border-parko-border">
                <MapPin className="w-8 h-8 text-parko-muted mx-auto mb-2" />
                <h3 className="font-bold text-sm text-parko-charcoal">No spaces found</h3>
                <p className="text-xs text-parko-muted mt-1">
                  Try broadening your price limit or clearing vehicle filters.
                </p>
              </div>
            ) : (
              spaces.map((space) => (
                <ListingCard
                  key={space.space_id}
                  space={space}
                  isSelected={selectedSpace?.space_id === space.space_id}
                  onSelect={(s) => setSelectedSpace(s)}
                  onBook={handleBook}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Map */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className={`h-full relative flex-1 transition-all ${
            activeTabMobile === 'list' ? 'hidden md:block' : 'block w-full'
          }`}
        >
          <MapView
            spaces={spaces}
            selectedSpace={selectedSpace}
            onSelectSpace={(s) => {
              setSelectedSpace(s);
              setActiveTabMobile('list'); // On mobile click, reveal card
            }}
          />

          {/* Selected Floating Preview Overlay on Map */}
          {selectedSpace && (
            <div className="absolute top-4 right-4 z-20 max-w-sm w-full bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-parko-border shadow-lift hidden lg:block animate-fade-in">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded-md bg-parko-sand text-[10px] font-bold uppercase tracking-wider text-parko-charcoal">
                  Selected Spot
                </span>
                <button
                  onClick={() => setSelectedSpace(null)}
                  className="p-1 text-parko-muted hover:text-parko-charcoal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-bold text-sm text-parko-charcoal mb-1">
                {selectedSpace.title}
              </h4>
              <p className="text-xs text-parko-muted line-clamp-2 mb-3">
                {selectedSpace.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-parko-border">
                <div>
                  <span className="text-base font-extrabold text-parko-charcoal">
                    ₹{selectedSpace.hourly_rate}
                  </span>
                  <span className="text-xs text-parko-muted">/hr</span>
                </div>

                <button
                  onClick={() => handleBook(selectedSpace)}
                  className="px-4 py-2 rounded-xl bg-parko-charcoal hover:bg-parko-coral text-white font-bold text-xs shadow-soft transition-colors flex items-center gap-1"
                >
                  Book Space
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
