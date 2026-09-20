import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getMenuItemRecommendations,
  type HealthTag,
  type MenuRecommendation,
} from '@/services/menu-picker';
import { getSearchCriteriaFromParams } from '@/services/recommendations';

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const paramsKey = JSON.stringify(params);
  const criteria = useMemo(
    () => getSearchCriteriaFromParams(JSON.parse(paramsKey)),
    [paramsKey]
  );
  // Lazy initial state: pick once when this screen opens (i.e. when "Let's eat!" is pressed).
  // Picking during render would reshuffle the meals every time a card is expanded or collapsed.
  const [recommendations] = useState(() => getMenuItemRecommendations(criteria));
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(recommendations[0]?.id ?? null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to search"
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
            <ThemedText type="smallBold">Edit search</ThemedText>
          </Pressable>

          <View style={styles.heading}>
            <ThemedText style={styles.eyebrow} themeColor="accent">
              {recommendations.length > 0 ? `YOUR TOP ${recommendations.length}` : 'NO MATCHES'}
            </ThemedText>
            <ThemedText type="subtitle">Lunch near {criteria.building.name}</ThemedText>
            <ThemedText style={styles.summary} themeColor="textSecondary">
              {criteria.transport} · up to {criteria.maximumTravelTime} min ·{' '}
              {criteria.eatingPreferences.join(' + ')}
            </ThemedText>
            {(criteria.requiredDietary.length > 0 || criteria.preferredDietary.length > 0) && (
              <ThemedText style={styles.summary} themeColor="textSecondary">
                {[
                  ...criteria.requiredDietary.map((restriction) => `${restriction} required`),
                  ...criteria.preferredDietary.map((restriction) => `${restriction} preferred`),
                ].join(' · ')}
              </ThemedText>
            )}
            {criteria.allergies.length > 0 && (
              <ThemedText style={styles.summary} themeColor="textSecondary">
                Avoiding: {criteria.allergies.join(', ')}
              </ThemedText>
            )}
          </View>

          {recommendations.length === 0 && (
            <ThemedText themeColor="textSecondary">
              Nothing on the menu matches those filters right now. Try loosening a dietary
              requirement or allergy, or picking more moods.
            </ThemedText>
          )}

          <View style={styles.recommendations}>
            {recommendations.map((recommendation, index) => (
              <PlaceCard
                expanded={expandedPlaceId === recommendation.id}
                key={recommendation.id}
                onToggle={() =>
                  setExpandedPlaceId((current) =>
                    current === recommendation.id ? null : recommendation.id
                  )
                }
                origin={criteria.building}
                rank={index + 1}
                recommendation={recommendation}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type PlaceCardProps = {
  recommendation: MenuRecommendation;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  origin: { name: string; latitude: number; longitude: number };
};

function PlaceCard({ recommendation, rank, expanded, onToggle, origin }: PlaceCardProps) {
  const theme = useTheme();
  const { location, travelTime } = recommendation;
  const meal = recommendation.meals[0];

  if (!meal) {
    return null;
  }

  const tagStyle = getTagStyle(meal.healthTag, theme);

  return (
    <View
      style={[
        styles.placeCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.placeHeader}>
        <View style={[styles.rank, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" themeColor="accent">
            {rank}
          </ThemedText>
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.itemTitleRow}>
            <ThemedText style={styles.itemTitle}>{meal.name}</ThemedText>
            {travelTime ? (
              <ThemedText style={styles.travelTime} type="smallBold" themeColor="accent">
                {travelTime}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {meal.description}
          </ThemedText>
          <View style={[styles.tag, tagStyle.container]}>
            <ThemedText style={[styles.tagText, tagStyle.text]}>{meal.healthTag}</ThemedText>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.locationToggle, pressed && styles.pressed]}>
        <ThemedText type="smallBold" themeColor="accent">
          {expanded ? 'Hide location' : 'See location'}
        </ThemedText>
        <ThemedText style={[styles.chevron, { color: theme.accent }]}>{expanded ? '⌃' : '⌄'}</ThemedText>
      </Pressable>

      {expanded ? (
        <View style={[styles.locationSection, { borderTopColor: theme.border }]}>
          <View style={styles.locationText}>
            <ThemedText type="smallBold">{recommendation.place}</ThemedText>
            {location ? (
              <ThemedText type="small" themeColor="textSecondary">
                {location.address}
              </ThemedText>
            ) : null}
          </View>
          {location ? (
            <Pressable
              accessibilityLabel={`Navigate to ${recommendation.place}`}
              accessibilityRole="button"
              hitSlop={Spacing.two}
              onPress={() =>
                router.push({
                  pathname: '/map',
                  params: {
                    address: location.address,
                    latitude: String(location.latitude),
                    longitude: String(location.longitude),
                    name: recommendation.place,
                    originLatitude: String(origin.latitude),
                    originLongitude: String(origin.longitude),
                    originName: origin.name,
                    // Menu-item picks don't have precomputed route info; '' matches
                    // what the map screen already receives when routeInfo is missing.
                    routeDistance: '',
                    routeDuration: '',
                  },
                })
              }
              style={({ pressed }) => [
                {
                  backgroundColor: theme.accentSoft,
                  borderRadius: Spacing.two,
                  paddingHorizontal: Spacing.two,
                  paddingVertical: Spacing.half,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="accent">
                Navigate →
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function getTagStyle(healthTag: HealthTag, theme: ReturnType<typeof useTheme>) {
  if (healthTag === 'Kinda Healthy') {
    return {
      container: { backgroundColor: theme.kindaHealthySoft },
      text: { color: theme.kindaHealthy },
    };
  }

  if (healthTag === 'Unhealthy') {
    return {
      container: { backgroundColor: theme.unhealthySoft },
      text: { color: theme.unhealthyText },
    };
  }

  return {
    container: { backgroundColor: theme.accentSoft },
    text: { color: theme.accent },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.five,
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
  heading: {
    gap: Spacing.two,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.2,
  },
  summary: {
    textTransform: 'capitalize',
  },
  recommendations: {
    gap: Spacing.three,
  },
  placeCard: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  placeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  rank: {
    alignItems: 'center',
    borderRadius: Spacing.five,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  itemDetails: {
    flex: 1,
    gap: Spacing.one,
  },
  itemTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 24,
  },
  travelTime: {
    flexShrink: 0,
    lineHeight: 24,
  },
  locationToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  chevron: {
    fontSize: 18,
    fontWeight: 700,
  },
  locationSection: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  locationText: {
    flex: 1,
    gap: Spacing.half,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.72,
  },
});
