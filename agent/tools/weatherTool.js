export const weatherToolDefinition = {
  name: 'get_weather_forecast',
  description: 'Gets the current weather and short-term forecast for a location to help plan monument visits.',
  parameters: {
    type: 'OBJECT',
    properties: {
      lat: { type: 'NUMBER', description: 'Latitude coordinate.' },
      lng: { type: 'NUMBER', description: 'Longitude coordinate.' },
    },
    required: ['lat', 'lng'],
  },
};

export async function getWeatherForecast({ lat, lng }) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    return {
      status: 'success',
      mock: true,
      current_condition: 'partly cloudy',
      temperature_celsius: 22,
      rain_in_minutes: null,
      advice: 'Good weather for outdoor tour',
    };
  }

  try {
    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lng);
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&cnt=4`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    const current = data.list[0];
    const currentCondition = current.weather[0].description;
    const temperatureCelsius = Math.round(current.main.temp);
    const now = Date.now();

    let rainInMinutes = null;
    for (const item of data.list) {
      const main = item.weather[0].main;
      if (main === 'Rain' || main === 'Drizzle') {
        const slotTime = item.dt * 1000;
        rainInMinutes = Math.round((slotTime - now) / 60_000);
        if (rainInMinutes < 0) rainInMinutes = 0;
        break;
      }
    }

    const advice = rainInMinutes !== null
      ? `Rain expected in ${rainInMinutes} minutes, prioritize covered monuments`
      : 'Good weather for outdoor tour';

    return {
      status: 'success',
      current_condition: currentCondition,
      temperature_celsius: temperatureCelsius,
      rain_in_minutes: rainInMinutes,
      advice,
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
