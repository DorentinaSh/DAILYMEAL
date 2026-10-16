import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { mealById } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { deletePhoto, photoUri, savePhoto } from '@/photos/files';
import { chooseFromLibrary, takePhoto, type PickResult } from '@/photos/pick';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { MealMark } from '@/ui/MealMark';
import { Segment } from '@/ui/Segment';
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
  // A saved-only meal keeps its empty list through an edit. Moving it into a
  // rotation is the meal page's job, so the picker is not offered — and this
  // has to be checked by hand: the `??` below reads null as missing and would
  // quietly file it under Breakfast, which no type error would catch.
  const savedOnly = existing?.category === null;
  const [category, setCategory] = useState<Category>(
    existing?.category ?? ((params.category as Category) ?? 'breakfast'),
  );
  const [ingredients, setIngredients] = useState(existing?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(existing?.steps.join('\n') ?? '');
  const [prep, setPrep] = useState(
    existing?.prepMinutes != null ? String(existing.prepMinutes) : '',
  );
  /**
   * undefined: untouched. A string: a pick sitting in the cache, not yet copied
   * anywhere. null: removed. Nothing is written to disk until Save, so walking
   * away from this screen leaves no file behind.
   */
  const [picked, setPicked] = useState<string | null | undefined>(undefined);

  const shownUri =
    picked !== undefined
      ? picked ?? existing?.imageUrl ?? null
      : existing
        ? photoUri(existing)
        : null;

  // Only your own photo can be removed; the source's is what removing falls
  // back to, so there would be nothing to fall back to twice.
  const canRemove = picked ? true : picked === undefined && !!existing?.photoFile;

  async function accept(pending: Promise<PickResult>) {
    const result = await pending;
    if (result.kind === 'picked') {
      setPicked(result.uri);
    } else if (result.kind === 'denied') {
      Alert.alert(
        'Permission needed',
        'DAILYMEAL needs access to add a photo that way. You can allow it in Settings.',
      );
    }
  }

  function offerSources() {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take photo', onPress: () => void accept(takePhoto()) },
      { text: 'Choose from library', onPress: () => void accept(chooseFromLibrary()) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  function save() {
    if (!canSave) return;
    const parsedPrep = Number.parseInt(prep, 10);

    // The copy out of the cache happens here, once, and the old file goes only
    // after the new one has landed.
    let photoFile = existing?.photoFile ?? null;
    if (picked) {
      photoFile = savePhoto(picked);
      deletePhoto(existing?.photoFile);
    } else if (picked === null) {
      deletePhoto(existing?.photoFile);
      photoFile = null;
    }

    const fields = {
      name: trimmedName,
      category: savedOnly ? null : category,
      ingredients: toLines(ingredients),
      steps: toLines(steps),
      prepMinutes: Number.isFinite(parsedPrep) && parsedPrep > 0 ? parsedPrep : null,
      photoFile,
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
          <View style={styles.nameRow}>
            <MealMark name={name} uri={shownUri} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Overnight oats"
              placeholderTextColor={color.placeholder}
              style={[styles.input, styles.nameInput]}
              autoFocus={!existing}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={eyebrow}>Photo</Text>
          <Text style={styles.hint}>
            {shownUri
              ? 'Shown wherever this meal appears.'
              : 'Optional. Without one the meal wears its initial.'}
          </Text>
          <View style={styles.photoRow}>
            <Button
              label={shownUri ? 'Change photo' : 'Add a photo'}
              onPress={offerSources}
              style={styles.grow}
            />
            {canRemove && (
              <Button label="Remove" variant="quiet" onPress={() => setPicked(null)} />
            )}
          </View>
        </View>

        {!savedOnly && (
          <View style={styles.field}>
            <Text style={eyebrow}>Served as</Text>
            <Segment
              items={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
              value={category}
              onChange={setCategory}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={eyebrow}>Ingredients</Text>
          <Text style={styles.hint}>One per line.</Text>
          <TextInput
            value={ingredients}
            onChangeText={setIngredients}
            placeholder={'rolled oats\nmilk\nhoney'}
            placeholderTextColor={color.placeholder}
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
            placeholderTextColor={color.placeholder}
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
            placeholderTextColor={color.placeholder}
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
  screen: { flex: 1, backgroundColor: color.page },
  content: { padding: space.xl, paddingBottom: space.huge, gap: space.xl },
  title: {
    fontFamily: font.semibold,
    fontSize: 30,
    color: color.leaf,
  },
  field: { gap: space.sm },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.slate,
    marginTop: -2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  nameInput: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  input: {
    backgroundColor: color.tile,
    borderWidth: 1,
    borderColor: color.edge,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.ink,
    minHeight: 48,
  },
  area: { minHeight: 132, lineHeight: 24 },
  actions: { gap: space.sm, marginTop: space.sm },
});
