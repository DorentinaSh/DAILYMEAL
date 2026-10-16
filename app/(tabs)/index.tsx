import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canSkip as canSkipFor, mealById, mealsIn } from '@/domain/cycle';
import { CATEGORIES } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { MealCard } from '@/ui/MealCard';
import { color, font, space } from '@/ui/theme';

function longDate(d: Date): string {
  return d
    .toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();
}

export default function TodayScreen() {
  const state = useAppStore();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{longDate(new Date())}</Text>
        <Text style={styles.title}>Today</Text>

        <View style={styles.cards}>
          {CATEGORIES.map((category) => {
            const cycle = state.cycles[category];
            const total = mealsIn(state, category).length;
            const meal = mealById(state, state.today[category].mealId);
            const skipped = state.today[category].skippedToday.length;

            return (
              <MealCard
                key={category}
                category={category}
                meal={meal}
                time={state.settings[category].time}
                notify={state.settings[category].notify}
                total={total}
                position={cycle.position}
                canSkip={canSkipFor(state, category)}
                exhausted={total > 1 && skipped >= total - 1}
                onSkip={() => state.skipMeal(category)}
                onOpen={() => meal && router.push(`/meal/${meal.id}`)}
                onAddFirst={() => router.push(`/meal/edit?category=${category}`)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  content: {
    padding: space.xl,
    paddingBottom: space.huge,
  },
  date: {
    fontFamily: font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: color.slate,
  },
  title: {
    // The one 40pt title in the app. Today is the front door, it carries no
    // list to get past, and the date above it is real information — so the
    // display face is spent here. The other three tabs label a utility screen
    // at 28 and do not need to shout it.
    fontFamily: font.displayBold,
    fontSize: 40,
    color: color.leaf,
    letterSpacing: -0.8,
    marginTop: space.xs,
  },
  cards: {
    marginTop: space.xl,
    gap: space.lg,
  },
});
