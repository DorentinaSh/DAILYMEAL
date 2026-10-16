import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES, CATEGORY_LABEL, type Category, type Meal } from '@/domain/types';
import { keptAsMeal, keptMealFor } from '@/search/keep';
import { MIN_QUERY } from '@/search/mealdb';
import { defaultCategory } from '@/search/normalize';
import type { RecipeHit } from '@/search/types';
import { useAppStore } from '@/store/useAppStore';
import { useSearchStore, type SearchStatus } from '@/store/useSearchStore';
import { Button } from '@/ui/Button';
import { ChooseListSheet } from '@/ui/ChooseListSheet';
import { BookmarkIcon } from '@/ui/icons';
import { MealMark } from '@/ui/MealMark';
import { color, font, radius, space } from '@/ui/theme';

/** Long enough that a word is finished, short enough to feel immediate. */
const DEBOUNCE_MS = 350;

/** Between the two columns, and between rows. */
const GRID_GAP = space.lg;

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const status = useSearchStore((s) => s.status);
  const hits = useSearchStore((s) => s.hits);
  const setQuery = useSearchStore((s) => s.setQuery);
  const run = useSearchStore((s) => s.run);
  const meals = useAppStore((s) => s.meals);
  const createMeal = useAppStore((s) => s.createMeal);
  const placeMeal = useAppStore((s) => s.placeMeal);
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  // The recipe the add sheet is open for. Kept after the sheet closes, so its
  // name is still there while it slides away; `adding` is what opens it.
  const [target, setTarget] = useState<{ hit: RecipeHit; meal: Meal | null } | null>(null);
  const [adding, setAdding] = useState(false);

  function add(category: Category) {
    if (!target) return;
    // Saved only already: move that meal in, never a second copy.
    if (target.meal) placeMeal(target.meal.id, category);
    else createMeal(keptAsMeal(target.hit, category, false));
    setAdding(false);
  }

  // Two columns inside the page's side padding, with the gap between them.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - space.xl * 2 - GRID_GAP) / 2;

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
        <Text style={styles.title} accessibilityRole="header">
          Find your meals
        </Text>
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
            // 36pt drawn, 44pt to the thumb.
            hitSlop={4}
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
        // A card's tick and bookmark come from your meals, not from the hits,
        // so the list has to be told that changing them is a reason to redraw.
        extraData={meals}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => {
          const meal = keptMealFor(item, meals);
          return (
            <ResultCard
              hit={item}
              width={cardWidth}
              meal={meal}
              onAdd={() => {
                setTarget({ hit: item, meal });
                setAdding(true);
              }}
              onSave={() =>
                meal ? toggleSaved(meal.id) : createMeal(keptAsMeal(item, null, true))
              }
            />
          );
        }}
        ListEmptyComponent={
          <Empty status={status} query={query} onRetry={() => void run(query)} />
        }
      />

      {target && (
        <ChooseListSheet
          visible={adding}
          name={target.hit.name}
          imageUrl={target.hit.imageUrl}
          suggested={defaultCategory(target.hit.sourceCategory)}
          onChoose={add}
          onClose={() => setAdding(false)}
        />
      )}
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

function RowGap() {
  return <View style={styles.rowGap} />;
}

/** A white plus, drawn so it sits dead centre whatever the font does. */
function Plus() {
  return (
    <View style={styles.glyph} accessible={false}>
      <View style={styles.plusBar} />
      <View style={[styles.plusBar, styles.plusBarUp]} />
    </View>
  );
}

/**
 * The card's save control, drawn the way the reference draws its heart: an
 * outline at rest, filled when on — no pill behind it. Off is slate, which
 * reads at 5.1:1 on the card. On is the green, to match the add button below
 * it: 3.1:1 against the card, just over the 3:1 a state mark needs, and the
 * shape changing from outline to solid says it again. 20pt drawn, 44pt to the
 * thumb.
 */
function Bookmark({
  saved,
  label,
  onPress,
}: {
  saved: boolean;
  label: string;
  onPress: () => void;
}) {
  const tint = saved ? color.leaf : color.slate;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.bookmark, pressed && styles.bookmarkPressed]}
    >
      <BookmarkIcon tint={tint} filled={saved} />
    </Pressable>
  );
}

/** A white tick: two sides of a box, turned. */
function Tick() {
  return (
    <View style={styles.glyph} accessible={false}>
      <View style={styles.tick} />
    </View>
  );
}

/**
 * A recipe as the reference draws its dishes: a grey card, the dish in a
 * circle, and an add button sitting in the corner. The price, rating and time
 * on the reference's cards are left out — the source publishes none of them,
 * and a made-up number would be shown as if it were fact. The ingredient
 * count takes the price's place, because it is real.
 *
 * The bookmark takes the reference's heart's place: it saves the recipe to
 * Saved only, outside every rotation, until it is moved into a list.
 *
 * The card's body, the bookmark and the add button are siblings rather than
 * one inside another: a pressable around a button would fold it into the card
 * for a screen reader, and it could never be reached on its own.
 */
