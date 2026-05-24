import type { SunTimes } from '@/types/astro-weather';

interface SunriseSunsetApiResult {
  sunrise: string;
  sunset: string;
  civil_twilight_begin: string;
  civil_twilight_end: string;
  solar_noon: string;
  day_length: number; // seconds
}

interface SunriseSunsetApiResponse {
  results: SunriseSunsetApiResult;
  status: string;
}

function utcIsoToLocalHHMM(utcIso: string, timezone: string): string {
  return new Date(utcIso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

export async function getSunTimes(
  lat: number,
  lon: number,
  date: Date,
  timezone: string,
): Promise<SunTimes | null> {
  const dateStr = date.toISOString().split('T')[0];
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateStr}&formatted=0`;

  const res = await fetch(url, { next: { revalidate: 86_400 } } as RequestInit);
  if (!res.ok) return null;

  const data: SunriseSunsetApiResponse = await res.json();
  if (data.status !== 'OK') return null;

  const r = data.results;
  return {
    sunrise: utcIsoToLocalHHMM(r.sunrise, timezone),
    sunset: utcIsoToLocalHHMM(r.sunset, timezone),
    civilTwilightBegin: utcIsoToLocalHHMM(r.civil_twilight_begin, timezone),
    civilTwilightEnd: utcIsoToLocalHHMM(r.civil_twilight_end, timezone),
    solarNoon: utcIsoToLocalHHMM(r.solar_noon, timezone),
    dayLengthMinutes: Math.round(r.day_length / 60),
  };
}
