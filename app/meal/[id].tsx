import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { mealById } from '@/domain/cycle';
import { CATEGORY_LABEL } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { useAppStore } from '@/store/useAppStore';
import { ChooseListSheet } from '@/ui/ChooseListSheet';
import { FoodDoodles } from '@/ui/FoodDoodles';
import { BookmarkIcon, ChevronLeftIcon, LeafIcon } from '@/ui/icons';
import { MealMark } from '@/ui/MealMark';
import { color, font, space } from '@/ui/theme';

/** The circle overlaps the sheet by this much, so it straddles the seam. */
const HERO = 256;
const OVERLAP = HERO / 2;
/** The fixed bar: a 40pt control plus the breathing room around it. */
const BAR_BLOCK = 40 + 8;
const GAP = 16;

/**
 * The reference's row of small coloured marks — its star, flame and clock —
 * drawn for what a meal actually has. Each sits beside the words that say the
 * same thing, so the colour is decoration and need not clear contrast alone.
 */
type FactKind = 'time' | 'ingredients' | 'round';

function FactIcon({ kind }: { kind: FactKind }) {
  if (kind === 'time') {
    // Yolk, like the reference's clock; the accent is spent here on a mark
    // that is never alone, not on a state.
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} fill={color.yolk} />
        <Path
          d="M12 7v5l3 2"
          fill="none"
          stroke={color.page}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (kind === 'ingredients') return <LeafIcon />;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"
        fill="none"
        stroke={color.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QuietButton({
  label,
  danger,
  onPress,
}: {
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quiet, pressed && styles.quietPressed]}
    >
      <Text style={[styles.quietText, danger && styles.quietDanger]}>{label}</Text>
    </Pressable>
  );
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useAppStore((s) => mealById(s, id ?? null));
  // A saved-only meal is in no loop, so it has no cycle and no place in one.
  const cycle = useAppStore((s) => (meal?.category ? s.cycles[meal.category] : null));
  const removeMeal = useAppStore((s) => s.removeMeal);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const placeMeal = useAppStore((s) => s.placeMeal);
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);

  if (!meal) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This meal was deleted.</Text>
      </View>
    );
  }

  const savedOnly = meal.category === null;

  function confirmDelete() {
    if (!meal) return;
    const gone = savedOnly ? 'It leaves Saved for good.' : 'It leaves the rotation for good.';
    Alert.alert(`Delete ${meal.name}?`, gone, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeMeal(meal.id);
          router.back();
        },
      },
    ]);
  }

  // Unbookmarking a saved-only meal deletes it, and this page is where that is
  // least expected — so here, unlike on a search card, it asks first.
  function onBookmark() {
    if (!meal) return;
    if (!savedOnly) {
      toggleSaved(meal.id);
      return;
    }
    Alert.alert(
      'Remove from Saved?',
      "It isn't in Breakfast or Lunch, so it will be deleted.",
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            toggleSaved(meal.id);
            router.back();
          },
        },
      ],
    );
  }

  const place = cycle ? cycle.order.indexOf(meal.id) : -1;
  const count = meal.ingredients.length;
  const facts = [
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
    // Short on screen so three fit on one line, as the reference's do; the
    // loop icon says which round, and a screen reader is told in words.
    place >= 0 && cycle && cycle.order.length > 1
      ? {
          kind: 'round' as const,
          text: `${place + 1} of ${cycle.order.length}`,
          spoken: `${place + 1} of ${cycle.order.length} this round`,
        }
      : null,
  ].filter((f) => f !== null);

  return (
    <View style={styles.screen}>
      {/* White, like the bar's icons and title, on the green. */}
      <StatusBar style="light" />

      {/* Layer 1 is the screen itself: green edge to edge with the food
          drawings over it, so wherever the sheet is dragged there is green
          behind it, never a strip of page. */}
      <FoodDoodles />

      {/* Layer 2: everything that moves. The circle travels with the sheet —
          left behind it would hang over the scrolling content. */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + BAR_BLOCK + GAP },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {/* The shadow is on a wrapper so the photo's own clipping cannot
              cut it off; it falls on the sheet, as the reference's bowl's does. */}
          <View style={styles.heroShadow}>
            <MealMark name={meal.name} uri={photoUri(meal)} size="hero" />
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={styles.name}>{meal.name}</Text>
          {/* Where the reference prints the price: which list this is in. */}
          <Text style={styles.listName}>
            {meal.category ? CATEGORY_LABEL[meal.category] : 'Saved only'}
          </Text>

          {facts.length > 0 && (
            <View style={[styles.facts, facts.length === 3 && styles.factsSpread]}>
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

          {meal.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.heading} accessibilityRole="header">
                Ingredients
              </Text>
              <View style={styles.list}>
                {meal.ingredients.map((item, i) => (
                  <View key={`${item}-${i}`} style={styles.listRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.bodyText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {meal.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.heading} accessibilityRole="header">
                Method
              </Text>
              <View style={styles.steps}>
                {meal.steps.map((step, i) => (
                  <View key={`${step}-${i}`} style={styles.stepRow}>
                    {/* Numbered because method genuinely is a sequence. */}
                    <Text style={styles.stepNumber}>{i + 1}</Text>
                    <Text style={styles.bodyText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pushed to the foot of the sheet, so on a short recipe the button
              sits at the bottom of the screen as the reference's does, and on
              a long one it comes after the method. */}
          <View style={styles.actions}>
            {/* The reference's one green button. A saved-only meal's job here
                is to join a list, through the same sheet Search's + opens; a
                listed meal's is to be edited. */}
            <Pressable
              onPress={() =>
                savedOnly ? setAdding(true) : router.push(`/meal/edit?id=${meal.id}`)
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText}>
                {savedOnly ? 'Add to your meals' : 'Edit meal'}
              </Text>
            </Pressable>
            <View style={styles.quietRow}>
              {savedOnly && (
                <QuietButton
                  label="Edit meal"
                  onPress={() => router.push(`/meal/edit?id=${meal.id}`)}
                />
              )}
              <QuietButton label="Delete meal" danger onPress={confirmDelete} />
            </View>
          </View>

          <View style={styles.sheetTail} pointerEvents="none" />
        </View>
      </ScrollView>

      {/* Layer 3: the bar, fixed above the scroll so its buttons stay live and
          the status text always has green behind it, not the scrolling sheet.
          It carries its own copy of the drawings, which line up with the ones
          behind the scroll because both start at the screen's corner. */}
      <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
        <FoodDoodles />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.square, pressed && styles.squarePressed]}
        >
          <ChevronLeftIcon tint={color.page} />
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Meal details
        </Text>

        <Pressable
          onPress={onBookmark}
          accessibilityRole="button"
          accessibilityState={{ selected: !!meal.saved }}
          accessibilityLabel={meal.saved ? 'Remove from saved' : 'Save for later'}
          style={({ pressed }) => [styles.square, pressed && styles.squarePressed]}
        >
          <BookmarkIcon tint={color.page} filled={!!meal.saved} />
        </Pressable>
      </View>

      <ChooseListSheet
        visible={adding}
        name={meal.name}
        imageUrl={photoUri(meal)}
        suggested={null}
        onChoose={(category) => {
          placeMeal(meal.id, category);
          setAdding(false);
        }}
        onClose={() => setAdding(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The app's one green behind every recipe. The per-meal colour has not
  // gone: it is the circle sitting on it, which is where a colour belongs when
  // it stands for one meal rather than for the screen.
  screen: { flex: 1, backgroundColor: color.leaf },
  // Grows so a short recipe's sheet still reaches the bottom of the screen
  // instead of ending mid-way with green below it.
  scroll: { flexGrow: 1 },

  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: color.leaf,
    // Crops its copy of the drawings to the bar.
    overflow: 'hidden',
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: font.poppinsMedium,
    fontSize: 16,
    lineHeight: 22,
    color: color.page,
  },
  // The reference's rounded squares: white at a fifth strength over the green,
  // with the icon in full white on top.
  square: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  squarePressed: { backgroundColor: 'rgba(255, 255, 255, 0.36)' },

  heroWrap: {
    alignItems: 'center',
    // Claims only the top half; the circle overflows the rest onto the sheet,
    // and zIndex is what puts it on top of the sheet rather than under it.
    height: OVERLAP,
    zIndex: 1,
  },
  heroShadow: {
    width: HERO,
    height: HERO,
    borderRadius: OVERLAP,
    // A ground for the shadow to be cast from while a photo is still loading.
    backgroundColor: color.page,
    boxShadow: '0px 18px 28px rgba(22, 48, 46, 0.24)',
  },

  sheet: {
    backgroundColor: color.page,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // Begins at the circle's midpoint, and clears its lower half before any
    // text starts.
    paddingTop: OVERLAP + space.xl,
    paddingHorizontal: space.xl,
    flexGrow: 1,
  },
  // Hangs below the sheet without adding to the scroll height, so the iOS
  // bounce past the end shows more sheet rather than a green gap under it.
  //
  // Placed by its bottom edge, never as `top: '100%'`. React Native runs Yoga
  // in its compatibility mode, where a percentage inset on an absolute child
  // is measured against the parent's height less its padding — so `top:
  // '100%'` put this strip 202pt (the sheet's top and bottom padding) above
  // the sheet's bottom, and being drawn last, it painted white over the
  // buttons and the end of the method.
  sheetTail: {
    position: 'absolute',
    bottom: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: color.page,
  },
  name: {
    fontFamily: font.headline,
    fontSize: 26,
    lineHeight: 34,
    color: color.ink,
  },
  // The buttons' own green, as the reference prints its price — 3.4:1 on the
  // sheet, under the 4.5 text asks, chosen for the match. It is one word, and
  // the name above it says what the page is.
  listName: {
    fontFamily: font.poppinsMedium,
    fontSize: 17,
    lineHeight: 24,
    color: color.leaf,
    marginTop: 2,
  },

  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.xl,
    rowGap: space.sm,
    marginTop: space.xl,
  },
  // Three spread edge to edge like the reference's; fewer stay together on
  // the left rather than flying to opposite sides.
  factsSpread: { justifyContent: 'space-between' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  factText: {
    fontFamily: font.poppins,
    fontSize: 14,
    lineHeight: 20,
    color: color.ink,
  },

  section: { marginTop: space.xl, gap: space.sm },
  heading: {
    fontFamily: font.headline,
    fontSize: 17,
    lineHeight: 24,
    color: color.ink,
  },
  list: { gap: space.xs },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  // Centred on the first line of the text beside it, not on the whole row.
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: color.leaf,
    marginTop: 10,
  },
  // Slate rather than the reference's #9D9D9D, which is 2.7:1 on white; this
  // is the recipe, read at arm's length over a stove.
  bodyText: {
    fontFamily: font.poppins,
    fontSize: 15,
    lineHeight: 24,
    color: color.slate,
    flex: 1,
  },
  steps: { gap: space.md },
  stepRow: { flexDirection: 'row', gap: space.md },
  stepNumber: {
    fontFamily: font.poppinsMedium,
    fontSize: 15,
    lineHeight: 24,
    color: color.leaf,
    minWidth: 18,
  },

  actions: { marginTop: 'auto', paddingTop: space.xxl, gap: space.xs },
  primary: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: color.leaf,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primaryPressed: { opacity: 0.8 },
  primaryText: {
    fontFamily: font.poppinsMedium,
    fontSize: 16,
    lineHeight: 22,
    color: color.page,
  },
  quietRow: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  quiet: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' },
  quietPressed: { opacity: 0.5 },
  quietText: {
    fontFamily: font.poppinsMedium,
    fontSize: 15,
    lineHeight: 22,
    color: color.ink,
  },
  quietDanger: { color: color.chili },

  gone: {
    flex: 1,
    backgroundColor: color.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goneText: { fontFamily: font.body, fontSize: 16, color: color.slate },
});
