/**
 * A reminder time picked with one tap: the Meals tab's chip, on Settings' pale
 * cards. The one with a clock opens the picker for any other minute.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { ClockIcon } from './icons';
import { font, space, TIME_CHIP_COLORS } from './theme';

const HEIGHT = 40;

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  clock?: boolean;
};

export function TimeChip({ label, selected, onPress, accessibilityLabel, clock }: Props) {
  const tone = TIME_CHIP_COLORS[selected ? 'on' : 'off'];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      // Up to the 44pt a target needs, without making the row taller.
      hitSlop={{ top: 2, bottom: 2 }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: tone.pill, borderColor: tone.border },
        pressed && styles.pressed,
      ]}
    >
      {clock && <ClockIcon tint={tone.label} size={14} />}
      <Text
        style={[styles.label, { color: tone.label }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: 6,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
});
