import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
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

function buildMapEmbedHtml(mapUrl: string, title: string) {
  const escapedTitle = title.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>html, body, iframe { border: 0; height: 100%; margin: 0; padding: 0; width: 100%; }</style>
  </head>
  <body>
    <iframe
      title="${escapedTitle}"
      src="${mapUrl}"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </body>
</html>`;
}

function GoogleMapEmbed({ destination }: { destination: MapDestination }) {
  const theme = useTheme();
  const { coords, error, loading } = useCurrentLocation();
  const { info, error: routeError } = useRouteInfo(coords, destination);
  const mapUrl = buildMapUrl(coords, destination);

  return (
    <View
      style={[
        styles.mapCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.destinationDetails}>
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
          <WebView
            key={mapUrl}
            source={{ html: buildMapEmbedHtml(mapUrl, destination.name) }}
            style={styles.map}
          />
        )}
      </View>

      {(loading || error || info || routeError) && (
        <View style={styles.routeDetails}>
          {loading && (
            <ThemedText type="small" themeColor="textSecondary">
              Getting your location…
            </ThemedText>
          )}
          {error && (
            <ThemedText type="small" themeColor="textSecondary">
              {error}. Showing the destination only.
            </ThemedText>
          )}
          {info && (
            <View style={[styles.routeInfo, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" themeColor="accent">
                {info.duration}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {info.distance} walk to {destination.name}
              </ThemedText>
            </View>
          )}
          {routeError && (
            <ThemedText type="small" themeColor="textSecondary">
              {routeError}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const destination = getMapDestination(params);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityLabel="Back to results"
            accessibilityRole="button"
            hitSlop={Spacing.two}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ThemedText style={styles.backArrow}>‹</ThemedText>
            <ThemedText type="smallBold">Results</ThemedText>
          </Pressable>

          <GoogleMapEmbed destination={destination} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.five,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.one,
    marginLeft: -Spacing.one,
  },
  backArrow: {
    fontSize: 30,
    lineHeight: 26,
  },
  mapCard: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    overflow: 'hidden',
  },
  destinationDetails: {
    gap: Spacing.half,
    padding: Spacing.three,
  },
  mapContainer: {
    aspectRatio: MAP_ASPECT_RATIO,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  routeDetails: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  routeInfo: {
    borderRadius: Spacing.two,
    gap: Spacing.half,
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
