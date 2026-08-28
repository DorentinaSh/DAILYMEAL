import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { mealById } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

/** Blank lines are dropped so a stray return does not become an empty step. */
const toLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export default function MealEditScreen() {
  const params = useLocalSearchParams<{ id?: string; category?: string }>();
  const existing = useAppStore((s) => mealById(s, params.id ?? null));
  const createMeal = useAppStore((s) => s.createMeal);
  const saveMeal = useAppStore((s) => s.saveMeal);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<Category>(
    existing?.category ?? ((params.category as Category) ?? 'breakfast'),
  );
  const [ingredients, setIngredients] = useState(existing?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(existing?.steps.join('\n') ?? '');
  const [prep, setPrep] = useState(
    existing?.prepMinutes != null ? String(existing.prepMinutes) : '',
  );

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  function save() {
    if (!canSave) return;
    const parsedPrep = Number.parseInt(prep, 10);
    const fields = {
      name: trimmedName,
      category,
      ingredients: toLines(ingredients),
      steps: toLines(steps),
      prepMinutes: Number.isFinite(parsedPrep) && parsedPrep > 0 ? parsedPrep : null,
    };

    if (existing) {
      saveMeal({ ...existing, ...fields });
    } else {
      createMeal(fields);
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{existing ? 'Edit meal' : 'New meal'}</Text>

        <View style={styles.field}>
          <Text style={eyebrow}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Overnight oats"
            placeholderTextColor={color.mute}
            style={styles.input}
            autoFocus={!existing}
          />
        </View>

        <View style={styles.field}>
          <Text style={eyebrow}>Served as</Text>
          <View style={styles.segment}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {CATEGORY_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={eyebrow}>Ingredients</Text>
          <Text style={styles.hint}>One per line.</Text>
          <TextInput
            value={ingredients}
            onChangeText={setIngredients}
            placeholder={'rolled oats\nmilk\nhoney'}
            placeholderTextColor={color.mute}
            style={[styles.input, styles.area]}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={eyebrow}>Method</Text>
          <Text style={styles.hint}>One step per line.</Text>
          <TextInput
            value={steps}
            onChangeText={setSteps}
            placeholder={'Stir everything together\nLeave overnight'}
            placeholderTextColor={color.mute}
            style={[styles.input, styles.area]}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={eyebrow}>Prep time</Text>
          <Text style={styles.hint}>Minutes. Leave blank if it varies.</Text>
          <TextInput
            value={prep}
            onChangeText={setPrep}
            placeholder="5"
            placeholderTextColor={color.mute}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label={existing ? 'Save changes' : 'Add to rotation'}
            variant="solid"
            onPress={save}
            disabled={!canSave}
          />
          <Button label="Cancel" variant="quiet" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.xl },
  title: {
    fontFamily: font.displayBold,
    fontSize: 30,
    color: color.ink,
    letterSpacing: -0.5,
  },
  field: { gap: space.sm },
  hint: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.mute,
    marginTop: -2,
  },
  input: {
    backgroundColor: color.tile,
    borderWidth: 1,
    borderColor: color.edge,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: font.body,
    fontSize: 16,
    color: color.ink,
    minHeight: 48,
  },
  area: { minHeight: 132, lineHeight: 24 },
  segment: {
    flexDirection: 'row',
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: color.ink },
  segmentText: {
    fontFamily: font.bodyMedium,
    fontSize: 15,
    color: color.slate,
  },
  segmentTextActive: { color: color.tile },
  actions: { gap: space.sm, marginTop: space.sm },
});
