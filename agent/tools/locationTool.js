export const locationToolDefinition = {
  name: 'determine_city_from_location',
  description: 'Determines which Hungarian city the user is in based on their latitude and longitude coordinates.',
  parameters: {
    type: 'OBJECT',
    properties: {
      lat: {
        type: 'NUMBER',
        description: 'The latitude coordinate.'
      },
      lng: {
        type: 'NUMBER',
        description: 'The longitude coordinate.'
      }
    },
    required: ['lat', 'lng']
  }
};

const cities = [
  {
    name: 'Budapest',
    bbox: {
      minLat: 47.349,
      maxLat: 47.613,
      minLng: 18.925,
      maxLng: 19.338
    }
  },
  {
    name: 'Debrecen',
    bbox: {
      minLat: 47.450,
      maxLat: 47.610,
      minLng: 21.500,
      maxLng: 21.750
    }
  },
  {
    name: 'Szeged',
    bbox: {
      minLat: 46.200,
      maxLat: 46.350,
      minLng: 20.050,
      maxLng: 20.250
    }
  }
];

export async function determineCityFromLocation({ lat, lng }) {
  for (const city of cities) {
    if (
      lat >= city.bbox.minLat &&
      lat <= city.bbox.maxLat &&
      lng >= city.bbox.minLng &&
      lng <= city.bbox.maxLng
    ) {
      return {
        status: 'success',
        city: city.name,
        isSupported: city.name === 'Budapest' // For now, only Budapest monuments are in mockData
      };
    }
  }

  return {
    status: 'success',
    city: 'Unknown or not in a supported city',
    isSupported: false
  };
}
