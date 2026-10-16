import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { CHIP_COLORS, color, font, space } from './theme';

/** The chips are drawn shorter than a touch target; the slop makes up the rest. */
const HEIGHT = 40;

export type ChipTab<T extends string> = {
  value: T;
  label: string;
  /**
   * How many meals the list holds. The reference's chips carry no number, so
   * it isn't drawn — it is read out after the label instead.
   */
  count?: number;
};

type Props<T extends string> = {
  items: readonly ChipTab<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

/**
 * Which list the Meals tab shows, as the food-app reference draws its
 * categories: a row of separate rounded chips in Poppins, the one you're on
 * filled in the app's green, the others pale with green names.
 */
export function ChipTabs<T extends string>({ items, value, onChange, style }: Props<T>) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.value === value;
        const tone = CHIP_COLORS[active ? 'on' : 'off'];
        const spoken =
          item.count == null
            ? item.label
            : `${item.label}, ${item.count} meal${item.count === 1 ? '' : 's'}`;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={spoken}
            hitSlop={{ top: 4, bottom: 4 }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: tone.pill, borderColor: tone.border },
              pressed && !active && styles.pressed,
            ]}
          >
            <Text style={[styles.label, { color: tone.label }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.lg },
  chip: {
    flex: 1,
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  pressed: { backgroundColor: color.porcelain },
  label: {
    fontFamily: font.headline,
    fontSize: 14,
    lineHeight: 20,
  },
});
