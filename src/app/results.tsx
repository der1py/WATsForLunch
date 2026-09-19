import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getSearchCriteriaFromParams,
  getTopRecommendations,
  type HealthTag,
  type MealRecommendation,
  type PlaceRecommendation,
} from '@/services/recommendations';

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const criteria = getSearchCriteriaFromParams(params);
  const recommendations = getTopRecommendations(criteria);
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
              YOUR TOP 3
            </ThemedText>
            <ThemedText type="subtitle">Lunch near {criteria.location}</ThemedText>
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
  recommendation: PlaceRecommendation;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
};

function PlaceCard({ recommendation, rank, expanded, onToggle }: PlaceCardProps) {
  const theme = useTheme();

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
        <View style={styles.placeName}>
          <ThemedText style={styles.placeTitle}>{recommendation.place}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {recommendation.travelTime}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.mealToggle, pressed && styles.pressed]}>
        <ThemedText type="smallBold" themeColor="accent">
          {expanded ? 'Hide meal recommendations' : `See ${recommendation.meals.length} meal recommendations`}
        </ThemedText>
        <ThemedText style={[styles.chevron, { color: theme.accent }]}>{expanded ? '⌃' : '⌄'}</ThemedText>
      </Pressable>

      {expanded ? (
        <View style={[styles.mealList, { borderTopColor: theme.border }]}>
          {recommendation.meals.map((meal) => (
            <MealRow key={meal.name} meal={meal} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MealRow({ meal }: { meal: MealRecommendation }) {
  const theme = useTheme();
  const tagStyle = getTagStyle(meal.healthTag, theme);

  return (
    <View style={styles.mealRow}>
      <View style={styles.mealText}>
        <ThemedText type="smallBold">{meal.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meal.description}
        </ThemedText>
      </View>
      <View style={[styles.tag, tagStyle.container]}>
        <ThemedText style={[styles.tagText, tagStyle.text]}>{meal.healthTag}</ThemedText>
      </View>
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
    alignItems: 'center',
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
  placeName: {
    flex: 1,
    gap: Spacing.half,
  },
  placeTitle: {
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 24,
  },
  mealToggle: {
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
  mealList: {
    borderTopWidth: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  mealRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  mealText: {
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
