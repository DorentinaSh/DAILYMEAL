/**
 * The faint food line-drawings behind the recipe screen's green, after the
 * reference's detail screen: an apple, a carrot, an egg, a fish, a mushroom, a
 * cup, a leaf, cherries and a slice of bread, scattered and turned across one
 * tile that repeats.
 *
 * Drawn in the deeper green at under half strength, so they are texture, not
 * picture — the white icons and title in the bar have to stay the loudest
 * thing on the green.
 *
 * It always fills the window from its top-left corner, so two of them — one
 * behind the scroll, one inside the fixed bar — line up into a single
 * pattern, with no seam where the bar ends.
 */
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { color } from './theme';

const TILE = 180;
/** Each drawing is 24 units square, scaled to about 32pt. */
const SCALE = 1.35;

const APPLE =
  'M12 7.5c-1.6-1.2-6-1.3-6 3.8 0 4 2.8 8.2 6 8.2s6-4.2 6-8.2c0-5.1-4.4-5-6-3.8z' +
  'M12 7.5c0-2 .8-3.6 2.4-4.5M12.6 5.8c1.6-1.4 3.6-1.3 4.6-.4-1.1 1.4-3.1 1.6-4.6.4z';
const CARROT =
  'M5.5 19.5c-1-1 4.5-9.5 7.5-11.5 2-1.3 4.3.7 3 3-2 3-9.5 9.5-10.5 8.5z' +
  'M15 7.5c-.3-1.9.4-3.6 1.9-4.6M16.6 9c1.9.3 3.5-.5 4.4-2M10 13l1.6 1.6M12.2 10.6l1.4 1.4';
const EGG = 'M12 3.5c3.4 0 6 5.8 6 9.8a6 6 0 0 1-12 0c0-4 2.6-9.8 6-9.8z';
const FISH =
  'M3.5 12c3-3.8 9-4.8 12.8-1.8l3.7-2.7v9l-3.7-2.7C12.5 16.8 6.5 15.8 3.5 12zM7.5 11.3v.01';
const MUSHROOM = 'M4 12.5a8 7 0 0 1 16 0zM9.5 12.5V17a2.5 2.5 0 0 0 5 0v-4.5M9 9.5v.01M14 8.5v.01';
const CUP =
  'M5 9.5h11V14a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16' +
  'M9 6.5c0-1 1-1.5 1-2.5M12.5 6.5c0-1 1-1.5 1-2.5';
const LEAF = 'M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14zM5 19l8.5-8.5';
const CHERRIES =
  'M10 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' +
  'M7 14c1-4.5 4-8 8.5-10M17 15c-.5-4-.8-7.5-1.5-11';
const BREAD = 'M6 20v-9a4 4 0 0 1-1-3c0-2.5 3-4.5 7-4.5s7 2 7 4.5a4 4 0 0 1-1 3v9z';

/** One per cell of a loose 3×3, nudged off the grid and turned. */
const PLACED: [d: string, x: number, y: number, turn: number][] = [
  [APPLE, 10, 8, -12],
  [CARROT, 72, 2, 18],
  [EGG, 134, 14, -8],
  [FISH, 4, 70, 10],
  [MUSHROOM, 68, 64, -16],
  [CUP, 128, 74, 8],
  [LEAF, 14, 130, 22],
  [CHERRIES, 74, 126, -6],
  [BREAD, 136, 134, 14],
];

export function FoodDoodles() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={styles.layer} pointerEvents="none">
      <Defs>
        <Pattern id="foodDoodles" patternUnits="userSpaceOnUse" width={TILE} height={TILE}>
          {PLACED.map(([d, x, y, turn]) => (
            <G
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) rotate(${turn} 16 16) scale(${SCALE})`}
            >
              <Path
                d={d}
                fill="none"
                stroke={color.kellyDeep}
                strokeOpacity={0.45}
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          ))}
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#foodDoodles)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0 },
});
