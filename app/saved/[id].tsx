/**
 * One kept recipe. Unlinked, it offers the same pair the search preview does —
 * a category and an add button — because it is the same decision, just taken
 * later. Linked, that decision is already made, so it offers the meal instead.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { savedById } from '@/domain/saved';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { RecipeBody } from '@/ui/RecipeBody';
import { SaveButton } from '@/ui/SaveButton';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function SavedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useAppStore((s) => savedById(s, id ?? null));
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);
  const addSavedToMeals = useAppStore((s) => s.addSavedToMeals);

  const [category, setCategory] = useState<Category>(recipe?.category ?? 'lunch');

  if (!recipe) {
    return (
      <View style={styles.gone}>
        <Text style={styles.goneText}>This recipe is no longer saved.</Text>
        <Button label="Back to saved" onPress={() => router.back()} />
      </View>
    );
  }

  function remove() {
    if (!recipe) return;
    unsaveRecipe(recipe.id);
    router.back();
  }

  function addToMeals() {
    if (!recipe) return;
    addSavedToMeals(recipe.id, category);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {recipe.imageUrl && (
        <Image
          source={recipe.imageUrl}
          style={styles.photo}
          contentFit="cover"
          transition={180}
        />
      )}

      <View style={styles.head}>
        <Text style={eyebrow}>
          {recipe.mealId ? 'In meals' : 'Saved recipe'}
        </Text>
        <SaveButton
          saved
          onPress={remove}
          accessibilityLabel="Remove from saved"
        />
      </View>
      <Text style={styles.name}>{recipe.name}</Text>

      {recipe.mealId ? (
        <Button
          label={`Open in ${CATEGORY_LABEL[recipe.category].toLowerCase()}`}
          onPress={() => router.push(`/meal/${recipe.mealId}`)}
          style={styles.action}
        />
      ) : (
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
      )}

      <RecipeBody ingredients={recipe.ingredients} steps={recipe.steps} />

      {!recipe.mealId && (
        <Button
          label={`Add to ${CATEGORY_LABEL[category].toLowerCase()}`}
          onPress={addToMeals}
          variant="solid"
          style={styles.add}
        />
      )}
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
  action: { alignSelf: 'flex-start', marginTop: space.sm },
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
  add: { marginTop: space.xl },
});
