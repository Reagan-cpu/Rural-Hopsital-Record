import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Fix default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function HouseholdMapView({ households }) {
  const navigate = useNavigate();

  const center = households.length > 0
    ? [households[0].latitude, households[0].longitude]
    : [20.5937, 78.9629]; // India center

  return (
    <MapContainer
      center={center}
      zoom={households.length > 0 ? 10 : 5}
      style={{ height: 'calc(100vh - 160px)', width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {/* <MarkerClusterGroup> */}
        {households.map((hh) => (
          <Marker
            key={hh.id}
            position={[hh.latitude, hh.longitude]}
          >
            <Popup>
              <strong>{hh.malaria_number}</strong><br />
              {hh.village && <span>{hh.village}</span>}
              <br />
              <button
                style={{ marginTop: 6, cursor: 'pointer', color: '#2563eb', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
                onClick={() => navigate(`/households/${hh.id}`)}
              >
                View household
              </button>
            </Popup>
          </Marker>
        ))}
      {/* </MarkerClusterGroup> */}
    </MapContainer>
  );
}

HouseholdMapView.propTypes = {
  households: PropTypes.arrayOf(PropTypes.shape({
    id:            PropTypes.string.isRequired,
    malaria_number: PropTypes.string.isRequired,
    latitude:      PropTypes.number.isRequired,
    longitude:     PropTypes.number.isRequired,
    village:       PropTypes.string,
  })).isRequired,
};
