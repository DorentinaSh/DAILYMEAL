/**
 * A meal's face.
 *
 * One square filled three ways: the source's photo when the meal came from
 * search, the initial in the display face when you typed it in yourself, and a
 * yolk band when this is the meal being served today. Before this, the recipes
 * in Search had photos and the meals you actually owned had nothing, so the app
 * got plainer the more you used it.
 *
 * The band sits inside the tile rather than ringing it. A yolk edge on the page
 * measures 1.9:1 — the same trap SAVE_COLORS documents — while yolk on ink
 * measures 7.2:1, and a solid band holds up over a photograph too.
 */
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { initialFor } from './initial';
import { color, font, radius } from './theme';

/** The middle corner has no token: 10 reads sharp at 72px and 16 reads soft. */
const SIZES = {
  sm: { box: 44, corner: radius.md, letter: 21, band: 4 },
  md: { box: 72, corner: 12, letter: 34, band: 5 },
  lg: { box: 96, corner: radius.lg, letter: 46, band: 6 },
} as const;

type Props = {
  name: string;
  /** Already resolved — see photos/paths.ts for why a filename will not do. */
  uri?: string | null;
  /**
   * Wear the accent. Set it where a meal sits among its peers and today's is
   * worth finding — the Meals list. Today's own card does not need it: the
   * whole card is already today.
   */
  today?: boolean;
  size?: keyof typeof SIZES;
  style?: ViewStyle;
};

export function MealMark({ name, uri, today = false, size = 'sm', style }: Props) {
  const { box, corner, letter, band } = SIZES[size];

  return (
    <View
      style={[
        styles.frame,
        { width: box, height: box, borderRadius: corner },
        !uri && styles.tile,
        style,
      ]}
      // The meal's name is right there with it everywhere this appears, so the
      // mark is decoration and a reader should not be stopped on it.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {uri ? (
        <Image source={uri} style={styles.photo} contentFit="cover" transition={180} />
      ) : (
        <Text style={[styles.letter, { fontSize: letter }]}>{initialFor(name)}</Text>
      )}
      {today && <View style={[styles.band, { height: band }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: { backgroundColor: color.ink },
  photo: { width: '100%', height: '100%' },
  letter: {
    fontFamily: font.display,
    color: color.porcelain,
    // Fraunces at these sizes sits high in its box without this.
    textAlign: 'center',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.yolk,
  },
});
