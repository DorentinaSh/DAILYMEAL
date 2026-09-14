import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mealById } from '@/domain/cycle';
import { savedForMeal } from '@/domain/saved';
import { CATEGORY_LABEL } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { SaveButton } from '@/ui/SaveButton';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useAppStore((s) => mealById(s, id ?? null));
  const removeMeal = useAppStore((s) => s.removeMeal);
  const savedRecipe = useAppStore((s) => (id ? savedForMeal(s, id) : null));
  const saveRecipeFromMeal = useAppStore((s) => s.saveRecipeFromMeal);
  const unsaveRecipe = useAppStore((s) => s.unsaveRecipe);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={eyebrow}>{CATEGORY_LABEL[meal.category]}</Text>
        <SaveButton
          saved={!!savedRecipe}
          onPress={() => {
            if (!meal) return;
            if (savedRecipe) unsaveRecipe(savedRecipe.id);
            else saveRecipeFromMeal(meal);
          }}
          accessibilityLabel={savedRecipe ? 'Remove from saved' : 'Save for later'}
        />
      </View>
      <Text style={styles.name}>{meal.name}</Text>
      {meal.prepMinutes ? (
        <Text style={styles.meta}>{meal.prepMinutes} min</Text>
      ) : null}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: {
    fontFamily: font.displayBold,
    fontSize: 36,
    lineHeight: 41,
    color: color.ink,
    letterSpacing: -0.6,
    marginTop: space.sm,
  },
  meta: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 0.6,
    color: color.slate,
    textTransform: 'uppercase',
    marginTop: space.sm,
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
