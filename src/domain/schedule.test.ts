import { addMeal, createEmptyState, skip } from './cycle';
import { buildSchedule, GENERIC_BODY } from './schedule';
import type { AppState, Category, Meal } from './types';

function meal(id: string, category: Category = 'breakfast'): Meal {
  return {
    id,
    name: `Meal ${id}`,
    category,
    ingredients: [],
    steps: [],
    prepMinutes: null,
  };
}

/** State with an explicit cycle order so expected meal names are nameable. */
function stateWith(
  ids: string[],
  position = 0,
  opts: { category?: Category; notify?: boolean; time?: string } = {},
): AppState {
  const category = opts.category ?? 'breakfast';
  const base = createEmptyState(new Date(2026, 7, 24, 6, 0));
  return {
    ...base,
    meals: ids.map((id) => meal(id, category)),
    cycles: { ...base.cycles, [category]: { order: [...ids], position } },
    today: {
      ...base.today,
      [category]: { date: '2026-08-24', mealId: ids[position] ?? null, skippedToday: [] },
    },
    settings: {
      ...base.settings,
      [category]: { notify: opts.notify ?? true, time: opts.time ?? '07:30' },
    },
  };
}

const sixAm = new Date(2026, 7, 24, 6, 0);

describe('buildSchedule', () => {
  it('returns nothing when notifications are off', () => {
    const s = stateWith(['a', 'b'], 0, { notify: false });
    expect(buildSchedule(s, sixAm)).toEqual([]);
  });

  it('returns nothing for a category with no meals', () => {
    const s = createEmptyState(sixAm);
    s.settings.breakfast.notify = true;
    expect(buildSchedule(s, sixAm)).toEqual([]);
  });

  it('names today’s meal in the first entry', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const [first] = buildSchedule(s, sixAm);
    expect(first.date).toBe('2026-08-24');
    expect(first.title).toBe('Breakfast');
    expect(first.body).toBe('Meal a');
    expect(first.mealId).toBe('a');
  });

  it('projects the days ahead from the current cycle', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const bodies = buildSchedule(s, sixAm, 3).map((e) => e.body);
    expect(bodies).toEqual(['Meal a', 'Meal b', 'Meal c']);
  });

  it('advances the date by one day per entry', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const dates = buildSchedule(s, sixAm, 3).map((e) => e.date);
    expect(dates).toEqual(['2026-08-24', '2026-08-25', '2026-08-26']);
  });

  it('falls back to generic text past the end of the cycle', () => {
    // Only two meals are known ahead; the rest of the window cannot be named
    // because the next cycle has not been shuffled yet.
    const s = stateWith(['a', 'b'], 0);
    const entries = buildSchedule(s, sixAm, 4);
    expect(entries.map((e) => e.body)).toEqual([
      'Meal a',
      'Meal b',
      GENERIC_BODY,
      GENERIC_BODY,
    ]);
    expect(entries[2].mealId).toBeNull();
  });

  it('omits today when its time has already passed', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { time: '07:30' });
    const nineAm = new Date(2026, 7, 24, 9, 0);
    const entries = buildSchedule(s, nineAm, 3);
    expect(entries[0].date).toBe('2026-08-25');
    expect(entries[0].body).toBe('Meal b');
  });

  it('keeps today when its time is still ahead', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { time: '07:30' });
    const entries = buildSchedule(s, sixAm, 3);
    expect(entries[0].date).toBe('2026-08-24');
  });

  it('fires at the configured local time', () => {
    const s = stateWith(['a', 'b', 'c'], 0, { time: '07:45' });
    const [first] = buildSchedule(s, sixAm);
    expect(first.fireAt.getHours()).toBe(7);
    expect(first.fireAt.getMinutes()).toBe(45);
    expect(first.fireAt.getDate()).toBe(24);
  });

  it('reflects a skip made today', () => {
    let s = stateWith(['a', 'b', 'c'], 0);
    s = skip(s, 'breakfast', () => 0);
    const [first] = buildSchedule(s, sixAm);
    expect(first.body).toBe('Meal b');
  });

  it('covers both categories, ordered by fire time', () => {
    let s = createEmptyState(sixAm);
    s = addMeal(s, meal('a', 'breakfast'), () => 0);
    s = addMeal(s, meal('x', 'lunch'), () => 0);
    s.settings.breakfast = { notify: true, time: '07:30' };
    s.settings.lunch = { notify: true, time: '11:30' };

    const entries = buildSchedule(s, sixAm, 2);
    expect(entries.map((e) => `${e.date} ${e.title}`)).toEqual([
      '2026-08-24 Breakfast',
      '2026-08-24 Lunch',
      '2026-08-25 Breakfast',
      '2026-08-25 Lunch',
    ]);
  });

  it('produces one entry per day per enabled category', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    expect(buildSchedule(s, sixAm, 7)).toHaveLength(7);
  });

  it('does not mutate the state it reads', () => {
    const s = stateWith(['a', 'b', 'c'], 0);
    const snapshot = JSON.stringify(s);
    buildSchedule(s, sixAm, 7);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
