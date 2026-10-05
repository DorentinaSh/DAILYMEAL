import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mealById } from '@/domain/cycle';
import { CATEGORY_LABEL } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { MealMark } from '@/ui/MealMark';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

/** The circle overlaps the sheet by this much, so it straddles the seam. */
const HERO = 168;
const OVERLAP = HERO / 2;
/** The fixed bar: a 40pt control plus the breathing room around it. */
const BAR_BLOCK = 40 + 8;
const GAP = 16;

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useAppStore((s) => mealById(s, id ?? null));
  const cycle = useAppStore((s) => (meal ? s.cycles[meal.category] : null));
  const removeMeal = useAppStore((s) => s.removeMeal);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const insets = useSafeAreaInsets();

  if (!meal) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This meal was deleted.</Text>
      </View>
    );
  }

  function confirmDelete() {
    if (!meal) return;
    Alert.alert(`Delete ${meal.name}?`, 'It leaves the rotation for good.', [
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

  const place = cycle ? cycle.order.indexOf(meal.id) : -1;
  const chips = [
    meal.prepMinutes ? `${meal.prepMinutes} min` : null,
    meal.ingredients.length
      ? `${meal.ingredients.length} ingredient${meal.ingredients.length === 1 ? '' : 's'}`
      : null,
    place >= 0 && cycle && cycle.order.length > 1
      ? `${place + 1} of ${cycle.order.length} this round`
      : null,
  ].filter((c): c is string => c !== null);

  return (
    <View style={styles.screen}>
      {/* The green is bright, so the clock and battery stay dark. */}
      <StatusBar style="dark" />

      {/* Layer 1 is the screen itself: green edge to edge, so wherever the
          sheet is dragged there is green behind it, never a strip of page. */}

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
          <MealMark name={meal.name} uri={photoUri(meal)} size="hero" style={styles.hero} />
        </View>

        <View style={styles.sheet}>
          <Text style={styles.name}>{meal.name}</Text>

          {chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((c) => (
                <Chip key={c} label={c} />
              ))}
            </View>
          )}

          {meal.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={eyebrow}>Ingredients</Text>
              <View style={styles.list}>
                {meal.ingredients.map((item, i) => (
                  <View key={`${item}-${i}`} style={styles.listRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {meal.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={eyebrow}>Method</Text>
              <View style={styles.steps}>
                {meal.steps.map((step, i) => (
                  <View key={`${step}-${i}`} style={styles.stepRow}>
                    {/* Numbered because method genuinely is a sequence. */}
                    <Text style={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="solid"
              onPress={() => router.push(`/meal/edit?id=${meal.id}`)}
            />
            <Button label="Delete" variant="danger" onPress={confirmDelete} />
          </View>

          <View style={styles.sheetTail} pointerEvents="none" />
        </View>
      </ScrollView>

      {/* Layer 3: the bar, fixed above the scroll so its buttons stay live and
          the status text always has green behind it, not the scrolling sheet. */}
      <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.round, pressed && styles.roundPressed]}
        >
          <Text style={styles.chevron}>‹</Text>
        </Pressable>

        <Text style={styles.panelTitle}>{CATEGORY_LABEL[meal.category]}</Text>

        <Pressable
          onPress={() => toggleSaved(meal.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: !!meal.saved }}
          accessibilityLabel={meal.saved ? 'Remove from saved' : 'Save for later'}
          style={({ pressed }) => [
            styles.round,
            meal.saved && styles.roundOn,
            pressed && styles.roundPressed,
          ]}
        >
          <Text style={[styles.bookmark, meal.saved && styles.bookmarkOn]}>
            {meal.saved ? '\u2611' : '\u2610'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // One green behind every recipe. The per-meal colour has not gone: it is
  // the circle sitting on it, which is where a colour belongs when it stands
  // for one meal rather than for the screen.
  screen: { flex: 1, backgroundColor: color.kelly },
  // Grows so a short recipe's sheet still reaches the bottom of the screen
  // instead of ending mid-way with green below it.
  scroll: { flexGrow: 1 },

  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: color.kelly,
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    ...eyebrow,
    color: color.ink,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 48, 46, 0.12)',
  },
  roundOn: { backgroundColor: color.ink },
  roundPressed: { backgroundColor: 'rgba(22, 48, 46, 0.22)' },
  chevron: {
    fontFamily: font.body,
    fontSize: 26,
    lineHeight: 30,
    color: color.ink,
  },
  // Saved fills the pill rather than recolouring the mark: the accent is
  // 1.3:1 on this green, so a yolk tick would read as nothing happening —
  // the same trap SAVE_COLORS documents.
  bookmark: { fontSize: 20, lineHeight: 24, color: color.ink },
  bookmarkOn: { color: color.porcelain },

  heroWrap: {
    alignItems: 'center',
    // Claims only the top half; the circle overflows the rest onto the sheet,
    // and zIndex is what puts it on top of the sheet rather than under it.
    height: OVERLAP,
    zIndex: 1,
  },
  hero: { borderWidth: 4, borderColor: color.page },

  sheet: {
    backgroundColor: color.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Begins at the circle's midpoint, and clears its lower half before any
    // text starts.
    paddingTop: OVERLAP + space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    flexGrow: 1,
  },
  // Hangs below the sheet without adding to the scroll height, so the iOS
  // bounce past the end shows more sheet rather than a green gap under it.
  sheetTail: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: color.page,
  },
  name: {
    fontFamily: font.displayBold,
    fontSize: 32,
    lineHeight: 37,
    color: color.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.lg,
  },
  chip: {
    backgroundColor: color.tile,
    borderWidth: 1,
    borderColor: color.edge,
    borderRadius: 999,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  chipText: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: color.slate,
    textTransform: 'uppercase',
  },

  section: { marginTop: space.xxl, gap: space.md },
  list: {
    backgroundColor: color.tile,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.edge,
    padding: space.lg,
    gap: space.md,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.yolk },
  listText: { fontFamily: font.body, fontSize: 16, color: color.ink, flex: 1 },
  steps: { gap: space.lg },
  stepRow: { flexDirection: 'row', gap: space.lg },
  stepNumber: {
    fontFamily: font.monoMedium,
    fontSize: 12,
    color: color.yolk,
    paddingTop: 4,
    width: 22,
  },
  stepText: {
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 25,
    color: color.ink,
    flex: 1,
  },
  actions: { marginTop: space.huge, gap: space.md },

  gone: {
    flex: 1,
    backgroundColor: color.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goneText: { fontFamily: font.body, fontSize: 16, color: color.slate },
});
