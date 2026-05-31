export interface Coordinates {
  lat: number;
  lon: number;
}

// Handles the most common Google Maps URL patterns:
//   https://www.google.com/maps/place/.../@lat,lon,zoom
//   https://maps.google.com/?q=lat,lon
//   https://maps.google.com/?ll=lat,lon
export function extractCoordsFromGoogleMapsUrl(url: string): Coordinates | null {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
  }
  const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]) };
  }
  return null;
}

export async function geocodeLocation(
  locationName: string,
  googleMapsUrl?: string | null,
  address?: string | null,
): Promise<Coordinates | null> {
  if (googleMapsUrl) {
    const coords = extractCoordsFromGoogleMapsUrl(googleMapsUrl);
    if (coords) return coords;
  }

  const query = address ?? locationName;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'NupciWeddingApp/1.0 (contact@nupci.com)' },
    next: { revalidate: 86_400 },
  } as RequestInit);
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}
