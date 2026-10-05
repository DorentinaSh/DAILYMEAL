import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { keptAsMeal, keptMealFor } from '@/search/keep';
import { defaultCategory } from '@/search/normalize';
import { useAppStore } from '@/store/useAppStore';
import { useSearchStore } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { SaveButton } from '@/ui/SaveButton';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function RecipePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // The list already fetched the whole recipe, so opening it costs no request.
  const hit = useSearchStore((s) => s.hits.find((candidate) => candidate.id === id) ?? null);
  const createMeal = useAppStore((s) => s.createMeal);
  const placeMeal = useAppStore((s) => s.placeMeal);
  const meals = useAppStore((s) => s.meals);

  const [category, setCategory] = useState<Category>(
    hit ? defaultCategory(hit.sourceCategory) : 'lunch',
  );
  // Decided here, applied when the meal is actually created below.
  const [keepForLater, setKeepForLater] = useState(false);

  if (!hit) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This recipe is no longer loaded.</Text>
        <Button label="Back to search" onPress={() => router.back()} />
      </View>
    );
  }

  function save() {
    if (!hit) return;
    // Bookmarked from its card already: move that meal in, keeping its
    // bookmark, rather than adding a second copy beside it.
    const savedOnly = keptMealFor(hit, meals);
    if (savedOnly && savedOnly.category === null) {
      placeMeal(savedOnly.id, category);
    } else {
      createMeal(keptAsMeal(hit, category, keepForLater));
    }
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {hit.imageUrl && (
        <Image source={hit.imageUrl} style={styles.photo} contentFit="cover" transition={180} />
      )}

      <View style={styles.head}>
        <Text style={eyebrow}>
          {[hit.sourceCategory, hit.area].filter(Boolean).join('  ·  ')}
        </Text>
        <SaveButton
          saved={keepForLater}
          onPress={() => setKeepForLater((on) => !on)}
          accessibilityLabel={keepForLater ? 'Do not keep for later' : 'Keep for later'}
        />
      </View>
      <Text style={styles.name}>{hit.name}</Text>

      <View style={styles.pickRow}>
        {CATEGORIES.map((option) => {
          const active = option === category;
          return (
            <Pressable
              key={option}
              onPress={() => setCategory(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.pick, active && styles.pickActive]}
            >
              <Text style={[styles.pickLabel, active && styles.pickLabelActive]}>
                {CATEGORY_LABEL[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hit.ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Ingredients</Text>
          {hit.ingredients.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {hit.steps.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Steps</Text>
          {hit.steps.map((step, i) => (
            <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.line}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        label={`Add to ${CATEGORY_LABEL[category].toLowerCase()}`}
        onPress={save}
        variant="solid"
        style={styles.save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gone: {
    flex: 1,
    backgroundColor: color.page,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  goneText: { fontFamily: font.body, fontSize: 15, color: color.slate },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    // Holds the photo's place while it loads; white would vanish on the page.
    backgroundColor: color.porcelain,
    marginBottom: space.sm,
  },
  name: {
    fontFamily: font.displayBold,
    fontSize: 32,
    color: color.ink,
    letterSpacing: -0.6,
    marginTop: space.xs,
  },
  pickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  pick: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
    backgroundColor: color.tile,
  },
  pickActive: { backgroundColor: color.ink, borderColor: color.ink },
  pickLabel: { fontFamily: font.bodyMedium, fontSize: 14, color: color.slate },
  pickLabelActive: { color: color.tile },
  section: { gap: space.sm, marginTop: space.lg },
  line: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: space.md },
  stepNumber: {
    fontFamily: font.monoMedium,
    fontSize: 13,
    color: color.slate,
    lineHeight: 22,
    width: 18,
  },
  save: { marginTop: space.xl },
});
