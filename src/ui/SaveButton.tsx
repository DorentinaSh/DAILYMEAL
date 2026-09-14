/**
 * The keep-for-later control: a bookmark inside a pill.
 *
 * Drawn rather than imported — no icon set is installed, and no bookmark
 * character renders reliably across fonts. The pill is not decoration: a bare
 * mark on the page measured 2:1 unsaved and 1.6:1 saved, so the control read
 * as an ornament and turning it on looked like nothing had happened. Filled
 * ink when on, it borrows the category picker's on/off language, and the 44pt
 * box is the smallest target a thumb reliably finds.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { SAVE_COLORS, radius } from './theme';

const MARK_WIDTH = 14;

export function SaveButton({
  saved,
  onPress,
  accessibilityLabel,
}: {
  saved: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const skin = SAVE_COLORS[saved ? 'on' : 'off'];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: skin.pill, borderColor: skin.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.mark, { backgroundColor: skin.mark }]}>
        {/* The notch is painted in whatever the pill is filled with. */}
        <View style={[styles.notch, { borderBottomColor: skin.pill }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.62 },
  mark: {
    width: MARK_WIDTH,
    height: 18,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    justifyContent: 'flex-end',
  },
  notch: {
    width: 0,
    height: 0,
    borderLeftWidth: MARK_WIDTH / 2,
    borderRightWidth: MARK_WIDTH / 2,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
