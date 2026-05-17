export const routeToolDefinition = {
  name: 'optimize_tour_route',
  description: 'Optimizes a tour route for a given list of monuments using a nearest-neighbor approach.',
  parameters: {
    type: 'OBJECT',
    properties: {
      monument_ids: {
        type: 'ARRAY',
        items: {
          type: 'STRING'
        },
        description: 'An array of monument IDs to include in the tour.'
      },
      start_lat: {
        type: 'NUMBER',
        description: 'The starting latitude.'
      },
      start_lng: {
        type: 'NUMBER',
        description: 'The starting longitude.'
      }
    },
    required: ['monument_ids', 'start_lat', 'start_lng']
  }
};

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function optimizeTourRoute({ monument_ids, start_lat, start_lng }) {
  try {
    // Dynamic import to avoid circular dependency if mockData imported elsewhere
    const { monuments } = await import('../mockData.js');
    
    // Filter monuments by provided IDs
    const selectedMonuments = monuments.filter(m => monument_ids.includes(m.id));
    if (selectedMonuments.length === 0) {
      return { status: 'error', message: 'No valid monuments found for the provided IDs.' };
    }

    const route = [];
    let currentLat = start_lat;
    let currentLng = start_lng;
    let unvisited = [...selectedMonuments];
    let totalDistanceKm = 0;

    while (unvisited.length > 0) {
      // Find nearest neighbor
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = calculateDistance(
          currentLat, currentLng,
          unvisited[i].location.lat, unvisited[i].location.lng
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextMonument = unvisited[nearestIdx];
      route.push({
        ...nextMonument,
        distanceFromPrevious: minDistance
      });
      totalDistanceKm += minDistance;
      
      currentLat = nextMonument.location.lat;
      currentLng = nextMonument.location.lng;
      
      unvisited.splice(nearestIdx, 1);
    }

    // Estimate walking time (approx 5 km/h)
    const estimatedWalkingMinutes = Math.round((totalDistanceKm / 5) * 60);

    return {
      status: 'success',
      route,
      summary: {
        totalDistanceKm: totalDistanceKm.toFixed(2),
        estimatedWalkingMinutes,
        stopCount: route.length
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
