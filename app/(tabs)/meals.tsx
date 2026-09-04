import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { SaveMark } from '@/ui/SaveMark';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function MealsScreen() {
  const state = useAppStore();
  const [savedOnly, setSavedOnly] = useState(false);
  const savedCount = state.meals.filter((meal) => meal.saved).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Meals</Text>
          <Pressable
            onPress={() => setSavedOnly((on) => !on)}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityState={{ selected: savedOnly }}
            accessibilityLabel={savedOnly ? 'Show all meals' : 'Show saved meals only'}
          >
            <SaveMark saved={savedOnly} />
          </Pressable>
        </View>
        <Text style={styles.lede}>
          {savedOnly
            ? 'The ones you kept for later. They rotate like everything else.'
            : 'Everything here rotates. Each meal gets its turn before any repeats.'}
        </Text>

        {savedOnly && savedCount === 0 ? (
          <Text style={styles.emptyAll}>
            Nothing saved yet. Open a meal and tap the bookmark to keep it here.
          </Text>
        ) : (
          CATEGORIES.map((category: Category) => {
            const meals = mealsIn(state, category).filter(
              (meal) => !savedOnly || meal.saved,
            );
            return (
              <View key={category} style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={eyebrow}>{CATEGORY_LABEL[category]}</Text>
                  <Text style={styles.count}>{meals.length}</Text>
                </View>

                {meals.length === 0 ? (
                  <Text style={styles.emptyRow}>
                    {savedOnly
                      ? `No ${CATEGORY_LABEL[category].toLowerCase()}s saved.`
                      : `No ${CATEGORY_LABEL[category].toLowerCase()}s yet.`}
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
                          <Text style={styles.rowMeta}>
                            {[
                              meal.prepMinutes ? `${meal.prepMinutes} min` : null,
                              `${meal.ingredients.length} ingredient${
                                meal.ingredients.length === 1 ? '' : 's'
                              }`,
                            ]
                              .filter(Boolean)
                              .join('  ·  ')}
                          </Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {!savedOnly && (
                  <Button
                    label={`Add a ${CATEGORY_LABEL[category].toLowerCase()}`}
                    onPress={() => router.push(`/meal/edit?category=${category}`)}
                    style={styles.add}
                  />
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyAll: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    lineHeight: 22,
    marginTop: space.xxl,
  },
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
  section: { marginTop: space.xxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  count: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.mute,
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
  emptyRow: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    paddingVertical: space.sm,
  },
  add: { marginTop: space.md },
});
