export const weatherToolDefinition = {
  name: 'get_weather_forecast',
  description: 'Gets the current weather and forecast for a specific location to help plan monument visits.',
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

export async function getWeatherForecast({ lat, lng }) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  // If no API key or placeholder is used, return mock data
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    return {
      status: 'success',
      mock: true,
      weather: {
        current: {
          temp: 22,
          conditions: 'Partly Cloudy',
          goodForWalking: true
        },
        forecast: 'No rain expected in the next few hours. Perfect for exploring!'
      }
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }
    const data = await response.json();
    
    const conditions = data.weather[0].main;
    const isRaining = conditions.toLowerCase().includes('rain');
    
    return {
      status: 'success',
      weather: {
        current: {
          temp: data.main.temp,
          conditions: data.weather[0].description,
          goodForWalking: !isRaining && data.main.temp > 5 && data.main.temp < 35
        },
        forecast: isRaining ? 'Rain is expected. Bring an umbrella!' : 'Clear weather for walking.'
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
