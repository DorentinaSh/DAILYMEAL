/**
 * Today's first meal, drawn the way the recipe screen draws a meal: its dish
 * as a circle straddling the seam between the green and a white sheet, and on
 * the sheet what it is, how long it takes and the two things you do with it.
 * The rest of the day rides on the same sheet, below, as children.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { Button } from './Button';
import { EmptyPlate } from './EmptyPlate';
import { ClockIcon, LeafIcon, LoopIcon } from './icons';
import { MealMark } from './MealMark';
import { color, font, space } from './theme';

/** MealMark's spotlight size. */
const DISH = 200;
/** The circle overlaps the sheet by half, so it straddles the seam. */
const OVERLAP = DISH / 2;

type FactKind = 'time' | 'ingredients' | 'round';

function FactIcon({ kind }: { kind: FactKind }) {
  // An outline clock, not the recipe screen's yolk one: the tag above is the
  // yolk on this sheet, and it means today.
  if (kind === 'time') return <ClockIcon tint={color.ink} size={18} />;
  if (kind === 'ingredients') return <LeafIcon />;
  return <LoopIcon />;
}

type Props = {
  category: Category;
  meal: Meal | null;
  /** Null while its reminder is off: then there is no time anyone chose. */
  time: string | null;
  /** Its time is still to come, which is when "Up next" is true. */
  ahead: boolean;
  total: number;
  position: number;
  canSkip: boolean;
  exhausted: boolean;
  onSkip: () => void;
  onOpen: () => void;
  onAddFirst: () => void;
  children?: ReactNode;
};

export function SpotlightMeal({
  category,
  meal,
  time,
  ahead,
  total,
  position,
  canSkip,
  exhausted,
  onSkip,
  onOpen,
  onAddFirst,
  children,
}: Props) {
  const fade = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // The one animated moment in the app: a new meal fades in where the
  // rejected one was, so a skip reads as a swap rather than a redraw.
  useEffect(() => {
    if (reduceMotion) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [meal?.id, reduceMotion, fade]);

  const opacity = reduceMotion ? 1 : fade;
  const label = CATEGORY_LABEL[category];
  const lower = label.toLowerCase();
  const tag = [ahead ? 'Up next' : null, label, time].filter(Boolean).join(' · ');

  const count = meal?.ingredients.length ?? 0;
  const facts = meal
    ? [
        meal.prepMinutes
          ? { kind: 'time' as const, text: `${meal.prepMinutes} min`, spoken: null }
          : null,
        count
          ? {
              kind: 'ingredients' as const,
              text: `${count} ingredient${count === 1 ? '' : 's'}`,
              spoken: null,
            }
          : null,
        total > 1
          ? {
              kind: 'round' as const,
              text: `${position + 1} of ${total}`,
              spoken: `${position + 1} of ${total} this round`,
            }
          : null,
      ].filter((f) => f !== null)
    : [];

  return (
    <>
      <View style={styles.dishWrap}>
        {/* The shadow is on a wrapper so a photo's own clipping cannot cut it
            off; it falls on the sheet, as the recipe screen's does. */}
        <Animated.View style={[styles.dishShadow, { opacity }]}>
          {meal ? (
            <MealMark name={meal.name} uri={photoUri(meal)} size="spotlight" />
          ) : (
            <EmptyPlate size={DISH} />
          )}
        </Animated.View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.tag}>{tag}</Text>
          {meal ? (
            <Animated.View style={[styles.headText, { opacity }]}>
              <Text style={styles.name} accessibilityRole="header">
                {meal.name}
              </Text>
              {facts.length > 0 && (
                <View style={styles.facts}>
                  {facts.map((f) => (
                    <View
                      key={f.kind}
                      style={styles.fact}
                      accessible
                      accessibilityLabel={f.spoken ?? f.text}
                    >
                      <FactIcon kind={f.kind} />
                      <Text style={styles.factText}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : (
            <>
              <Text style={styles.name} accessibilityRole="header">
                Nothing here yet
              </Text>
              <Text style={styles.emptyBody}>
                Add a {lower} you actually eat. It shows up here straight away.
              </Text>
            </>
          )}
        </View>

        {meal ? (
          <View style={styles.actions}>
            <Button
              label="Show another"
              onPress={onSkip}
              disabled={!canSkip}
              style={styles.action}
            />
            <Button label="Recipe" onPress={onOpen} variant="leaf" style={styles.action} />
          </View>
        ) : (
          <Button
            label={`Add a ${lower}`}
            onPress={onAddFirst}
            variant="leaf"
            style={styles.addFirst}
          />
        )}

        {meal && exhausted && (
          <Text style={styles.note}>
            That’s every {lower} you’ve added. A fresh round starts tomorrow.
          </Text>
        )}
        {meal && !exhausted && !canSkip && total === 1 && (
          <Text style={styles.note}>Add another {lower} to have something to swap to.</Text>
        )}

        {children}

        <View style={styles.sheetTail} pointerEvents="none" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dishWrap: {
    alignItems: 'center',
    marginTop: space.xl,
    // Claims only the top half; the circle overflows the rest onto the sheet,
    // and zIndex is what puts it on top of the sheet rather than under it.
    height: OVERLAP,
    zIndex: 1,
  },
  dishShadow: {
    width: DISH,
    height: DISH,
    borderRadius: OVERLAP,
    // A ground for the shadow to be cast from while a photo is still loading.
    backgroundColor: color.page,
    boxShadow: '0px 18px 28px rgba(22, 48, 46, 0.24)',
  },

  sheet: {
    flexGrow: 1,
    backgroundColor: color.page,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // Begins at the circle's midpoint and clears its lower half.
    paddingTop: OVERLAP + space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  // Hangs below the sheet, so the bounce past the end shows more sheet rather
  // than green. Placed by its bottom edge — see the recipe screen's for why
  // `top: '100%'` lands in the wrong place.
  sheetTail: {
    position: 'absolute',
    bottom: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: color.page,
  },

  head: { alignItems: 'center' },
  headText: { alignSelf: 'stretch', alignItems: 'center' },
  // Yolk, the accent that means today, on the one meal Today is about.
  tag: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.ink,
    backgroundColor: color.yolk,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  name: {
    fontFamily: font.semibold,
    fontSize: 26,
    lineHeight: 34,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.md,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: space.xl,
    rowGap: space.sm,
    marginTop: space.md,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  factText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.ink,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: color.slate,
    textAlign: 'center',
    marginTop: space.sm,
  },

  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  action: { flex: 1, minHeight: 52, borderRadius: 14 },
  addFirst: { marginTop: space.xl, minHeight: 52, borderRadius: 14 },
  note: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.slate,
    textAlign: 'center',
    marginTop: space.md,
  },
});
