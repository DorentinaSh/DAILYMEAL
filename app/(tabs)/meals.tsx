import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { Segment, type SegmentItem } from '@/ui/Segment';
import { color, font, radius, space } from '@/ui/theme';

/** One list at a time: a category's rotation, or everything kept for later. */
type Tab = Category | 'saved';

/**
 * On the saved list a meal is out of its category's company, so the category
 * leads the line — that's the fact you lose by flattening the two lists into
 * one, and it costs a word to keep.
 */
function metaLine(meal: Meal, withCategory: boolean): string {
  const count = meal.ingredients.length;
  return [
    withCategory ? CATEGORY_LABEL[meal.category] : null,
    meal.prepMinutes ? `${meal.prepMinutes} min` : null,
    `${count} ingredient${count === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
}

export default function MealsScreen() {
  const state = useAppStore();
  const [tab, setTab] = useState<Tab>(CATEGORIES[0]);

  const saved = state.meals.filter((meal) => meal.saved);
  const meals = tab === 'saved' ? saved : mealsIn(state, tab);

  const tabs: SegmentItem<Tab>[] = [
    ...CATEGORIES.map((category: Category) => ({
      value: category,
      label: CATEGORY_LABEL[category],
      badge: mealsIn(state, category).length,
    })),
    { value: 'saved', label: 'Saved', badge: saved.length },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meals</Text>
        <Text style={styles.lede}>
          {tab === 'saved'
            ? 'The ones you kept for later. They rotate like everything else.'
            : 'Everything here rotates. Each meal gets its turn before any repeats.'}
        </Text>
        <Segment items={tabs} value={tab} onChange={setTab} as="tabs" style={styles.tabs} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {meals.length === 0 ? (
          <Text style={styles.empty}>
            {tab === 'saved'
              ? 'Nothing saved yet. Open a meal and tap the bookmark to keep it here.'
              : `No ${CATEGORY_LABEL[tab].toLowerCase()}s yet. Add one below.`}
          </Text>
        ) : (
          <View style={styles.list}>
            {meals.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => router.push(`/meal/${meal.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{meal.name}</Text>
                  <Text style={styles.rowMeta}>{metaLine(meal, tab === 'saved')}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        {tab !== 'saved' && (
          <Button
            label={`Add a ${CATEGORY_LABEL[tab].toLowerCase()}`}
            onPress={() => router.push(`/meal/edit?category=${tab}`)}
            style={styles.add}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  // The header sits outside the ScrollView so the tabs stay put while the
  // list under them runs long.
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  content: { paddingHorizontal: space.xl, paddingBottom: space.huge },
  title: {
    fontFamily: font.displayBold,
    fontSize: 40,
    color: color.ink,
    letterSpacing: -0.8,
  },
  lede: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    marginTop: space.sm,
  },
  tabs: { marginTop: space.lg },
  empty: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    lineHeight: 22,
    paddingTop: space.sm,
  },
  list: {
    backgroundColor: color.tile,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.edge,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.edge,
    gap: space.md,
  },
  rowPressed: { backgroundColor: color.porcelain },
  rowText: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: font.bodyMedium,
    fontSize: 17,
    color: color.ink,
  },
  rowMeta: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: {
    fontFamily: font.body,
    fontSize: 22,
    color: color.mute,
  },
  add: { marginTop: space.lg },
});
