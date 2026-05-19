export const routeToolDefinition = {
  name: 'optimize_tour_route',
  description: 'Optimizes a tour route for a given list of monuments using a nearest-neighbor approach.',
  parameters: {
    type: 'OBJECT',
    properties: {
      monument_ids: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'An array of monument IDs to include in the tour.',
      },
      start_lat: {
        type: 'NUMBER',
        description: 'The starting latitude.',
      },
      start_lng: {
        type: 'NUMBER',
        description: 'The starting longitude.',
      },
    },
    required: ['monument_ids', 'start_lat', 'start_lng'],
  },
};

/**
 * Haversine distance — returns METRES.
 * Inputs must be valid finite numbers (pre-validated by caller).
 */
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Safely extract numeric lat/lon from a monument object.
 * Supports both { location: { lat, lng } } and flat { latitude, longitude } shapes.
 * Returns null if values are missing or non-finite.
 */
function getMonumentCoords(monument) {
  const rawLat = monument.location?.lat ?? monument.latitude;
  const rawLon = monument.location?.lng ?? monument.longitude;
  const lat = parseFloat(rawLat);
  const lon = parseFloat(rawLon);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return { lat, lon };
}

export async function optimizeTourRoute({ monument_ids, start_lat, start_lng }) {
  try {
    const startLat = parseFloat(start_lat);
    const startLng = parseFloat(start_lng);
    if (!isFinite(startLat) || !isFinite(startLng)) {
      return { status: 'error', message: 'Invalid start coordinates.' };
    }

    // Dynamic import to avoid circular dependency
    const { monuments } = await import('../mockData.js');

    // Filter by requested IDs, skip monuments with bad coordinates
    const selectedMonuments = monuments
      .filter((m) => monument_ids.includes(m.id))
      .filter((m) => getMonumentCoords(m) !== null);

    if (selectedMonuments.length === 0) {
      return {
        status: 'error',
        message: 'No valid monuments found for the provided IDs.',
      };
    }

    const route = [];
    let currentLat = startLat;
    let currentLon = startLng;
    let unvisited = [...selectedMonuments];
    let totalDistanceMetres = 0;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistMetres = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const coords = getMonumentCoords(unvisited[i]);
        const dist = haversineMetres(currentLat, currentLon, coords.lat, coords.lon);
        if (dist < minDistMetres) {
          minDistMetres = dist;
          nearestIdx = i;
        }
      }

      const nextMonument = unvisited[nearestIdx];
      const coords = getMonumentCoords(nextMonument);

      route.push({
        ...nextMonument,
        distanceFromPreviousKm: (minDistMetres / 1000).toFixed(3),
      });

      totalDistanceMetres += minDistMetres;
      currentLat = coords.lat;
      currentLon = coords.lon;
      unvisited.splice(nearestIdx, 1);
    }

    const totalDistanceKm = totalDistanceMetres / 1000;
    // Walking speed ~5 km/h
    const estimatedWalkingMinutes = Math.round((totalDistanceKm / 5) * 60);

    return {
      status: 'success',
      route,
      summary: {
        totalDistanceKm: totalDistanceKm.toFixed(2),
        estimatedWalkingMinutes,
        stopCount: route.length,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
}
