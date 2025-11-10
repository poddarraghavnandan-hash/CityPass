// @ts-expect-error - Missing type definitions for @mapbox/mapbox-sdk
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

let geocodingClient: ReturnType<typeof mbxGeocoding> | null = null;

function getGeocodingClient() {
  if (!geocodingClient && process.env.MAPBOX_API_KEY) {
    geocodingClient = mbxGeocoding({
      accessToken: process.env.MAPBOX_API_KEY,
    });
  }
  return geocodingClient;
}

export async function geocodeAddress(address: string, city: string = 'New York') {
  if (!address || !process.env.MAPBOX_API_KEY) {
    return { lat: undefined, lon: undefined };
  }

  try {
    const client = getGeocodingClient();
    if (!client) {
      return { lat: undefined, lon: undefined };
    }

    const query = `${address}, ${city}`;
    const response = await client
      .forwardGeocode({
        query,
        limit: 1,
      })
      .send();

    if (response.body.features.length > 0) {
      const [lon, lat] = response.body.features[0].center;
      return { lat, lon };
    }

    return { lat: undefined, lon: undefined };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { lat: undefined, lon: undefined };
  }
}
