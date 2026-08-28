import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/ui/Button';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

export default function MealsScreen() {
  const state = useAppStore();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meals</Text>
        <Text style={styles.lede}>
          Everything here rotates. Each meal gets its turn before any repeats.
        </Text>

        {CATEGORIES.map((category: Category) => {
          const meals = mealsIn(state, category);
          return (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={eyebrow}>{CATEGORY_LABEL[category]}</Text>
                <Text style={styles.count}>{meals.length}</Text>
              </View>

              {meals.length === 0 ? (
                <Text style={styles.emptyRow}>
                  No {CATEGORY_LABEL[category].toLowerCase()}s yet.
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

              <Button
                label={`Add a ${CATEGORY_LABEL[category].toLowerCase()}`}
                onPress={() => router.push(`/meal/edit?category=${category}`)}
                style={styles.add}
              />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
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
