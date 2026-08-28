/**
 * The loop, made visible.
 *
 * One tick per meal in the category. Solid ticks are meals already served in
 * this pass, the yolk tick is today, hollow ticks are still ahead. It is the
 * one piece of ornament in the app that is not ornament: it shows that the
 * rotation reaches everything, and it gives a skip a visible consequence.
 *
 * Past a dozen meals the ticks stop being countable, so it switches to a
 * plain fraction instead of drawing a stripe of noise.
 */
import { StyleSheet, Text, View } from 'react-native';

import { color, font, space } from './theme';

const MAX_TICKS = 12;

type Props = {
  total: number;
  /** Zero-based index of the meal being served. */
  position: number;
};

export function CycleStrip({ total, position }: Props) {
  if (total <= 1) return null;

  if (total > MAX_TICKS) {
    return (
      <Text style={styles.fraction}>
        {position + 1}/{total}
      </Text>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={`Meal ${position + 1} of ${total} in this round`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            i < position && styles.served,
            i === position && styles.current,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 14,
  },
  tick: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: color.edge,
  },
  served: {
    backgroundColor: color.mute,
  },
  current: {
    height: 14,
    backgroundColor: color.yolk,
  },
  fraction: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.mute,
    letterSpacing: 0.5,
  },
});
