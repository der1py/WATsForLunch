import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const HORIZONTAL_PADDING = Spacing.four;
const MAP_ASPECT_RATIO = 4 / 3;

const API_MODES = {
  driving: 'DRIVE',
  walking: 'WALK',
  bicycling: 'BICYCLE',
  transit: 'TRANSIT',
} as const;
const TRAVEL_MODE: keyof typeof API_MODES = 'walking';

const DEFAULT_DESTINATION = {
  name: 'Shawarma Hub',
  address: 'Waterloo, ON',
  latitude: 43.4723,
  longitude: -80.5449,
};

type Coords = { latitude: number; longitude: number };
type RouteInfo = { duration: string; distance: string };
type MapDestination = Coords & { name: string; address: string };

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCoordinate(value: string | undefined, fallback: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : fallback;
}

function getMapDestination(
  params: Record<string, string | string[] | undefined>
): MapDestination {
  return {
    name: getFirstParam(params.name)?.trim() || DEFAULT_DESTINATION.name,
    address: getFirstParam(params.address)?.trim() || DEFAULT_DESTINATION.address,
    latitude: getCoordinate(getFirstParam(params.latitude), DEFAULT_DESTINATION.latitude),
    longitude: getCoordinate(getFirstParam(params.longitude), DEFAULT_DESTINATION.longitude),
  };
}

function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setError('Location permission denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) setCoords(position.coords);
      } catch {
        if (!cancelled) setError('Could not get your location');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, error, loading };
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

function formatDistance(meters: number) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function useRouteInfo(origin: Coords | null, destination: MapDestination) {
  const [info, setInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const originLatitude = origin?.latitude;
  const originLongitude = origin?.longitude;

  useEffect(() => {
    if (originLatitude === undefined || originLongitude === undefined) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(ROUTES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': MAPS_API_KEY ?? '',
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: originLatitude,
                  longitude: originLongitude,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                },
              },
            },
            travelMode: API_MODES[TRAVEL_MODE],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? 'Route request failed');
        }

        const route = data.routes?.[0];
        if (!route) throw new Error('No route found');

        if (!cancelled) {
          setInfo({
            duration: formatDuration(parseInt(route.duration, 10)),
            distance: formatDistance(route.distanceMeters ?? 0),
          });
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not get route info');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination.latitude, destination.longitude, originLatitude, originLongitude]);

  return { info, error };
}

function buildMapUrl(origin: Coords | null, destination: MapDestination) {
  const destinationCoordinates = `${destination.latitude},${destination.longitude}`;

  if (!origin) {
    return `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=${encodeURIComponent(destinationCoordinates)}`;
  }

  return (
    `https://www.google.com/maps/embed/v1/directions?key=${MAPS_API_KEY}` +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${encodeURIComponent(destinationCoordinates)}` +
    `&mode=${TRAVEL_MODE}`
  );
}

function GoogleMapEmbed({ destination }: { destination: MapDestination }) {
  const { width } = useWindowDimensions();
  const { coords, error, loading } = useCurrentLocation();
  const { info, error: routeError } = useRouteInfo(coords, destination);
  const mapUrl = buildMapUrl(coords, destination);

  return (
    <View
      style={[
        styles.mapWrapper,
        { maxWidth: Math.min(MaxContentWidth, width - HORIZONTAL_PADDING * 2) },
      ]}>
      <View>
        <ThemedText type="subtitle">{destination.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {destination.address}
        </ThemedText>
      </View>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          createElement('iframe', {
            title: destination.name,
            width: '100%',
            height: '100%',
            frameBorder: 0,
            style: { border: 0 },
            referrerPolicy: 'strict-origin-when-cross-origin',
            allowFullScreen: true,
            src: mapUrl,
          })
        ) : (
          <WebView key={mapUrl} source={{ uri: mapUrl }} style={styles.map} />
        )}
      </View>

      {loading && <ThemedText type="small">Getting your location…</ThemedText>}
      {error && (
        <ThemedText type="small">{error}. Showing the destination only.</ThemedText>
      )}
      {info && (
        <View style={styles.routeInfo}>
          <ThemedText type="subtitle">{info.duration}</ThemedText>
          <ThemedText type="small">
            {info.distance} by {TRAVEL_MODE} to {destination.name}
          </ThemedText>
        </View>
      )}
      {routeError && <ThemedText type="small">{routeError}</ThemedText>}
    </View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const destination = getMapDestination(params);

  return (
    <ThemedView style={styles.container}>
      <GoogleMapEmbed destination={destination} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  mapWrapper: {
    gap: Spacing.three,
    width: '100%',
  },
  mapContainer: {
    aspectRatio: MAP_ASPECT_RATIO,
    overflow: 'hidden',
    width: '100%',
  },
  map: {
    flex: 1,
  },
  routeInfo: {
    gap: Spacing.one,
  },
});
