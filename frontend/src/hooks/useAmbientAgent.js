import { useState, useEffect } from 'react';

export default function useAmbientAgent(location) {
  const [ambientMonuments, setAmbientMonuments] = useState([]);
  const [seenIds, setSeenIds] = useState([]);

  useEffect(() => {
    if (!location) return;

    const checkAmbient = async () => {
      try {
        const queryParams = new URLSearchParams({
          lat: location.lat,
          lng: location.lng,
          radius_km: 0.5,
          seen_ids: seenIds.join(',')
        });
        
        const res = await fetch(`http://localhost:3000/api/ambient?${queryParams}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.ambient_monuments.length > 0) {
          // Add only monuments not already in ambient list
          const newMonuments = data.ambient_monuments.filter(
            m => !ambientMonuments.find(am => am.id === m.id)
          );
          
          if (newMonuments.length > 0) {
            setAmbientMonuments(prev => [...prev, ...newMonuments]);
          }
        }
      } catch (error) {
        console.error('Ambient check error:', error);
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(checkAmbient, 30000);
    // Initial check
    checkAmbient();

    return () => clearInterval(interval);
  }, [location, seenIds]);

  const dismissNotification = (id) => {
    setAmbientMonuments(prev => prev.filter(m => m.id !== id));
    setSeenIds(prev => [...prev, id]);
  };

  return { ambientMonuments, dismissNotification };
}
