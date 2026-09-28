import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mealById } from '@/domain/cycle';
import { CATEGORY_LABEL } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { glazeFor } from '@/ui/glaze';
import { MealMark } from '@/ui/MealMark';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

/** The circle overlaps the panel by this much, so it straddles the seam. */
const HERO = 168;
const OVERLAP = HERO / 2;

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

  // The panel wears the meal's own glaze, so opening a meal is the most
  // colourful thing the app does and every meal's screen is its own.
  const panel = glazeFor(meal.name);

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
      {/* The panel is a deep glaze, so the clock and battery must go pale. */}
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.panel, { backgroundColor: panel, paddingTop: insets.top + space.sm }]}>
          <View style={styles.panelBar}>
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
              style={({ pressed }) => [styles.round, pressed && styles.roundPressed]}
            >
              <Text style={[styles.bookmark, meal.saved && styles.bookmarkOn]}>
                {meal.saved ? '☑' : '☐'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroWrap}>
            <MealMark name={meal.name} uri={photoUri(meal)} size="hero" style={styles.hero} />
          </View>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  scroll: { paddingBottom: space.huge },

  panel: {
    paddingHorizontal: space.xl,
    // Room for the half of the circle that hangs below the panel.
    paddingBottom: OVERLAP + space.lg,
  },
  panelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    ...eyebrow,
    color: color.porcelain,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 239, 238, 0.16)',
  },
  roundPressed: { backgroundColor: 'rgba(235, 239, 238, 0.32)' },
  chevron: {
    fontFamily: font.body,
    fontSize: 26,
    lineHeight: 30,
    color: color.porcelain,
  },
  bookmark: { fontSize: 20, lineHeight: 24, color: color.porcelain },
  bookmarkOn: { color: color.yolk },

  heroWrap: { alignItems: 'center', marginTop: space.lg, height: OVERLAP },
  hero: { borderWidth: 4, borderColor: color.porcelain },

  sheet: {
    backgroundColor: color.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -OVERLAP,
    paddingTop: OVERLAP + space.lg,
    paddingHorizontal: space.xl,
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
    backgroundColor: color.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goneText: { fontFamily: font.body, fontSize: 16, color: color.slate },
});
