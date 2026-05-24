export interface SunTimes {
  sunrise: string;            // "HH:MM" local time
  sunset: string;             // "HH:MM" local time
  civilTwilightBegin: string; // civil dawn — sun 6° below horizon
  civilTwilightEnd: string;   // civil dusk — sky fully dark
  solarNoon: string;          // "HH:MM" — highest sun point
  dayLengthMinutes: number;
}

export type MoonPhaseName =
  | 'newMoon'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'fullMoon'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

export interface MoonPhase {
  name: MoonPhaseName;
  illumination: number; // 0–100 %
  emoji: string;
  ageInDays: number;    // 0–29.53
}

export type WeatherConditionKey =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'drizzle'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy';

export interface HistoricalWeather {
  tempMax: number;           // °C
  tempMin: number;           // °C
  precipitationMm: number;   // mm
  condition: WeatherConditionKey;
  conditionEmoji: string;
  wmoCode: number;
  referenceYear: number;
}

export interface WeatherWidgetData {
  sunTimes: SunTimes;
  moonPhase: MoonPhase;
  weather: HistoricalWeather;
  locationName: string;
  weddingDate: string;  // ISO date "YYYY-MM-DD"
  timezone: string;
}
