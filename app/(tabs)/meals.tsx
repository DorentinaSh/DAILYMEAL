import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { ChipTabs, type ChipTab } from '@/ui/ChipTabs';
import { photoUri } from '@/photos/files';
import { ClockIcon, LeafIcon } from '@/ui/icons';
import { MealMark } from '@/ui/MealMark';
import { color, font, space } from '@/ui/theme';

/** One list at a time: a category's rotation, or everything kept for later. */
type Tab = Category | 'saved';

type Fact = { icon: 'time' | 'ingredients' | null; text: string };

/**
 * The line under a meal's name, each fact beside its own small mark, as the
 * list reference sets its time and rating. On the saved list a meal is out of
 * its category's company, so the category leads the line — that's the fact
 * you lose by flattening the two lists into one, and it costs a word to keep.
 * A meal in no list says so instead.
 */
function factsFor(meal: Meal, withCategory: boolean): Fact[] {
  const count = meal.ingredients.length;
  const facts: Fact[] = [];
  if (withCategory) {
    facts.push({ icon: null, text: meal.category ? CATEGORY_LABEL[meal.category] : 'Saved only' });
  }
  if (meal.prepMinutes) facts.push({ icon: 'time', text: `${meal.prepMinutes} min` });
  facts.push({ icon: 'ingredients', text: `${count} ingredient${count === 1 ? '' : 's'}` });
  return facts;
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
                  size="row"
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={2}>
                    {meal.name}
                  </Text>
                  <View style={styles.facts}>
                    {factsFor(meal, tab === 'saved').map((fact, i) => (
                      <Fragment key={fact.text}>
                        {i > 0 && <View style={styles.dot} />}
                        <View style={styles.fact}>
                          {fact.icon === 'time' && <ClockIcon tint={color.ink} />}
                          {fact.icon === 'ingredients' && <LeafIcon size={16} />}
                          <Text style={styles.factText}>{fact.text}</Text>
                        </View>
                      </Fragment>
                    ))}
                  </View>
                </View>
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
    fontFamily: font.semibold,
    fontSize: 28,
    color: color.leaf,
  },
  // A link, not a chip: green type and no box, so it never reads as a fourth
  // list next to the ones below it.
  add: { minHeight: 44, justifyContent: 'center' },
  addPressed: { opacity: 0.6 },
  addText: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: color.leaf,
  },
  tabs: { marginTop: space.xl },
  empty: {
    fontFamily: font.regular,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    paddingTop: space.sm,
  },
  list: { gap: space.sm },
  // The list reference's row, a card of its own with no border and no
  // chevron: the whole card is the button. Grey on the white page, the way
  // the search cards sit, where the reference sets white cards on a grey page.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.md,
    borderRadius: 20,
    backgroundColor: color.porcelainWash,
  },
  rowPressed: { backgroundColor: color.porcelain },
  rowText: { flex: 1, gap: space.xs },
  rowName: {
    fontFamily: font.regular,
    fontSize: 17,
    lineHeight: 24,
    color: color.ink,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.sm,
    rowGap: 2,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
  },
  // A mark, not a word: mute, as the reference's pale dot is.
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.mute },
});
