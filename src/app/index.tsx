import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  eatingPreferenceOptions,
  getDefaultSearchCriteria,
  transportOptions,
  travelTimeOptions,
  type EatingPreference,
  type Transport,
  type TravelTime,
} from '@/services/recommendations';

export default function HomeScreen() {
  const defaults = getDefaultSearchCriteria();
  const theme = useTheme();
  const [location, setLocation] = useState(defaults.location);
  const [transport, setTransport] = useState<Transport>(defaults.transport);
  const [openNow, setOpenNow] = useState(defaults.openNow);
  const [maximumTravelTime, setMaximumTravelTime] = useState<TravelTime>(
    defaults.maximumTravelTime
  );
  const [eatingPreference, setEatingPreference] = useState<EatingPreference>(
    defaults.eatingPreference
  );

  function showRecommendations() {
    router.push({
      pathname: '/results',
      params: {
        location: location.trim() || defaults.location,
        transport,
        openNow: String(openNow),
        maximumTravelTime: String(maximumTravelTime),
        eatingPreference,
      },
    } as never);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.heading}>
              <ThemedText style={styles.eyebrow} themeColor="accent">
                WHAT'S FOR LUNCH
              </ThemedText>
              <ThemedText type="subtitle">Find a lunch that fits your day.</ThemedText>
              <ThemedText style={styles.intro} themeColor="textSecondary">
                Tell us what works, and we’ll narrow down your best nearby options.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <FieldLabel label="Where are you?" />
              <TextInput
                accessibilityLabel="Location"
                autoCapitalize="characters"
                onChangeText={setLocation}
                placeholder="MC, STC, or another building"
                placeholderTextColor={theme.textSecondary}
                selectionColor={theme.accent}
                style={[
                  styles.locationInput,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={location}
              />

              <FieldLabel label="How are you getting there?" />
              <OptionRow>
                {transportOptions.map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    onPress={() => setTransport(option)}
                    selected={transport === option}
                  />
                ))}
              </OptionRow>

              <FieldLabel label="Only show places open now?" />
              <OptionRow>
                <OptionButton label="Yes" onPress={() => setOpenNow(true)} selected={openNow} />
                <OptionButton label="No" onPress={() => setOpenNow(false)} selected={!openNow} />
              </OptionRow>

              <FieldLabel label="Maximum travel time" />
              <OptionRow>
                {travelTimeOptions.map((minutes) => (
                  <OptionButton
                    key={minutes}
                    label={`${minutes} min`}
                    onPress={() => setMaximumTravelTime(minutes)}
                    selected={maximumTravelTime === minutes}
                  />
                ))}
              </OptionRow>

              <FieldLabel label="What are you in the mood for?" />
              <View style={styles.preferenceOptions}>
                {eatingPreferenceOptions.map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    onPress={() => setEatingPreference(option)}
                    selected={eatingPreference === option}
                    wide
                  />
                ))}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={showRecommendations}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.submitLabel, { color: theme.background }]}>
                Show my lunch options
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <ThemedText style={styles.fieldLabel}>{label}</ThemedText>;
}

function OptionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

type OptionButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  wide?: boolean;
};

function OptionButton({ label, onPress, selected, wide = false }: OptionButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        wide && styles.wideOptionButton,
        {
          backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: selected ? theme.accent : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.five,
  },
  heading: {
    gap: Spacing.two,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.2,
  },
  intro: {
    maxWidth: 360,
  },
  form: {
    gap: Spacing.two,
  },
  fieldLabel: {
    marginTop: Spacing.two,
    fontWeight: 700,
  },
  locationInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: 500,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  preferenceOptions: {
    gap: Spacing.two,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wideOptionButton: {
    alignItems: 'center',
    width: '100%',
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  submitLabel: {
    fontWeight: 800,
  },
  pressed: {
    opacity: 0.78,
  },
});
