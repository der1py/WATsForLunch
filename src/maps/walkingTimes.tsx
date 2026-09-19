import * as Location from 'expo-location';
import buildings from './buildings.json';

type LatLng = { latitude: number; longitude: number };
type Place = LatLng & { id: string };
export type WalkResult = { id: string; meters: number; seconds: number };

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;
const MATRIX_URL =
  'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

// Routes API caps a matrix at 625 elements; keep it small and cheap anyway.
const MAX_DESTINATIONS = 25;

const waypoint = (p: LatLng) => ({
  waypoint: { location: { latLng: { latitude: p.latitude, longitude: p.longitude } } },
});

function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function walkingTimes(
  origin: LatLng,
  places: Place[]
): Promise<WalkResult[]> {
  // Prefilter to the closest N so we don't send hundreds of destinations.
  const nearby = places
    .map(p => ({ p, d: haversineMeters(origin, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_DESTINATIONS)
    .map(x => x.p);

  const res = await fetch(MATRIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      // Required: the Routes API returns nothing without a field mask.
      'X-Goog-FieldMask':
        'originIndex,destinationIndex,duration,distanceMeters,condition',
    },
    body: JSON.stringify({
      origins: [waypoint(origin)],
      destinations: nearby.map(waypoint),
      travelMode: 'WALK',
    }),
  });

  const data = await res.json();

  if (!res.ok || !Array.isArray(data)) {
    console.error('Routes API error:', res.status, data);
    return [];
  }

  return data
    .filter((el: any) => el.condition === 'ROUTE_EXISTS')
    .map((el: any) => ({
      id: nearby[el.destinationIndex].id,
      meters: el.distanceMeters as number,
      seconds: parseInt(el.duration, 10), // comes back like "312s"
    }))
    .sort((a, b) => a.seconds - b.seconds);
}

// Quick sanity check that the key + Routes API are set up correctly.
export async function testApiKey() {
  const result = await walkingTimes(
    { latitude: 43.4723, longitude: -80.5449 }, // UW campus
    [{ id: 'test', latitude: 43.4697, longitude: -80.5397 }]
  );
  console.log('Routes API test:', result);
  return result;
}

export async function currentLocationToCaf() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }

  const { coords } = await Location.getCurrentPositionAsync({});
  const origin: LatLng = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  return walkingTimes(origin, buildings as Place[]);
}
