import { useState, useEffect, useCallback } from 'react';

/**
 * useLocation hook — returns { position, accuracy, updateLocation }
 * compatible with both MapScreen.jsx and MapPage.jsx (which just uses lat/lng)
 * GPS fallback: Budapest center (47.4979, 19.0402)
 */
export function useLocation() {
  const [position, setPosition] = useState(null); // [lat, lng] array for Leaflet
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition([47.4979, 19.0402]);
      setAccuracy(1000);
      return;
    }

    const success = (pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
      setAccuracy(pos.coords.accuracy);
    };

    const error = () => {
      setPosition([47.4979, 19.0402]);
      setAccuracy(1000);
    };

    navigator.geolocation.getCurrentPosition(success, error);
    const watchId = navigator.geolocation.watchPosition(success, error);
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const updateLocation = useCallback((newPosition, newAccuracy) => {
    setPosition(newPosition);
    if (newAccuracy !== undefined) setAccuracy(newAccuracy);
  }, []);

  return { position, accuracy, updateLocation };
}

/**
 * Default export: returns { lat, lng } object (for MapPage, AgentChat, useAmbientAgent)
 */
export default function useLocationLatLng() {
  const { position } = useLocation();
  if (!position) return null;
  return { lat: position[0], lng: position[1] };
}
