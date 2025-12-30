import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';

interface DeliveryMapProps {
  vendorLocation: { lat: number; lng: number } | null;
  customerLocation: { lat: number; lng: number } | null;
  currentLocation?: { lat: number; lng: number } | null;
}

function FitBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  if (!points || points.length === 0) return null;
  const bounds = points as LatLngBoundsExpression;
  try {
    map.fitBounds(bounds, { padding: [50, 50] });
  } catch (e) {
    // ignore
  }
  return null;
}

const DeliveryMap = ({ vendorLocation, customerLocation, currentLocation }: DeliveryMapProps) => {
  const points: LatLngExpression[] = [];
  if (vendorLocation) points.push([vendorLocation.lat, vendorLocation.lng]);
  if (customerLocation) points.push([customerLocation.lat, customerLocation.lng]);
  if (currentLocation) points.push([currentLocation.lat, currentLocation.lng]);

  // Fallback center if no points
  const center: LatLngExpression = points.length > 0 ? points[0] : [5.3416, 100.3015];

  return (
    <div className="w-full h-[360px] rounded-lg overflow-hidden border-2 border-gray-200">
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vendorLocation && (
          <CircleMarker center={[vendorLocation.lat, vendorLocation.lng]} pathOptions={{ color: 'red' }} radius={8}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              Vendor
            </Tooltip>
          </CircleMarker>
        )}

        {customerLocation && (
          <CircleMarker center={[customerLocation.lat, customerLocation.lng]} pathOptions={{ color: 'blue' }} radius={8}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              Customer
            </Tooltip>
          </CircleMarker>
        )}

        {currentLocation && (
          <CircleMarker center={[currentLocation.lat, currentLocation.lng]} pathOptions={{ color: 'orange' }} radius={6}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              Current
            </Tooltip>
          </CircleMarker>
        )}

        {vendorLocation && customerLocation && (
          <Polyline positions={[[vendorLocation.lat, vendorLocation.lng], [customerLocation.lat, customerLocation.lng]]} pathOptions={{ color: 'green', weight: 3, dashArray: '5,8' }} />
        )}

        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;