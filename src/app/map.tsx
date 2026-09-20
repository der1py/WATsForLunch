import { router, useLocalSearchParams } from 'expo-router';
import { createElement } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RouteInfo } from '@/services/maps';

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ASPECT_RATIO = 4 / 3;

const DEFAULT_DESTINATION = {
  name: 'Shawarma Hub',
  address: 'Waterloo, ON',
  latitude: 43.4723,
  longitude: -80.5449,
};

type Coords = { latitude: number; longitude: number };
type MapDestination = Coords & { name: string; address: string };
type MapOrigin = Coords & { name: string };
type Transport = 'Walk' | 'Bike';

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

function getMapOrigin(params: Record<string, string | string[] | undefined>): MapOrigin | null {
  const latitude = Number(getFirstParam(params.originLatitude));
  const longitude = Number(getFirstParam(params.originLongitude));
  const name = getFirstParam(params.originName)?.trim();

  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { name, latitude, longitude };
}

type RouteDisplayInfo = Pick<RouteInfo, 'duration' | 'distance'>;

function getRouteInfoFromParams(
  params: Record<string, string | string[] | undefined>
): RouteDisplayInfo | null {
  const duration = getFirstParam(params.routeDuration)?.trim();
  const distance = getFirstParam(params.routeDistance)?.trim();

  return duration && distance ? { duration, distance } : null;
}

function getMapTravelMode(value: string | undefined) {
  return value === 'Bike' ? 'bicycling' : 'walking';
}

function buildMapUrl(
  origin: MapOrigin | null,
  destination: MapDestination,
  transport: Transport
) {
  const destinationCoordinates = `${destination.latitude},${destination.longitude}`;
  const travelMode = getMapTravelMode(transport);

  if (!origin) {
    return `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=${encodeURIComponent(destinationCoordinates)}`;
  }

  return (
    `https://www.google.com/maps/embed/v1/directions?key=${MAPS_API_KEY}` +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${encodeURIComponent(destinationCoordinates)}` +
    `&mode=${travelMode}`
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
    <iframe title="${escapedTitle}" src="${mapUrl}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </body>
</html>`;
}

function GoogleMapEmbed({
  destination,
  origin,
  routeInfo,
  transport,
}: {
  destination: MapDestination;
  origin: MapOrigin | null;
  routeInfo: RouteDisplayInfo | null;
  transport: Transport;
}) {
  const theme = useTheme();
  const mapUrl = buildMapUrl(origin, destination, transport);

  return (
    <View style={[styles.mapCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
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
          <WebView key={mapUrl} source={{ html: buildMapEmbedHtml(mapUrl, destination.name) }} style={styles.map} />
        )}
      </View>

      {(origin || routeInfo) && (
        <View style={styles.routeDetails}>
          {origin && (
            <ThemedText type="small" themeColor="textSecondary">
              Starting from {origin.name}
            </ThemedText>
          )}
          {routeInfo && (
            <View style={[styles.routeInfo, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" themeColor="accent">
                {routeInfo.duration}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {routeInfo.distance} {transport.toLowerCase()} to {destination.name}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const destination = getMapDestination(params);
  const origin = getMapOrigin(params);
  const routeInfo = getRouteInfoFromParams(params);
  const transport = getFirstParam(params.transport) === 'Bike' ? 'Bike' : 'Walk';

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

          <GoogleMapEmbed
            destination={destination}
            origin={origin}
            routeInfo={routeInfo}
            transport={transport}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, width: '100%' },
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
  backArrow: { fontSize: 30, lineHeight: 26 },
  mapCard: { borderRadius: Spacing.four, borderWidth: 1, overflow: 'hidden' },
  destinationDetails: { gap: Spacing.half, padding: Spacing.three },
  mapContainer: { aspectRatio: MAP_ASPECT_RATIO, width: '100%' },
  map: { flex: 1 },
  routeDetails: { gap: Spacing.two, padding: Spacing.three },
  routeInfo: { borderRadius: Spacing.two, gap: Spacing.half, padding: Spacing.two },
  pressed: { opacity: 0.72 },
});
