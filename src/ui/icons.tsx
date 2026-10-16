/**
 * Icons drawn as paths, for the marks the box-and-border glyphs elsewhere
 * cannot make: a bookmark's notch, a chevron's stroke weight.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { color } from './theme';

/**
 * The bookmark, drawn the way the reference draws its heart: an outline at
 * rest, solid when on. The shape change carries the state on its own, which
 * is what lets it wear a tint that is low-contrast against its ground.
 */
export function BookmarkIcon({
  tint,
  filled,
  size = 20,
}: {
  tint: string;
  filled: boolean;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        fill={filled ? tint : 'none'}
        stroke={tint}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Back: a single open stroke, not the ‹ character, so its weight is chosen. */
export function ChevronLeftIcon({ tint, size = 20 }: { tint: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke={tint}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A clock face in outline: the list reference's mark beside a time. */
export function ClockIcon({ tint, size = 16 }: { tint: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={tint} strokeWidth={1.8} />
      <Path
        d="M12 7.5V12l3 2"
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A leaf in the app's green with a white vein, beside an ingredient count —
 * on the meal page and in the Meals list, so the two say it the same way.
 */
export function LeafIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20C4 10.6 10.6 4 20 4c0 9.4-6.6 16-16 16z" fill={color.leaf} />
      <Path d="M4 20l9-9" stroke={color.page} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
