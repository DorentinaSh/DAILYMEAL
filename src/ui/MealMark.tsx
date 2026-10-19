/**
 * A meal's face.
 *
 * One square filled three ways: the source's photo when the meal came from
 * search, the initial in semibold on a glaze picked from the meal's own
 * name when you typed it in yourself, and a yolk band when this is the meal
 * being served today. Before this, the recipes
 * in Search had photos and the meals you actually owned had nothing, so the app
 * got plainer the more you used it.
 *
 * The band sits inside the tile rather than ringing it. A yolk edge on the page
 * measures 1.9:1 — the same trap SAVE_COLORS documents — while yolk on ink
 * measures 7.2:1, and a solid band holds up over a photograph too.
 */
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { glazeFor } from './glaze';
import { initialFor } from './initial';
import { color, font, radius } from './theme';

/** The middle corner has no token: 10 reads sharp at 72px and 16 reads soft. */
const SIZES = {
  sm: { box: 44, corner: radius.md, letter: 21, band: 4 },
  md: { box: 72, corner: 12, letter: 34, band: 5 },
  lg: { box: 96, corner: radius.lg, letter: 46, band: 6 },
  /** A Meals list card's dish: a rounded square, as the list reference draws it. */
  row: { box: 64, corner: 14, letter: 30, band: 5 },
  /** The add sheet's header: the dish you are adding, a small circle. */
  thumb: { box: 48, corner: 24, letter: 22, band: 4 },
  /** A search result card's dish. A circle, like the hero, at card scale. */
  card: { box: 100, corner: 50, letter: 46, band: 6 },
  /** The recipe screen's hero. Corner is half the box, so it is a circle. */
  hero: { box: 256, corner: 128, letter: 116, band: 14 },
  /**
   * Today's first meal: the hero a size down, so its name and buttons still
   * fit above the fold.
   */
  spotlight: { box: 200, corner: 100, letter: 92, band: 12 },
  /** The rest of today, in the rows under it. */
  later: { box: 56, corner: 28, letter: 26, band: 4 },
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
        !uri && { backgroundColor: glazeFor(name) },
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
  photo: { width: '100%', height: '100%' },
  letter: {
    fontFamily: font.semibold,
    color: color.porcelain,
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
