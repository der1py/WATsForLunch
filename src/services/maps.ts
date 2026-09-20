const MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ROUTE_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

export type RouteCoordinates = {
  latitude: number;
  longitude: number;
};

export type RouteInfo = {
  duration: string;
  durationSeconds: number;
  distance: string;
};

export type RouteDestination = RouteCoordinates & {
  id: string;
};

export type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
type MatrixRouteElement = {
  condition?: string;
  destinationIndex?: number;
  distanceMeters?: number;
  duration?: string;
};

const routeInfoCache = new Map<string, RouteInfo>();

export async function getWalkingRouteInfos(
  origin: RouteCoordinates,
  destinations: RouteDestination[],
  travelMode: TravelMode = 'WALK'
): Promise<Map<string, RouteInfo>> {
  if (destinations.length === 0) {
    return new Map();
  }

  const response = await fetch(ROUTE_MATRIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': MAPS_API_KEY ?? '',
      'X-Goog-FieldMask':
        'originIndex,destinationIndex,duration,distanceMeters,condition',
    },
    body: JSON.stringify({
      origins: [toMatrixWaypoint(origin)],
      destinations: destinations.map(toMatrixWaypoint),
      travelMode,
    }),
  });

  const data: unknown = await response.json();
  if (!response.ok) {
    throw new Error(getRouteErrorMessage(data, 'Route matrix request failed'));
  }

  if (!Array.isArray(data)) {
    throw new Error('Route matrix response was invalid');
  }

  const routeInfos = new Map<string, RouteInfo>();
  for (const element of data as MatrixRouteElement[]) {
    const destination =
      typeof element.destinationIndex === 'number'
        ? destinations[element.destinationIndex]
        : undefined;

    if (
      element.condition !== 'ROUTE_EXISTS' ||
      !destination ||
      typeof element.duration !== 'string'
    ) {
      continue;
    }

    const durationSeconds = parseDurationSeconds(element.duration);
    if (durationSeconds === undefined) {
      continue;
    }

    routeInfos.set(destination.id, {
      duration: formatDuration(durationSeconds),
      durationSeconds,
      distance: formatDistance(element.distanceMeters ?? 0),
    });
  }

  return routeInfos;
}

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
    throw new Error(getRouteErrorMessage(data, 'Route request failed'));
  }

  const route = data.routes?.[0];
  if (!route) throw new Error('No route found');

  const durationSeconds = parseDurationSeconds(route.duration);
  if (durationSeconds === undefined) throw new Error('Route duration was invalid');

  const routeInfo = {
    duration: formatDuration(durationSeconds),
    durationSeconds,
    distance: formatDistance(route.distanceMeters ?? 0),
  };

  routeInfoCache.set(cacheKey, routeInfo);
  return routeInfo;
}

function toMatrixWaypoint(coordinates: RouteCoordinates) {
  return {
    waypoint: {
      location: {
        latLng: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      },
    },
  };
}

function getRouteErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof data.error === 'object' &&
    data.error !== null &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    return data.error.message;
  }

  return fallback;
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

function parseDurationSeconds(value: string): number | undefined {
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
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
