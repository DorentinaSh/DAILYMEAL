import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_QUERY } from '@/search/mealdb';
import type { RecipeHit } from '@/search/types';
import { useSearchStore, type SearchStatus } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

/** Long enough that a word is finished, short enough to feel immediate. */
const DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const status = useSearchStore((s) => s.status);
  const hits = useSearchStore((s) => s.hits);
  const setQuery = useSearchStore((s) => s.setQuery);
  const run = useSearchStore((s) => s.run);

  useEffect(() => {
    const timer = setTimeout(() => void run(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, run]);

  // The filter button is drawn ahead of what it does. This is where it gets
  // wired once filters exist; until then a press does nothing.
  function openFilters() {}

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.field}>
          <Magnifier />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Chicken, eggs, pasta…"
            placeholderTextColor={color.placeholder}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search recipes"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clear}>×</Text>
            </Pressable>
          )}
          <Pressable
            onPress={openFilters}
            accessibilityRole="button"
            accessibilityLabel="Filter recipes"
            style={({ pressed }) => [styles.filter, pressed && styles.filterPressed]}
          >
            <Sliders />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={hits}
        keyExtractor={(hit) => hit.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => <ResultCard hit={item} />}
        ListEmptyComponent={
          <Empty status={status} query={query} onRetry={() => void run(query)} />
        }
      />
    </SafeAreaView>
  );
}

/** Drawn, like the tab marks, rather than pulled from an icon set. */
function Magnifier() {
  return (
    <View style={styles.magnifier} accessible={false}>
      <View style={styles.lens} />
      <View style={styles.lensHandle} />
    </View>
  );
}

/** Two slider rails, their knobs at opposite ends. */
function Sliders() {
  return (
    <View style={styles.sliders} accessible={false}>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        <View style={[styles.knob, { left: 2 }]} />
      </View>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        <View style={[styles.knob, { right: 2 }]} />
      </View>
    </View>
  );
}

function ResultCard({ hit }: { hit: RecipeHit }) {
  return (
    <Pressable
      onPress={() => router.push(`/search/${hit.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {hit.imageUrl ? (
        <Image
          source={hit.imageUrl}
          style={styles.thumb}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbBlank]}>
          <Text style={styles.thumbLetter}>{hit.name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.cardText}>
        <Text style={styles.cardName} numberOfLines={2}>
          {hit.name}
        </Text>
        <Text style={styles.cardMeta}>
          {[hit.sourceCategory, hit.area].filter(Boolean).join('  ·  ')}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Empty({
  status,
  query,
  onRetry,
}: {
  status: SearchStatus;
  query: string;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return <ActivityIndicator color={color.ink} style={styles.spinner} />;
  }

  if (status === 'error') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Couldn’t reach the recipe service. Check your connection and try again.
        </Text>
        <Button label="Try again" onPress={onRetry} style={styles.retry} />
      </View>
    );
  }

  if (status === 'done') {
    // An empty list with nothing typed is a browse that came back empty, and
    // "nothing found for ''" would be nonsense.
    const text =
      query.trim().length < MIN_QUERY
        ? 'Nothing to show just now. Type a dish to go looking for it.'
        : `Nothing found for “${query.trim()}”. The recipe catalogue is small — try a plainer word like “chicken” or “rice”.`;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Search for a dish to add it to your meals.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  head: { paddingHorizontal: space.xl, paddingTop: space.xl },
  title: {
    fontFamily: font.displayBold,
    fontSize: 28,
    color: color.ink,
    letterSpacing: -0.4,
  },
  // A soft green well rather than an outlined box: the tint marks the field,
  // so it needs no border.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
    paddingLeft: space.lg,
    // The filter button sits inset by this much on every side it touches.
    paddingRight: 6,
    height: 52,
    backgroundColor: color.kellyWash,
    borderRadius: radius.lg,
  },
  filter: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.kelly,
  },
  filterPressed: { opacity: 0.8 },
  // White, as in the reference, by choice: it measures 2.5:1 on kelly, under
  // the 3:1 a control's glyph is meant to clear, where ink would be 5.6:1.
  // Kept white on purpose; the number is here so it is a known trade.
  sliders: { width: 18, gap: 5 },
  rail: { height: 6, justifyContent: 'center' },
  railLine: { height: 2, borderRadius: 1, backgroundColor: color.tile },
  // Filled with kelly so the rail looks to pass behind the ring, not through.
  knob: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: color.tile,
    backgroundColor: color.kelly,
  },
  // Kelly, to match the filter button at the other end. On the wash that is
  // 2.3:1, under the 3:1 a meaningful icon needs — acceptable only because
  // this one is decoration: the placeholder and the accessibility label are
  // what identify the field, and the placeholder is held to 4.5:1.
  magnifier: { flexDirection: 'row', alignItems: 'flex-end', height: 18 },
  lens: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: color.kelly,
  },
  lensHandle: {
    width: 2,
    height: 7,
    borderRadius: 1,
    marginLeft: -2,
    backgroundColor: color.kelly,
    transform: [{ rotate: '-45deg' }],
  },
  input: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 16,
    color: color.ink,
    padding: 0,
  },
  clear: { fontFamily: font.body, fontSize: 22, color: color.mute, lineHeight: 24 },
  list: { padding: space.xl, paddingTop: space.lg, paddingBottom: space.huge },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    backgroundColor: color.tile,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.edge,
  },
  cardPressed: { opacity: 0.62 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: color.porcelain },
  thumbBlank: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { fontFamily: font.displayBold, fontSize: 24, color: color.slate },
  cardText: { flex: 1, gap: space.xs },
  cardName: { fontFamily: font.bodyMedium, fontSize: 16, color: color.ink },
  cardMeta: { ...eyebrow, fontSize: 10 },
  chevron: { fontFamily: font.body, fontSize: 22, color: color.mute },
  spinner: { marginTop: space.xxl },
  empty: { marginTop: space.lg, gap: space.lg },
  emptyText: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
  },
  retry: { alignSelf: 'flex-start' },
});
