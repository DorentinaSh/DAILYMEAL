import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canSkip as canSkipFor, mealById, mealsIn } from '@/domain/cycle';
import { greetingFor, orderOfDay } from '@/domain/day';
import { CATEGORIES, type Category } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { DayMealRow } from '@/ui/DayMealRow';
import { FoodDoodles } from '@/ui/FoodDoodles';
import { SpotlightMeal } from '@/ui/SpotlightMeal';
import { color, eyebrow, font, space } from '@/ui/theme';

/** The clock, a minute at a time: enough to move the first meal on as the day goes. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const sub = RNAppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, []);
  return now;
}

export default function TodayScreen() {
  const state = useAppStore();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();

  // The reminder times order the day whether or not the reminders are on:
  // they are when you eat, and the default ones are a fair guess at it.
  const times = Object.fromEntries(
    CATEGORIES.map((category) => [category, state.settings[category].time]),
  ) as Record<Category, string>;
  const order = orderOfDay(times, now);
  const first = order.first;

  const mealFor = (category: Category) => mealById(state, state.today[category].mealId);
  const shownTime = (category: Category) =>
    state.settings[category].notify ? state.settings[category].time : null;
  const open = (category: Category) => {
    const meal = mealFor(category);
    router.push(meal ? `/meal/${meal.id}` : `/meal/edit?category=${category}`);
  };

  const total = mealsIn(state, first).length;
  const skipped = state.today[first].skippedToday.length;
  const groups = [
    { title: 'Earlier today', categories: order.earlier },
    { title: 'Later today', categories: order.later },
  ].filter((group) => group.categories.length > 0);

  return (
    <View style={styles.screen}>
      {/* White on the green, as on the recipe screen; every other tab is
          white, so it goes back to dark the moment this one is left. */}
      <StatusBar style={focused ? 'light' : 'dark'} />
      <FoodDoodles />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting} accessibilityRole="header">
          {greetingFor(now)}
        </Text>

        <SpotlightMeal
          category={first}
          meal={mealFor(first)}
          time={shownTime(first)}
          ahead={order.ahead}
          total={total}
          position={state.cycles[first].position}
          canSkip={canSkipFor(state, first)}
          exhausted={total > 1 && skipped >= total - 1}
          onSkip={() => state.skipMeal(first)}
          onOpen={() => open(first)}
          onAddFirst={() => open(first)}
        >
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={eyebrow}>{group.title}</Text>
              {group.categories.map((category) => (
                <DayMealRow
                  key={category}
                  category={category}
                  meal={mealFor(category)}
                  time={shownTime(category)}
                  onPress={() => open(category)}
                />
              ))}
            </View>
          ))}
        </SpotlightMeal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The recipe screen's green and its food drawings, behind the greeting and
  // the top of the first meal's dish.
  screen: { flex: 1, backgroundColor: color.leaf },
  // Grows so the sheet reaches the tab bar however little is on it.
  scroll: { flexGrow: 1 },
  // White on the green at title size: 3.4:1, clear of the 3:1 large type asks.
  greeting: {
    fontFamily: font.semibold,
    fontSize: 32,
    lineHeight: 40,
    color: color.page,
    paddingHorizontal: space.xl,
  },
  group: {
    marginTop: space.xl,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.edge,
    gap: space.md,
  },
});
