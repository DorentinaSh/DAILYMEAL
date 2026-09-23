import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { color, font, radius, space, TAB_COLORS } from './theme';

export type SegmentItem<T extends string> = {
  value: T;
  label: string;
  /** A count shown after the label. Omit it where there is nothing to count. */
  badge?: number;
};

type Props<T extends string> = {
  items: readonly SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * 'tabs' switches which list is on screen; 'choice' picks a value in a form.
   * The two are drawn identically and differ only in what they announce to a
   * screen reader, which is the part that actually distinguishes them.
   */
  as?: 'tabs' | 'choice';
  style?: ViewStyle;
};

export function Segment<T extends string>({
  items,
  value,
  onChange,
  as = 'choice',
  style,
}: Props<T>) {
  return (
    <View
      style={[styles.track, style]}
      accessibilityRole={as === 'tabs' ? 'tablist' : undefined}
    >
      {items.map((item) => {
        const active = item.value === value;
        const tone = TAB_COLORS[active ? 'on' : 'off'];
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole={as === 'tabs' ? 'tab' : 'button'}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.item,
              active && { backgroundColor: tone.pill },
              pressed && !active && styles.pressed,
            ]}
          >
            <Text style={[styles.label, { color: tone.label }]} numberOfLines={1}>
              {item.label}
            </Text>
            {item.badge != null && (
              <Text style={[styles.badge, { color: tone.count }]}>{item.badge}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  pressed: { backgroundColor: color.porcelain },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 15,
  },
  badge: {
    fontFamily: font.mono,
    fontSize: 11,
  },
});
