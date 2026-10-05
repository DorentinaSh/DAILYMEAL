/**
 * Choosing which list a recipe joins: the app's own bottom sheet, in place of
 * the system alert, which looked like a different app had interrupted this
 * one — grey stacked buttons in the platform's font, and a different look on
 * every phone. This one is the same everywhere and speaks the app's language:
 * the rounded white sheet of the recipe screen, the cards' greys, kelly for
 * the list the recipe's own category points to.
 *
 * Each tile says something true about its list — how many meals it holds and
 * when it reminds you — so the choice is made knowing what is there. One tap
 * on a tile is the whole decision; there is no second confirm.
 *
 * Built from React Native's own Modal and Animated, so no dependency. The
 * caller owns `visible`; this keeps itself mounted through the closing slide
 * and only then lets the modal go.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { describeList } from './listTile';
import { MealMark } from './MealMark';
import { color, eyebrow, font, radius, space } from './theme';

/** Further than the sheet is tall, so it starts fully off screen. */
const TRAVEL = 480;

type Props = {
  visible: boolean;
  /** The recipe being added. */
  name: string;
  imageUrl: string | null;
  /** The list the recipe's own category points to; both tiles still work. */
  suggested: Category;
  onChoose: (category: Category) => void;
  onClose: () => void;
};

export function ChooseListSheet({
  visible,
  name,
  imageUrl,
  suggested,
  onChoose,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const state = useAppStore();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  // The slide in starts once the modal is mounted — deliberately not from
  // Modal's onShow, which does not fire reliably on every platform and
  // architecture. If it never fires, the sheet stays transparent and off
  // screen: an invisible layer that swallows every tap and shows nothing.
  useEffect(() => {
    if (!mounted || !visible) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mounted, visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [TRAVEL, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      // Android's back button closes it, as tapping outside does.
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.scrim, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + space.lg, transform: [{ translateY }] },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.head}>
          <MealMark name={name} uri={imageUrl} size="thumb" />
          <View style={styles.headText}>
            <Text style={eyebrow}>Add to your meals</Text>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
          </View>
        </View>

        <View style={styles.tiles}>
          {CATEGORIES.map((category) => {
            const lines = describeList(mealsIn(state, category).length, state.settings[category]);
            const isSuggested = category === suggested;
            return (
              <Pressable
                key={category}
                onPress={() => onChoose(category)}
                accessibilityRole="button"
                accessibilityLabel={[
                  `Add to ${CATEGORY_LABEL[category].toLowerCase()}`,
                  lines.count,
                  isSuggested ? 'suggested' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
                style={({ pressed }) => [
                  styles.tile,
                  isSuggested && styles.tileSuggested,
                  pressed && styles.tilePressed,
                ]}
              >
                {isSuggested && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Suggested</Text>
                  </View>
                )}
                <Text style={styles.tileLabel}>{CATEGORY_LABEL[category]}</Text>
                <Text style={styles.tileCount}>{lines.count}</Text>
                {lines.reminder && <Text style={styles.tileReminder}>{lines.reminder}</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.tilePressed]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Ink, not black, at a weight that dims the page without blacking it out.
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22, 48, 46, 0.45)',
  },
  // The recipe screen's sheet: white, its top corners rounded the same 28.
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: space.xl,
    paddingHorizontal: space.xl,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headText: { flex: 1, gap: 2 },
  name: { fontFamily: font.headline, fontSize: 18, lineHeight: 24, color: color.ink },

  tiles: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  // The search cards' grey, borderless; the border is reserved, transparent,
  // so the suggested tile's outline does not make it a different size.
  tile: {
    flex: 1,
    minHeight: 112,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: color.porcelainWash,
  },
  tileSuggested: { backgroundColor: color.kellyWash, borderColor: color.kelly },
  tilePressed: { opacity: 0.7 },
  tileLabel: { fontFamily: font.headline, fontSize: 17, color: color.ink, marginTop: 'auto' },
  tileCount: { fontFamily: font.body, fontSize: 13, color: color.slate, marginTop: 2 },
  tileReminder: { fontFamily: font.mono, fontSize: 12, color: color.slate, marginTop: 2 },
  // Ink on kelly: 5.6:1, enough for type this small.
  tag: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    backgroundColor: color.kelly,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: space.sm,
  },
  tagText: {
    fontFamily: font.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.ink,
  },

  cancel: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.md,
  },
  cancelText: { fontFamily: font.bodyMedium, fontSize: 15, color: color.slate },
});