function ResultCard({
  hit,
  width,
  meal,
  onAdd,
  onSave,
}: {
  hit: RecipeHit;
  width: number;
  /** The meal this recipe became, if it is one of yours. */
  meal: Meal | null;
  onAdd: () => void;
  onSave: () => void;
}) {
  const meta = [hit.sourceCategory, hit.area].filter(Boolean).join(' · ');
  const count = hit.ingredients.length;
  // The tick means "in Breakfast or Lunch". Saved only still offers the plus.
  const listed = meal !== null && meal.category !== null;
  const saved = meal?.saved === true;

  return (
    <View style={[styles.card, { width }]}>
      <Pressable
        onPress={() => router.push(`/search/${hit.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${hit.name}, ${meta}`}
        style={({ pressed }) => [styles.cardBody, pressed && styles.cardPressed]}
      >
        <MealMark name={hit.name} uri={hit.imageUrl} size="card" style={styles.dish} />
        <Text style={styles.cardName} numberOfLines={2}>
          {hit.name}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {meta}
        </Text>
        {count > 0 && (
          <Text style={styles.cardCount}>
            {count} ingredient{count === 1 ? '' : 's'}
          </Text>
        )}
      </Pressable>

      <Bookmark
        saved={saved}
        onPress={onSave}
        label={saved ? `Remove ${hit.name} from Saved` : `Save ${hit.name}`}
      />

      <Pressable
        onPress={onAdd}
        disabled={listed}
        // 36pt drawn, 44pt to the thumb.
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={
          listed ? `${hit.name} is in your meals` : `Add ${hit.name} to breakfast or lunch`
        }
        accessibilityState={{ disabled: listed }}
        style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
      >
        {listed ? <Tick /> : <Plus />}
      </Pressable>
    </View>
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
  // Roomier than the other tabs: a headline this size wants air above it,
  // and the field and results each get a clear step down from it.
  head: { paddingHorizontal: space.xl, paddingTop: space.xxl },
  // Poppins at the reference's weight and natural tracking.
  title: {
    fontFamily: font.semibold,
    fontSize: 28,
    color: color.leaf,
  },
  // A soft green well rather than an outlined box: the tint marks the field,
  // so it needs no border.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    paddingLeft: space.lg,
    // The filter button sits inset by this much on every side it touches.
    paddingRight: 8,
    height: 52,
    backgroundColor: color.leafWash,
    borderRadius: radius.lg,
  },
  filter: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.leaf,
  },
  filterPressed: { opacity: 0.8 },
  // White, as in the reference: 3.4:1 on the green, over the 3:1 a control's
  // glyph needs.
  sliders: { width: 16, gap: 4 },
  rail: { height: 6, justifyContent: 'center' },
  railLine: { height: 2, borderRadius: 1, backgroundColor: color.tile },
  // Filled with the green so the rail looks to pass behind the ring, not
  // through.
  knob: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: color.tile,
    backgroundColor: color.leaf,
  },
  // The green, to match the filter button at the other end: 3.1:1 on the
  // wash, just over the 3:1 a meaningful icon needs. The placeholder and the
  // accessibility label are what identify the field all the same, and the
  // placeholder is held to 4.5:1.
  // The box is exactly the drawing's bounds, so the row's centring lines the
  // whole magnifier up with the text: its middle lands on the field's middle,
  // which is where Poppins's capitals are centred at this size (26.0 of 52).
  // Drawn bottom-aligned in a taller box, it sat 2pt below them.
  magnifier: { width: 17, height: 17 },
  lens: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: color.leaf,
  },
  // Centred on the lens's 45° diagonal, 9.5 out from its middle, so it starts
  // just inside the rim and runs straight out from it.
  lensHandle: {
    position: 'absolute',
    top: 10.2,
    left: 12.7,
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: color.leaf,
    transform: [{ rotate: '-45deg' }],
  },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.ink,
    padding: 0,
    // Android pads the line for accents above it, which drops the text below
    // the magnifier; iOS ignores both of these.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clear: { fontFamily: font.regular, fontSize: 22, color: color.mute, lineHeight: 24 },
  list: { padding: space.xl, paddingBottom: space.huge },
  // Cards in a row stretch to the taller one, so a one-line name and a
  // two-line name still end level.
  row: { gap: GRID_GAP },
  rowGap: { height: GRID_GAP },
  card: {
    backgroundColor: color.porcelainWash,
    borderRadius: radius.lg,
  },
  // Fills the card's height, which the row sets to its taller card, so the
  // ingredient count can sit at the foot of both cards in a row.
  cardBody: {
    flex: 1,
    padding: space.md,
    paddingTop: space.lg,
  },
  cardPressed: { opacity: 0.62 },
  dish: { alignSelf: 'center' },
  cardName: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: color.ink,
    marginTop: space.md,
  },
  cardMeta: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.slate,
    marginTop: 2,
  },
  cardCount: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: color.ink,
    // Pushed to the foot of the card, and kept clear of the add button.
    marginTop: 'auto',
    paddingTop: space.md,
    paddingRight: 36,
  },
  // Where the reference's heart sits, in the card's top corner.
  bookmark: { position: 'absolute', top: space.md, right: space.md },
  bookmarkPressed: { opacity: 0.5 },
  // Flush in the corner, so its outer corner is the card's own.
  add: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.leaf,
    borderTopLeftRadius: radius.md,
    borderBottomRightRadius: radius.lg,
  },
  addPressed: { opacity: 0.8 },
  // White on the green, like the filter button's sliders.
  glyph: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  plusBar: {
    position: 'absolute',
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: color.tile,
  },
  plusBarUp: { transform: [{ rotate: '90deg' }] },
  tick: {
    width: 6,
    height: 11,
    marginTop: -3,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.tile,
    transform: [{ rotate: '45deg' }],
  },
  spinner: { marginTop: space.xxl },
  empty: { marginTop: space.lg, gap: space.lg },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
  },
  retry: { alignSelf: 'flex-start' },
});
