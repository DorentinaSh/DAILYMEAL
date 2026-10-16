/**
 * Today's card for one category.
 *
 * The ingredient list sits on the face of the card rather than behind a tap,
 * because the question this screen answers is "can I make this right now?"
 * and that is answered by reading the list against what is in the kitchen.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Category, Meal } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { CATEGORY_LABEL } from '@/domain/types';
import { Button } from './Button';
import { MealMark } from './MealMark';
import { CycleStrip } from './CycleStrip';
import { color, eyebrow, font, radius, space } from './theme';

type Props = {
  category: Category;
  meal: Meal | null;
  time: string;
  notify: boolean;
  total: number;
  position: number;
  canSkip: boolean;
  exhausted: boolean;
  onSkip: () => void;
  onOpen: () => void;
  onAddFirst: () => void;
};

export function MealCard({
  category,
  meal,
  time,
  notify,
  total,
  position,
  canSkip,
  exhausted,
  onSkip,
  onOpen,
  onAddFirst,
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

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={eyebrow}>{CATEGORY_LABEL[category]}</Text>
        <View style={styles.headRight}>
          {notify ? <Text style={styles.time}>{time}</Text> : null}
          <CycleStrip total={total} position={position} />
        </View>
      </View>

      {meal ? (
        <Animated.View style={{ opacity: reduceMotion ? 1 : fade }}>
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={meal.name}
            style={styles.headline}
          >
            <MealMark name={meal.name} uri={photoUri(meal)} size="md" />
            <View style={styles.headlineText}>
              <Text style={styles.name}>{meal.name}</Text>
              <Text style={styles.meta}>
                {[
                  meal.prepMinutes ? `${meal.prepMinutes} min` : null,
                  meal.ingredients.length
                    ? `${meal.ingredients.length} ingredient${meal.ingredients.length === 1 ? '' : 's'}`
                    : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
            </View>
          </Pressable>

          {meal.ingredients.length > 0 && (
            <View style={styles.list}>
              {meal.ingredients.map((item, i) => (
                <View key={`${item}-${i}`} style={styles.listRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Button
              label="Show another"
              onPress={onSkip}
              disabled={!canSkip}
              style={styles.grow}
            />
            <Button label="Recipe" onPress={onOpen} variant="solid" style={styles.grow} />
          </View>

          {exhausted && (
            <Text style={styles.note}>
              That’s every {CATEGORY_LABEL[category].toLowerCase()} you’ve added. A fresh
              round starts tomorrow.
            </Text>
          )}
          {!exhausted && !canSkip && total === 1 && (
            <Text style={styles.note}>
              Add another {CATEGORY_LABEL[category].toLowerCase()} to have something to
              swap to.
            </Text>
          )}
        </Animated.View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Add a {CATEGORY_LABEL[category].toLowerCase()} you actually eat. It shows up
            here straight away.
          </Text>
          <Button
            label={`Add a ${CATEGORY_LABEL[category].toLowerCase()}`}
            onPress={onAddFirst}
            variant="solid"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.tile,
    borderRadius: radius.lg,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.edge,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  headRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  time: {
    fontFamily: font.regular,
    fontSize: 11,
    color: color.slate,
    letterSpacing: 0.5,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headlineText: { flex: 1 },
  name: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 28,
    color: color.ink,
  },
  meta: {
    fontFamily: font.regular,
    fontSize: 11,
    letterSpacing: 0.6,
    color: color.slate,
    textTransform: 'uppercase',
    marginTop: space.xs,
  },
  list: {
    marginTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: color.edge,
    paddingTop: space.lg,
    gap: space.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.yolk,
  },
  listText: {
    fontFamily: font.regular,
    fontSize: 16,
    color: color.ink,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xl,
  },
  grow: { flex: 1 },
  note: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.slate,
    marginTop: space.md,
    lineHeight: 19,
  },
  empty: {
    gap: space.md,
    paddingBottom: space.xs,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: 24,
    color: color.ink,
  },
  emptyBody: {
    fontFamily: font.regular,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    marginBottom: space.sm,
  },
});
