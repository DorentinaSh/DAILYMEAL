/**
 * What each list's tile says in the add sheet: real facts about the list
 * you are about to add to, so the choice is made knowing what is there.
 */
import type { CategorySettings } from '@/domain/types';

export function describeList(
  count: number,
  settings: CategorySettings,
): { count: string; reminder: string | null } {
  return {
    count: count === 0 ? 'No meals yet' : `${count} meal${count === 1 ? '' : 's'}`,
    // Only when on: a time with reminders off promises a notification that
    // never comes.
    reminder: settings.notify ? `Reminder ${settings.time}` : null,
  };
}
