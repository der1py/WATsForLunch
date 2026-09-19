import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DietaryPreference = 'Required' | 'Preferred';

type DietaryPreferenceListProps<T extends string> = {
  options: readonly T[];
  getSelection: (option: T) => DietaryPreference | undefined;
  onChange: (option: T, selection: DietaryPreference | undefined) => void;
};

export function DietaryPreferenceList<T extends string>({
  options,
  getSelection,
  onChange,
}: DietaryPreferenceListProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const selection = getSelection(option);

        return (
          <View
            key={option}
            style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.label}>{option}</ThemedText>
            <View style={styles.controls}>
              {(['Required', 'Preferred'] as const).map((level) => {
                const isSelected = selection === level;

                return (
                  <Pressable
                    accessibilityLabel={`${option}: ${level}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={level}
                    onPress={() => onChange(option, isSelected ? undefined : level)}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        backgroundColor: isSelected ? theme.accentSoft : theme.background,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: isSelected ? theme.accent : theme.textSecondary }}>
                      {level}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    padding: Spacing.two,
  },
  label: {
    flex: 1,
    fontWeight: 700,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  choice: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.78,
  },
});
