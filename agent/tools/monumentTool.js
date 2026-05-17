import { monuments } from '../mockData.js';

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export const monumentToolDefinition = {
  name: 'find_nearby_monuments',
  description: 'Finds historical monuments near the user based on latitude and longitude coordinates.',
  parameters: {
    type: 'OBJECT',
    properties: {
      lat: {
        type: 'NUMBER',
        description: 'The latitude coordinate of the user.'
      },
      lng: {
        type: 'NUMBER',
        description: 'The longitude coordinate of the user.'
      },
      radius_km: {
        type: 'NUMBER',
        description: 'The search radius in kilometers. Defaults to 2km if not specified.'
      }
    },
    required: ['lat', 'lng']
  }
};

export async function findNearbyMonuments({ lat, lng, radius_km = 2 }) {
  try {
    const nearby = monuments.map(monument => {
      const distance = calculateDistance(lat, lng, monument.location.lat, monument.location.lng);
      return { ...monument, distance };
    }).filter(m => m.distance <= radius_km)
      .sort((a, b) => a.distance - b.distance);
    
    return {
      status: 'success',
      monuments: nearby,
      count: nearby.length
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
