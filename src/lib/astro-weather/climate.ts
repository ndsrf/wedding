import type { HistoricalWeather, WeatherConditionKey } from '@/types/astro-weather';

interface OpenMeteoArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    weather_code: (number | null)[];
  };
  timezone: string;
}

export function wmoToCondition(code: number): { condition: WeatherConditionKey; emoji: string } {
  if (code === 0) return { condition: 'sunny', emoji: '☀️' };
  if (code <= 3) return { condition: 'partlyCloudy', emoji: '⛅' };
  if (code <= 49) return { condition: 'foggy', emoji: '🌫️' };
  if (code <= 59) return { condition: 'drizzle', emoji: '🌦️' };
  if (code <= 69) return { condition: 'rainy', emoji: '🌧️' };
  if (code <= 79) return { condition: 'snowy', emoji: '❄️' };
  if (code <= 82) return { condition: 'rainy', emoji: '🌧️' };
  if (code <= 99) return { condition: 'stormy', emoji: '⛈️' };
  return { condition: 'cloudy', emoji: '☁️' };
}

export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: Date,
): Promise<{ weather: HistoricalWeather; timezone: string } | null> {
  // Use the same calendar date from the previous year for historical comparison
  const referenceYear = date.getFullYear() - 1;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${referenceYear}-${month}-${day}`;

  const url = [
    'https://archive-api.open-meteo.com/v1/archive',
    `?latitude=${lat}&longitude=${lon}`,
    `&start_date=${dateStr}&end_date=${dateStr}`,
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    '&timezone=auto',
  ].join('');

  const res = await fetch(url, { next: { revalidate: 86_400 } } as RequestInit);
  if (!res.ok) return null;

  const data: OpenMeteoArchiveResponse = await res.json();
  if (!data.daily?.time?.length) return null;

  const wmoCode = data.daily.weather_code[0] ?? 0;
  const { condition, emoji } = wmoToCondition(wmoCode);

  return {
    weather: {
      tempMax: Math.round(data.daily.temperature_2m_max[0] ?? 0),
      tempMin: Math.round(data.daily.temperature_2m_min[0] ?? 0),
      precipitationMm: Math.round((data.daily.precipitation_sum[0] ?? 0) * 10) / 10,
      condition,
      conditionEmoji: emoji,
      wmoCode,
      referenceYear,
    },
    timezone: data.timezone,
  };
}
