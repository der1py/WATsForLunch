import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SelectionChipGroupProps<T extends string> = {
  accessibilityLabel: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (option: T) => void;
};

export function SelectionChipGroup<T extends string>({
  accessibilityLabel,
  options,
  selected,
  onToggle,
}: SelectionChipGroupProps<T>) {
  const theme = useTheme();

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.chipGroup}>
      {options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            key={option}
            onPress={() => onToggle(option)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? theme.accentSoft : theme.backgroundElement,
                borderColor: isSelected ? theme.accent : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: isSelected ? theme.accent : theme.textSecondary }}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.78,
  },
});
