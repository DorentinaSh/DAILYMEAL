/**
 * Everything kept for later, newest first — recipes found in search and never
 * added, and meals already in the rotation, in one list. Which of the two an
 * entry is shows in its meta line rather than splitting the list in two.
 */
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_LABEL, type SavedRecipe } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { color, font, radius, space } from '@/ui/theme';

export default function SavedScreen() {
  const saved = useAppStore((s) => s.saved);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={saved}
        keyExtractor={(recipe) => recipe.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.title}>Saved</Text>
            <Text style={styles.lede}>
              Kept for later. Nothing here is in the rotation until you add it.
            </Text>
          </View>
        }
        renderItem={({ item }) => <Row recipe={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing saved yet. Tap the bookmark on any recipe to keep it here.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function Row({ recipe }: { recipe: SavedRecipe }) {
  const count = recipe.ingredients.length;
  const meta = recipe.mealId
    ? `In meals  ·  ${CATEGORY_LABEL[recipe.category]}`
    : `Saved recipe  ·  ${count} ingredient${count === 1 ? '' : 's'}`;

  return (
    <Pressable
      onPress={() => router.push(`/saved/${recipe.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{recipe.name}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
  head: { marginBottom: space.xxl },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
  },
  rowPressed: { opacity: 0.62 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: font.bodyMedium, fontSize: 17, color: color.ink },
  rowMeta: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: { fontFamily: font.body, fontSize: 22, color: color.mute },
  empty: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.mute,
    lineHeight: 22,
  },
});
