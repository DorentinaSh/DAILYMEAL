import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { savedForSource } from '@/domain/saved';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { defaultCategory } from '@/search/normalize';
import { useAppStore } from '@/store/useAppStore';
import { useSearchStore } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { RecipeBody } from '@/ui/RecipeBody';
import { SaveButton } from '@/ui/SaveButton';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function RecipePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // The list already fetched the whole recipe, so opening it costs no request.
  const hit = useSearchStore((s) => s.hits.find((candidate) => candidate.id === id) ?? null);
  const createMeal = useAppStore((s) => s.createMeal);

  const [category, setCategory] = useState<Category>(
    hit ? defaultCategory(hit.sourceCategory) : 'lunch',
  );
  // Saving is its own decision now, taken the moment the bookmark is tapped
  // rather than banked until a meal gets created.
  const savedRecipe = useAppStore((s) => (hit ? savedForSource(s, hit.id) : null));
  const saveRecipeFromHit = useAppStore((s) => s.saveRecipeFromHit);
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);

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
    createMeal({
      name: hit.name,
      category,
      ingredients: hit.ingredients,
      steps: hit.steps,
      // The source doesn't publish a prep time; it stays yours to fill in.
      prepMinutes: null,
    });
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
          saved={!!savedRecipe}
          onPress={() => {
            if (!hit) return;
            if (savedRecipe) unsaveRecipe(savedRecipe.id);
            else saveRecipeFromHit(hit, category);
          }}
          accessibilityLabel={savedRecipe ? 'Remove from saved' : 'Save for later'}
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

      <RecipeBody ingredients={hit.ingredients} steps={hit.steps} />

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
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gone: {
    flex: 1,
    backgroundColor: color.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  goneText: { fontFamily: font.body, fontSize: 15, color: color.mute },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: color.tile,
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
  save: { marginTop: space.xl },
});
