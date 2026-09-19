import * as Device from 'expo-device';
import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Put your key in .env as EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
const MAPS_API_KEY = "AIzaSyCaw-3AmYYNY62_tZVajsjQccuFDm_yrMQ";

// MAP_MODE -> place | view | directions | streetview | search
// PARAMETERS -> depends on the mode, e.g. q=... for place/search
const MAP_URL = `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=Space+Needle,Seattle+WA`;

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
  return (
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
          src: MAP_URL,
        })
      ) : (
        <WebView source={{ uri: MAP_URL }} style={styles.map} />
      )}
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
  },
  mapContainer: {
    width: '100%',
    maxWidth: 450,
    height: 250,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
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