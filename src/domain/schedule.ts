/**
 * Builds the rolling window of local notifications.
 *
 * A daily repeating notification carries fixed text, but the meal changes
 * every day — so instead the app schedules one notification per meal per day
 * and regenerates the whole window whenever anything changes.
 *
 * Pure, like the rest of `domain/`: state and a start date in, a list out.
 */
import { dateKey, mealById, mealsIn } from './cycle';
import { CATEGORIES, CATEGORY_LABEL, type AppState, type Category } from './types';

export type ScheduledNotification = {
  category: Category;
  /** 'YYYY-MM-DD' local. */
  date: string;
  /** 'HH:mm' local. */
  time: string;
  fireAt: Date;
  title: string;
  body: string;
  /** Null when the meal that far ahead cannot be named yet. */
  mealId: string | null;
};

/**
 * Used past the end of the current cycle: the next loop has not been
 * shuffled yet, so no honest meal name exists for that day.
 */
export const GENERIC_BODY = 'Tap to see today’s pick';

export const WINDOW_DAYS = 7;

function atTime(base: Date, dayOffset: number, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export function buildSchedule(
  state: AppState,
  from: Date = new Date(),
  days: number = WINDOW_DAYS,
): ScheduledNotification[] {
  const out: ScheduledNotification[] = [];

  for (const category of CATEGORIES) {
    const { notify, time } = state.settings[category];
    if (!notify) continue;
    if (mealsIn(state, category).length === 0) continue;

    const { order, position } = state.cycles[category];

    for (let day = 0; day < days; day++) {
      const fireAt = atTime(from, day, time);
      // Today's slot is gone once its time has passed.
      if (fireAt.getTime() <= from.getTime()) continue;

      // One meal per day forward through the loop; beyond it, nothing is
      // known, because the next cycle is shuffled only when it begins.
      const meal = mealById(state, order[position + day] ?? null);

      out.push({
        category,
        date: dateKey(fireAt),
        time,
        fireAt,
        title: CATEGORY_LABEL[category],
        body: meal ? meal.name : GENERIC_BODY,
        mealId: meal?.id ?? null,
      });
    }
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
