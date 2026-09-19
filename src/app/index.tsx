import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { createElement, useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Put your key in .env as EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DESTINATION = 'Shawarma Hub, Waterloo, ON';

// Embed API mode -> Routes API mode
const API_MODES = {
  driving: 'DRIVE',
  walking: 'WALK',
  bicycling: 'BICYCLE',
  transit: 'TRANSIT',
} as const;
const TRAVEL_MODE: keyof typeof API_MODES = 'walking';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const HORIZONTAL_PADDING = Spacing.four;
const MAP_ASPECT_RATIO = 4 / 3;

type Coords = { latitude: number; longitude: number };
type RouteInfo = { duration: string; distance: string };

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

function useRouteInfo(origin: Coords | null) {
  const [info, setInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(ROUTES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': MAPS_API_KEY ?? '',
            // Only request the fields we need (keeps the request cheaper)
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                },
              },
            },
            destination: { address: DESTINATION },
            travelMode: API_MODES[TRAVEL_MODE],
            // Live traffic only applies to driving
            ...(TRAVEL_MODE === 'driving' && {
              routingPreference: 'TRAFFIC_AWARE',
            }),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? 'Route request failed');
        }

        const route = data.routes?.[0];
        if (!route) throw new Error('No route found');

        // duration comes back as a string like "1234s"
        const seconds = parseInt(route.duration, 10);
        if (!cancelled) {
          setInfo({
            duration: formatDuration(seconds),
            distance: formatDistance(route.distanceMeters ?? 0),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not get route info');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Depend on primitives so the effect doesn't re-run on every render
  }, [origin?.latitude, origin?.longitude]);

  return { info, error };
}

function buildMapUrl(origin: Coords | null) {
  const destination = encodeURIComponent(DESTINATION);

  // No location yet (or denied): just show the destination
  if (!origin) {
    return `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=${destination}`;
  }

  return (
    `https://www.google.com/maps/embed/v1/directions?key=${MAPS_API_KEY}` +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination}` +
    `&mode=${TRAVEL_MODE}`
  );
}

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

function GoogleMapEmbed() {
  const { width } = useWindowDimensions();
  const { coords, error, loading } = useCurrentLocation();
  const { info, error: routeError } = useRouteInfo(coords);
  const mapUrl = buildMapUrl(coords);

  return (
    <View
      style={[
        styles.mapWrapper,
        { maxWidth: Math.min(MaxContentWidth, width - HORIZONTAL_PADDING * 2) },
      ]}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          // createElement avoids TypeScript complaining about <iframe> in React Native
          createElement('iframe', {
            title: 'Google Map',
            width: '100%',
            height: '100%',
            frameBorder: 0,
            style: { border: 0 },
            referrerPolicy: 'strict-origin-when-cross-origin',
            allowFullScreen: true,
            src: mapUrl,
          })
        ) : (
          // key forces a reload when the URL changes (location arrives)
          <WebView key={mapUrl} source={{ uri: mapUrl }} style={styles.map} />
        )}
      </View>

      {loading && <ThemedText type="small">Getting your location…</ThemedText>}
      {error && (
        <ThemedText type="small">
          {error}. Showing the destination only.
        </ThemedText>
      )}

      {info && (
        <View style={styles.routeInfo}>
          <ThemedText type="subtitle">{info.duration}</ThemedText>
          <ThemedText type="small">
            {info.distance} by {TRAVEL_MODE} to {DESTINATION}
          </ThemedText>
        </View>
      )}
      {routeError && <ThemedText type="small">{routeError}</ThemedText>}
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <GoogleMapEmbed />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  mapWrapper: {
    width: '100%',
    gap: Spacing.three,
  },
  mapContainer: {
    width: '100%',
    aspectRatio: MAP_ASPECT_RATIO,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  routeInfo: {
    gap: Spacing.one,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});