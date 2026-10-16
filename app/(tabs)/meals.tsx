import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { ChipTabs, type ChipTab } from '@/ui/ChipTabs';
import { photoUri } from '@/photos/files';
import { MealMark } from '@/ui/MealMark';
import { color, font, radius, space } from '@/ui/theme';

/** One list at a time: a category's rotation, or everything kept for later. */
type Tab = Category | 'saved';

/**
 * On the saved list a meal is out of its category's company, so the category
 * leads the line — that's the fact you lose by flattening the two lists into
 * one, and it costs a word to keep. A meal in no list says so instead.
 */
function metaLine(meal: Meal, withCategory: boolean): string {
  const count = meal.ingredients.length;
  return [
    withCategory ? (meal.category ? CATEGORY_LABEL[meal.category] : 'Saved only') : null,
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
  // Today's pick in each category, so a row can show which meal is on now.
  const servedToday = new Set(
    CATEGORIES.map((category: Category) => state.today[category].mealId).filter(
      (id): id is string => id !== null,
    ),
  );
  const meals = tab === 'saved' ? saved : mealsIn(state, tab);

  const tabs: ChipTab<Tab>[] = [
    ...CATEGORIES.map((category: Category) => ({
      value: category,
      label: CATEGORY_LABEL[category],
      count: mealsIn(state, category).length,
    })),
    { value: 'saved', label: 'Saved', count: saved.length },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Meals</Text>
          {tab !== 'saved' && (
            <Pressable
              onPress={() => router.push(`/meal/edit?category=${tab}`)}
              accessibilityRole="button"
              accessibilityLabel={`Add a meal to ${CATEGORY_LABEL[tab]}`}
              hitSlop={space.sm}
              style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
            >
              <Text style={styles.addText}>+ Add</Text>
            </Pressable>
          )}
        </View>
        <ChipTabs items={tabs} value={tab} onChange={setTab} style={styles.tabs} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {meals.length === 0 ? (
          <Text style={styles.empty}>
            {tab === 'saved'
              ? 'Nothing saved yet. Tap the bookmark on a meal or a recipe in Search to ' +
                'keep it here.'
              : `No ${CATEGORY_LABEL[tab].toLowerCase()}s yet. Tap Add to make one.`}
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
                <MealMark
                  name={meal.name}
                  uri={photoUri(meal)}
                  today={servedToday.has(meal.id)}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{meal.name}</Text>
                  <Text style={styles.rowMeta}>{metaLine(meal, tab === 'saved')}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  // The header sits outside the ScrollView so the tabs stay put while the
  // list under them runs long.
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  content: { paddingHorizontal: space.xl, paddingBottom: space.huge },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 28,
    color: color.leaf,
    letterSpacing: -0.4,
  },
  // A link, not a chip: green type and no box, so it never reads as a fourth
  // list next to the ones below it.
  add: { minHeight: 44, justifyContent: 'center' },
  addPressed: { opacity: 0.6 },
  addText: {
    fontFamily: font.headline,
    fontSize: 15,
    lineHeight: 22,
    color: color.leaf,
  },
  tabs: { marginTop: space.xl },
  empty: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
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
});
