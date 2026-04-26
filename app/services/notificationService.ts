import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { NotificationTriggerInput } from 'expo-notifications';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { Task } from '../types/task';

dayjs.extend(customParseFormat);

const TIME_12 = 'h:mm A';
const TIME_24 = 'H:mm';

let handlerConfigured = false;

function ensureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Parses task time (e.g. "8:30 AM" or "14:00" / "14:30" as HH:mm) to 24h hour + minute.
 */
export function parseTaskTimeToClock(timeStr: string): { hour: number; minute: number } {
  let d = dayjs(timeStr, TIME_12, true);
  if (!d.isValid()) {
    d = dayjs(timeStr, TIME_24, true);
  }
  if (!d.isValid()) {
    return { hour: 0, minute: 0 };
  }
  return { hour: d.hour(), minute: d.minute() };
}

/**
 * Next local {@link Date} at the given clock time.
 * If that time already passed today → tomorrow (per spec).
 */
export function getNextTriggerDateForClock(
  hour: number,
  minute: number
): Date {
  const now = dayjs();
  let next = now
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  if (next.isBefore(now)) {
    next = next.add(1, 'day');
  }
  return next.toDate();
}

function buildNotificationBody(task: Task): string {
  if (task.type === 'water') {
    return 'Drink 500ml water 💧 Stay sharp.';
  }
  switch (task.type) {
    case 'wake':
      return 'Wake up champ 💪 No excuses.';
    case 'preworkout':
      return 'Fuel up. Pre-workout now.';
    case 'workout':
      return 'Go for workout 🔥 No excuses today.';
    case 'custom':
      return 'Prepare tomorrow. Winners plan ahead.';
    case 'meal': {
      const t = task.title.toLowerCase();
      if (t.includes('muesli') || t.includes('milk')) {
        return "Milk + Muesli NOW 🥛 Don't skip.";
      }
      if (t.includes('lunch')) {
        return 'Eat clean. High protein lunch time.';
      }
      if (t.includes('snack')) {
        return "Snack smart. Don't ruin progress.";
      }
      if (t.includes('dinner')) {
        return 'Final meal. Keep it clean.';
      }
      return 'Eat clean. Stay on track.';
    }
    default:
      return task.title;
  }
}

/**
 * Asks the user for notification permission. Returns true if alerts may be shown.
 * Denied / undetermined is handled without throwing.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  ensureNotificationHandler();

  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GrindMode',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
      });
    } catch {
      // channel may already exist; continue
    }
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      status = ask.status;
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Clears all scheduled local notifications. Call before re-scheduling to avoid duplicates.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * Schedules a daily repeating local notification for each given task, at the task's time.
 * Uses `cancelAllNotifications` at the start of a sync flow, not here, to allow composition.
 */
export async function scheduleDailyNotifications(tasks: Task[]): Promise<void> {
  ensureNotificationHandler();

  if (Platform.OS === 'web') {
    return;
  }

  if (!Device.isDevice) {
    if (__DEV__) {
      // eslint-disable-next-line no-console -- Dev-only note for simulators
      console.warn(
        'GrindMode: local daily notifications are best verified on a physical device.'
      );
    }
  }

  for (const task of tasks) {
    const { hour, minute } = parseTaskTimeToClock(task.time);
    const body = buildNotificationBody(task);

    const trigger: NotificationTriggerInput = {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    };

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: 'GrindMode',
          body,
          data: { taskId: task.id, type: task.type },
          sound: 'default',
        },
        trigger,
      });
    } catch {
      // skip individual failures (invalid trigger on some environments)
    }
  }
}
