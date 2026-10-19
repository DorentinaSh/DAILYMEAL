/**
 * One of the day's other meals, under the first: a row like a Meals list
 * card, with its dish as a small circle. It opens the recipe, or the editor
 * when that list is still empty.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { photoUri } from '@/photos/files';
import { EmptyPlate } from './EmptyPlate';
import { ChevronRightIcon } from './icons';
import { MealMark } from './MealMark';
import { color, font, space } from './theme';

type Props = {
  category: Category;
  meal: Meal | null;
  /** Null while its reminder is off. */
  time: string | null;
  onPress: () => void;
};

export function DayMealRow({ category, meal, time, onPress }: Props) {
  const label = CATEGORY_LABEL[category];
  const name = meal ? meal.name : `No ${label.toLowerCase()} yet`;
  const detail = meal
    ? [label, time, meal.prepMinutes ? `${meal.prepMinutes} min` : null]
        .filter(Boolean)
        .join(' · ')
    : 'Tap to add one';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${detail}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {meal ? (
        <MealMark name={meal.name} uri={photoUri(meal)} size="later" />
      ) : (
        <EmptyPlate size={56} />
      )}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <ChevronRightIcon tint={color.slate} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: space.md,
    borderRadius: 20,
    backgroundColor: color.porcelainWash,
  },
  pressed: { backgroundColor: color.porcelain },
  text: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    fontFamily: font.medium,
    fontSize: 17,
    lineHeight: 24,
    color: color.ink,
  },
  detail: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
  },
});
