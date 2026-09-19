import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
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

import { DietaryPreferenceList } from '@/components/dietary-preference-list';
import { SelectionChipGroup } from '@/components/selection-chip-group';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExpandableContent } from '@/components/ui/expandable-content';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  allergyOptions,
  dietaryRestrictionOptions,
  eatingPreferenceOptions,
  getDefaultSearchCriteria,
  transportOptions,
  travelTimeOptions,
  type Allergen,
  type DietaryRestriction,
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
  const [eatingPreferences, setEatingPreferences] = useState<EatingPreference[]>(
    defaults.eatingPreferences
  );
  const [requiredDietary, setRequiredDietary] = useState<DietaryRestriction[]>(
    defaults.requiredDietary
  );
  const [preferredDietary, setPreferredDietary] = useState<DietaryRestriction[]>(
    defaults.preferredDietary
  );
  const [allergies, setAllergies] = useState<Allergen[]>(defaults.allergies);
  const [isDietaryExpanded, setIsDietaryExpanded] = useState(false);
  const [isAllergyExpanded, setIsAllergyExpanded] = useState(false);

  function toggleEatingPreference(preference: EatingPreference) {
    setEatingPreferences((current) => {
      if (current.includes(preference)) {
        return current.length === 1 ? current : current.filter((item) => item !== preference);
      }

      return [...current, preference];
    });
  }

  function getDietarySelection(restriction: DietaryRestriction) {
    if (requiredDietary.includes(restriction)) {
      return 'Required';
    }

    if (preferredDietary.includes(restriction)) {
      return 'Preferred';
    }

    return undefined;
  }

  function setDietarySelection(
    restriction: DietaryRestriction,
    selection: 'Required' | 'Preferred' | undefined
  ) {
    setRequiredDietary((current) =>
      selection === 'Required'
        ? [...new Set([...current, restriction])]
        : current.filter((item) => item !== restriction)
    );
    setPreferredDietary((current) =>
      selection === 'Preferred'
        ? [...new Set([...current, restriction])]
        : current.filter((item) => item !== restriction)
    );
  }

  function toggleAllergy(allergen: Allergen) {
    setAllergies((current) =>
      current.includes(allergen)
        ? current.filter((item) => item !== allergen)
        : [...current, allergen]
    );
  }

  function showRecommendations() {
    router.push({
      pathname: '/results',
      params: {
        location: location.trim() || defaults.location,
        transport,
        openNow: String(openNow),
        maximumTravelTime: String(maximumTravelTime),
        eatingPreferences: eatingPreferences.join(','),
        requiredDietary: requiredDietary.join(','),
        preferredDietary: preferredDietary.join(','),
        allergies: allergies.join(','),
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
              <ThemedText type="title" style={styles.brandTitle} themeColor="accent">
                WATsForLunch
              </ThemedText>
              <ThemedText style={styles.intro} themeColor="textSecondary">
                The intelligent decision layer between you and your next meal
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

              <OptionalPreferenceSection
                expanded={isDietaryExpanded}
                onToggle={() => setIsDietaryExpanded((current) => !current)}
                title="Dietary restrictions">
                <ThemedText type="small" themeColor="textSecondary">
                  Choose one priority per restriction. Required restrictions filter results; preferred
                  restrictions improve their rank.
                </ThemedText>
                <DietaryPreferenceList
                  getSelection={getDietarySelection}
                  onChange={setDietarySelection}
                  options={dietaryRestrictionOptions}
                />
              </OptionalPreferenceSection>

              <OptionalPreferenceSection
                expanded={isAllergyExpanded}
                onToggle={() => setIsAllergyExpanded((current) => !current)}
                title="Allergies">
                <ThemedText type="small" themeColor="textSecondary">
                  Allergy selections are always required. We remove meals with a listed allergen or
                  cross-contact warning.
                </ThemedText>
                <SelectionChipGroup
                  accessibilityLabel="Allergies"
                  onToggle={toggleAllergy}
                  options={allergyOptions}
                  selected={allergies}
                />
              </OptionalPreferenceSection>

              <FieldLabel label="What are you in the mood for? Select all that apply." />
              <View style={styles.preferenceOptions}>
                {eatingPreferenceOptions.map((option) => (
                  <OptionButton
                    healthPreference={option}
                    key={option}
                    label={option}
                    multiSelect
                    onPress={() => toggleEatingPreference(option)}
                    selected={eatingPreferences.includes(option)}
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
                Let&apos;s eat!
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

function OptionalPreferenceSection({
  children,
  expanded,
  onToggle,
  title,
}: {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.preferenceSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.optionalHeader,
          { backgroundColor: 'transparent', borderWidth: 0 },
          pressed && styles.pressed,
        ]}>
        <View style={styles.optionalHeaderText}>
          <ThemedText style={styles.optionalTitle}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Optional
          </ThemedText>
        </View>
        <ThemedText style={[styles.optionalChevron, { color: theme.textSecondary }]}>
          {expanded ? '⌃' : '⌄'}
        </ThemedText>
      </Pressable>
      <ExpandableContent expanded={expanded}>
        <View style={styles.optionalContent}>{children}</View>
      </ExpandableContent>
    </View>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

type OptionButtonProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  wide?: boolean;
  multiSelect?: boolean;
  healthPreference?: EatingPreference;
};

function OptionButton({
  label,
  onPress,
  selected,
  wide = false,
  multiSelect = false,
  healthPreference,
}: OptionButtonProps) {
  const theme = useTheme();
  const selectedColors = getSelectedOptionColors(healthPreference, theme);

  return (
    <Pressable
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityState={multiSelect ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        wide && styles.wideOptionButton,
        {
          backgroundColor: selected ? selectedColors.backgroundColor : theme.backgroundElement,
          borderColor: selected ? selectedColors.borderColor : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: selected ? selectedColors.textColor : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function getSelectedOptionColors(
  preference: EatingPreference | undefined,
  theme: ReturnType<typeof useTheme>
) {
  if (preference === 'Kinda Healthy') {
    return {
      backgroundColor: theme.kindaHealthySoft,
      borderColor: theme.kindaHealthy,
      textColor: theme.kindaHealthy,
    };
  }

  if (preference === 'Unhealthy') {
    return {
      backgroundColor: theme.unhealthySoft,
      borderColor: theme.unhealthy,
      textColor: theme.unhealthyText,
    };
  }

  return {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
    textColor: theme.accent,
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
  brandTitle: {
    fontSize: 44,
    fontWeight: 800,
    letterSpacing: -1.2,
    lineHeight: 48,
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
  preferenceSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  optionalHeader: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 13,
  },
  optionalHeaderText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionalTitle: {
    fontWeight: 700,
  },
  optionalChevron: {
    fontSize: 18,
    fontWeight: 700,
  },
  optionalContent: {
    gap: Spacing.two,
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
