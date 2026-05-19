import { useState, useEffect, useCallback } from 'react';

/**
 * Singleton location store — all useLocation() instances share the same GPS position.
 * This ensures GPS simulation in MapPage also moves the Leaflet marker in MapScreen
 * and immediately triggers the ambient proximity hook.
 */
let _position = null;
let _accuracy = null;
let _watchStarted = false;
const _subscribers = new Set();

function _notify() {
  _subscribers.forEach((fn) => fn(_position, _accuracy));
}

function _startGpsWatch() {
  if (_watchStarted) return;
  _watchStarted = true;

  if (!navigator.geolocation) {
    _position = [47.4979, 19.0402];
    _accuracy = 1000;
    _notify();
    return;
  }

  const success = (pos) => {
    _position = [pos.coords.latitude, pos.coords.longitude];
    _accuracy = pos.coords.accuracy;
    _notify();
  };

  const error = () => {
    if (!_position) {
      _position = [47.4979, 19.0402];
      _accuracy = 1000;
      _notify();
    }
  };

  navigator.geolocation.getCurrentPosition(success, error);
  navigator.geolocation.watchPosition(success, error);
}

export function useLocation() {
  const [position, setPosition] = useState(() => _position);
  const [accuracy, setAccuracy] = useState(() => _accuracy);

  useEffect(() => {
    const onUpdate = (pos, acc) => {
      setPosition(pos ? [...pos] : pos);
      setAccuracy(acc);
    };
    _subscribers.add(onUpdate);
    _startGpsWatch();

    if (_position) {
      setPosition([..._position]);
      setAccuracy(_accuracy);
    }

    return () => _subscribers.delete(onUpdate);
  }, []);

  const updateLocation = useCallback((newPosition, newAccuracy) => {
    _position = newPosition ? [...newPosition] : newPosition;
    if (newAccuracy !== undefined) _accuracy = newAccuracy;
    _notify();
  }, []);

  return { position, accuracy, updateLocation };
}

export default function useLocationLatLng() {
  const { position } = useLocation();
  if (!position) return null;
  return { lat: position[0], lng: position[1] };
}
