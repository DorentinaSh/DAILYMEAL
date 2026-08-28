/**
 * The only file that talks to expo-notifications.
 *
 * What gets scheduled is decided by `domain/schedule.ts`; this module just
 * clears the previous window and books whatever that returns.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { buildSchedule } from '@/domain/schedule';
import type { AppState } from '@/domain/types';

export const MEAL_NOTIFICATION = 'dailymeal.meal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Asks only when the user turns notifications on — a permission prompt fired
 * at launch, before they have seen the app, is usually denied.
 */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/**
 * Serialises rebuilds. Two skips in quick succession would otherwise have one
 * run's cancel-all wipe the notifications the other had just booked.
 */
let pending: Promise<void> = Promise.resolve();

/**
 * Rebuilds the whole window. Called after every change that could alter what
 * gets announced: launch, a skip, a meal edit, a settings change.
 */
export function syncNotifications(state: AppState): Promise<void> {
  pending = pending.then(() => rebuild(state)).catch(() => {});
  return pending;
}

async function rebuild(state: AppState): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const anyEnabled = Object.values(state.settings).some((s) => s.notify);
  if (!anyEnabled) return;
  if (!(await hasPermission())) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Meal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  for (const entry of buildSchedule(state)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body: entry.body,
        data: { kind: MEAL_NOTIFICATION, mealId: entry.mealId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: entry.fireAt,
        channelId: Platform.OS === 'android' ? 'meals' : undefined,
      },
    });
  }
}
