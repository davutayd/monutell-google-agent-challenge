import { useState, useEffect, useRef } from 'react';

const COOLDOWN_MS = 10 * 60 * 1000;
const POLL_MS = import.meta.env.DEV ? 10_000 : 30_000;

export default function useAmbientAgent(location) {
  const [ambientMonuments, setAmbientMonuments] = useState([]);
  const cooldownRef = useRef({});
  const [seenIds, setSeenIds] = useState([]);

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) return;

    const checkAmbient = async () => {
      try {
        const queryParams = new URLSearchParams({
          lat,
          lng,
          radius_km: 0.5,
          seen_ids: seenIds.join(','),
        });

        const res = await fetch(`/api/ambient?${queryParams}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'success' && data.ambient_monuments?.length > 0) {
          const now = Date.now();

          const available = data.ambient_monuments.filter((m) => {
            const lastShown = cooldownRef.current[m.id];
            return !lastShown || now - lastShown > COOLDOWN_MS;
          });

          if (available.length === 0) return;

          const nearest = available.reduce((a, b) =>
            (a.distance ?? Infinity) <= (b.distance ?? Infinity) ? a : b
          );

          cooldownRef.current[nearest.id] = now;
          setAmbientMonuments([nearest]);
        }
      } catch (error) {
        console.error('Ambient check error:', error);
      }
    };

    checkAmbient();
    const interval = setInterval(checkAmbient, POLL_MS);
    return () => clearInterval(interval);
  }, [lat, lng, seenIds]);

  const dismissNotification = (id) => {
    setAmbientMonuments((prev) => prev.filter((m) => m.id !== id));
    setSeenIds((prev) => [...prev, id]);
    cooldownRef.current[id] = Date.now();
  };

  return { ambientMonuments, dismissNotification };
}
