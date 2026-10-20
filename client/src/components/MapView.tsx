import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ParkingSpace } from './ListingCard';
import { Zap, Navigation, Star } from 'lucide-react';

interface MapViewProps {
  spaces: ParkingSpace[];
  selectedSpace: ParkingSpace | null;
  onSelectSpace: (space: ParkingSpace) => void;
  routePreviewCoords?: [number, number] | null;
  driverLocation?: [number, number] | null;
  center?: [number, number];
}

// Controller to smoothly pan map when selected space changes
const MapRecenter: React.FC<{ coords: [number, number] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 14, { duration: 1.2 });
  }, [coords, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ driverLocation,
  spaces,
  selectedSpace,
  onSelectSpace,
  routePreviewCoords,
  center = [12.935, 79.145] // Center of Vellore demo listings
}) => {
  // Create Custom HTML Marker Icon
  const createCustomIcon = (space: ParkingSpace, isSelected: boolean) => {
    let statusClass = 'available-now-marker';
    if (space.availability_state === 'pending_hold') {
      statusClass = 'pending-hold-marker';
    } else if (space.availability_state === 'available_soon') {
      statusClass = 'available-soon-marker';
    } else if (space.availability_state === 'unavailable') {
      statusClass = 'unavailable-marker';
    }

    const classes = `custom-price-marker ${isSelected ? 'active' : ''} ${statusClass}`;
    const priceText = `₹${parseFloat(String(space.hourly_rate)).toFixed(0)}`;

    return L.divIcon({
      className: 'custom-leaflet-icon-wrapper',
      html: `<div class="${classes}">${priceText}</div>`,
      iconSize: [48, 28],
      iconAnchor: [24, 14],
    });
  };

  // Driver location marker (distinct blue dot)
  const driverIcon = L.divIcon({
    className: 'driver-location-marker',
    html: `<div style="width:16px;height:16px;background:#1e90ff;border-radius:50%;border:2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedSpace && (
          <MapRecenter
            coords={[
              Number(selectedSpace.approximate_latitude),
              Number(selectedSpace.approximate_longitude),
            ]}
          />
        )}

        {driverLocation && (
          <Marker position={driverLocation} icon={driverIcon} />
        )}

{/* Route Preview Polyline (from user / center to selected destination) */}
        {routePreviewCoords && selectedSpace && (
          <Polyline
            positions={[
              center,
              [
                (center[0] + routePreviewCoords[0]) / 2 + 0.003,
                (center[1] + routePreviewCoords[1]) / 2 - 0.002
              ],
              routePreviewCoords
            ]}
            pathOptions={{ color: '#F45B68', weight: 4, dashArray: '8, 8', opacity: 0.85 }}
          />
        )}

        {spaces.map((space) => {
          const isSelected = selectedSpace?.space_id === space.space_id;
          const lat = Number(space.approximate_latitude);
          const lng = Number(space.approximate_longitude);

          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={space.space_id}
              position={[lat, lng]}
              icon={createCustomIcon(space, isSelected)}
              eventHandlers={{
                click: () => onSelectSpace(space),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <div className="text-xs font-bold text-parko-charcoal mb-1">{space.title}</div>
                  <div className="text-[11px] text-parko-muted mb-2 line-clamp-1">{space.description}</div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-parko-coral font-bold">₹{space.hourly_rate}/hr</span>
                    <button
                      onClick={() => onSelectSpace(space)}
                      className="text-[11px] font-bold text-parko-charcoal underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend (Prompt requirement: Available now, soon, pending hold, unavailable, selected) */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-parko-border shadow-soft text-[11px] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-parko-charcoal" />
          <span className="font-semibold text-parko-charcoal">Available Now</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
          <span className="font-semibold text-sky-800">Soon (&le;15m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="font-semibold text-amber-900">Pending Hold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          <span className="font-semibold text-stone-500">Unavailable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-parko-coral" />
          <span className="font-bold text-parko-coral">Selected</span>
        </div>
      </div>
    </div>
  );
};
