/**
 * A bookmark, drawn rather than imported — the tab marks work the same way,
 * and there is no bookmark character that renders reliably across fonts.
 *
 * The notch is a triangle painted in whatever sits behind the mark, so `on`
 * must match that surface — porcelain on a page, tile on a card. Saved and
 * unsaved differ by fill rather than by outline: an outline's border box
 * fights the notch, and fill is how the tab bar already signals active from
 * inactive.
 */
import { StyleSheet, View } from 'react-native';

import { color } from './theme';

const WIDTH = 14;

export function SaveMark({ saved, on = color.porcelain }: { saved: boolean; on?: string }) {
  return (
    <View style={[styles.body, { backgroundColor: saved ? color.yolk : color.mute }]}>
      <View style={[styles.notch, { borderBottomColor: on }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: WIDTH,
    height: 18,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    justifyContent: 'flex-end',
  },
  notch: {
    width: 0,
    height: 0,
    borderLeftWidth: WIDTH / 2,
    borderRightWidth: WIDTH / 2,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
