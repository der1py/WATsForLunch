const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export type RouteCoordinates = {
  latitude: number;
  longitude: number;
};

export type RouteInfo = {
  duration: string;
  distance: string;
};

type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';

const routeInfoCache = new Map<string, RouteInfo>();

export async function getWalkingRouteInfo(
  origin: RouteCoordinates,
  destination: RouteCoordinates
): Promise<RouteInfo> {
  return getRouteInfo(origin, destination, 'WALK');
}

export async function getRouteInfo(
  origin: RouteCoordinates,
  destination: RouteCoordinates,
  travelMode: TravelMode
): Promise<RouteInfo> {
  const cacheKey = getCacheKey(origin, destination, travelMode);
  const cachedRoute = routeInfoCache.get(cacheKey);

  if (cachedRoute) {
    return cachedRoute;
  }

  const response = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': MAPS_API_KEY ?? '',
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Route request failed');
  }

  const route = data.routes?.[0];
  if (!route) throw new Error('No route found');

  const routeInfo = {
    duration: formatDuration(parseInt(route.duration, 10)),
    distance: formatDistance(route.distanceMeters ?? 0),
  };

  routeInfoCache.set(cacheKey, routeInfo);
  return routeInfo;
}

function getCacheKey(origin: RouteCoordinates, destination: RouteCoordinates, travelMode: TravelMode) {
  return [
    travelMode,
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  ].join(':');
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}
