import type { WeatherWidgetData } from '@/types/astro-weather';
import { geocodeLocation } from './geocoding';
import { getSunTimes } from './astronomy';
import { getMoonPhase } from './moon';
import { getHistoricalWeather } from './climate';

export interface LocationInfo {
  name: string;
  googleMapsUrl?: string | null;
  address?: string | null;
}

export async function getWeatherWidgetData(
  location: LocationInfo,
  weddingDate: Date,
): Promise<WeatherWidgetData | null> {
  const coords = await geocodeLocation(location.name, location.googleMapsUrl, location.address);
  if (!coords) return null;

  // Weather API also gives us the local timezone, which we need to localise sun times
  const weatherResult = await getHistoricalWeather(coords.lat, coords.lon, weddingDate);
  const timezone = weatherResult?.timezone ?? 'UTC';

  const sunTimes = await getSunTimes(coords.lat, coords.lon, weddingDate, timezone);
  if (!sunTimes || !weatherResult) return null;

  return {
    sunTimes,
    moonPhase: getMoonPhase(weddingDate),
    weather: weatherResult.weather,
    locationName: location.name,
    weddingDate: weddingDate.toISOString().split('T')[0],
    timezone,
  };
}
