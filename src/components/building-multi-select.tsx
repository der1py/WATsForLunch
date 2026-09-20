import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchBuildings, type Building } from '@/services/buildings';

type BuildingMultiSelectProps = {
  onChange: (building: Building) => void;
  selectedBuilding: Building;
};

export function BuildingMultiSelect({ onChange, selectedBuilding }: BuildingMultiSelectProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchingBuildings = useMemo(() => searchBuildings(query), [query]);

  function showDropdown() {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
    setIsFocused(true);
  }

  function hideDropdownAfterTap() {
    blurTimeout.current = setTimeout(() => setIsFocused(false), 100);
  }

  function selectBuilding(building: Building) {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
    onChange(building);
    setQuery('');
    setIsFocused(false);
  }

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Search campus buildings"
        autoCapitalize="words"
        onBlur={hideDropdownAfterTap}
        onChangeText={setQuery}
        onFocus={showDropdown}
        placeholder="Search by building or address"
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.accent}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={query}
      />

      <View style={styles.selectedSummary}>
        <ThemedText type="smallBold" themeColor="accent">
          Selected building
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {selectedBuilding.name}
        </ThemedText>
      </View>

      {isFocused && (
        <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.results}>
            {matchingBuildings.length > 0 ? (
              matchingBuildings.map((building) => {
                const selected = building.name === selectedBuilding.name;

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={building.name}
                    onPress={() => selectBuilding(building)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: selected ? theme.accentSoft : theme.background,
                        borderBottomColor: theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold">{building.name}</ThemedText>
                      <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
                        {building.address}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.selectionMark, { color: selected ? theme.accent : theme.textSecondary }]}>
                      {selected ? '✓' : ''}
                    </ThemedText>
                  </Pressable>
                );
              })
            ) : (
              <ThemedText style={styles.emptyState} type="small" themeColor="textSecondary">
                No buildings match “{query}”.
              </ThemedText>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: 500,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
  },
  selectedSummary: {
    gap: Spacing.half,
  },
  dropdown: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  results: {
    maxHeight: 384,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  selectionMark: {
    fontSize: 18,
    fontWeight: 800,
    width: 18,
  },
  emptyState: {
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
