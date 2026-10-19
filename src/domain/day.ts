/**
 * Where the day stands: which meal Today puts first, what it says above it,
 * and the times Settings offers with one tap.
 *
 * Pure, like the rest of `domain/`: times and a clock in, an answer out.
 */
import { CATEGORIES, type Category } from './types';

const DAY = 24 * 60;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timeOf(minutes: number): string {
  const wrapped = ((minutes % DAY) + DAY) % DAY;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export type DayOrder = {
  /** The meal Today shows large. */
  first: Category;
  /** Its time is still to come, which is when "up next" is true. */
  ahead: boolean;
  /** The rest of the day, in time order, either side of it. */
  earlier: Category[];
  later: Category[];
};

/**
 * The meal to put first is the one whose time is nearest the clock. Before the
 * first meal that is the first, after the last it is the last, and between two
 * it changes hands halfway — so breakfast stays first for a while after its
 * reminder fires instead of giving way to lunch that same minute.
 */
export function orderOfDay(times: Record<Category, string>, now: Date): DayOrder {
  // Stable on ties, so two meals at one time keep the order they are listed in.
  const sorted = CATEGORIES.map((category, i) => ({
    category,
    at: minutesOf(times[category]),
    i,
  }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ category, at }) => ({ category, at }));

  const clock = now.getHours() * 60 + now.getMinutes();
  let index = 0;
  for (let i = 1; i < sorted.length; i++) {
    const before = sorted[i - 1].at;
    const next = sorted[i].at;
    if (next > before && clock - before >= next - clock) index = i;
  }

  return {
    first: sorted[index].category,
    ahead: sorted[index].at > clock,
    earlier: sorted.slice(0, index).map((s) => s.category),
    later: sorted.slice(index + 1).map((s) => s.category),
  };
}

/** Half an hour either side of a time, for the chips under a reminder. */
export function nearbyTimes(time: string): [string, string, string] {
  const at = minutesOf(time);
  return [timeOf(at - 30), timeOf(at), timeOf(at + 30)];
}
