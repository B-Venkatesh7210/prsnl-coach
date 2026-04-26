import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { Task } from '../types/task';

dayjs.extend(customParseFormat);

const TIME_FMT = 'h:mm A';

function timeSortValue(time: string): number {
  const d = dayjs(time, TIME_FMT, true);
  if (!d.isValid()) return 0;
  return d.hour() * 60 + d.minute();
}

const routineDefs: { title: string; time: string; type: Task['type'] }[] = [
  { title: 'Wake up champ', time: '8:30 AM', type: 'wake' },
  { title: 'Pre-workout meal', time: '9:00 AM', type: 'preworkout' },
  { title: 'Workout', time: '9:20 AM', type: 'workout' },
  { title: 'Milk + Muesli', time: '12:00 PM', type: 'meal' },
  { title: 'Lunch', time: '1:15 PM', type: 'meal' },
  { title: 'Snack', time: '5:30 PM', type: 'meal' },
  { title: 'Dinner', time: '9:00 PM', type: 'meal' },
  { title: 'Prep for next day', time: '9:45 PM', type: 'custom' },
];

const waterTimes: string[] = [
  '8:30 AM',
  '10:30 AM',
  '12:30 PM',
  '3:00 PM',
  '6:00 PM',
  '8:30 PM',
];

/**
 * Returns today's full routine: scheduled tasks plus water reminders, ordered by time.
 */
export function generateDailyTasks(): Task[] {
  const base: Task[] = routineDefs.map((def, i) => ({
    id: `routine-${i}-${def.time.replace(/\s/g, '')}`,
    title: def.title,
    time: def.time,
    type: def.type,
    status: 'pending' as const,
  }));

  const water: Task[] = waterTimes.map((time, i) => ({
    id: `water-${i}-${time.replace(/\s/g, '')}`,
    title: 'Drink 500ml water',
    time,
    type: 'water' as const,
    status: 'pending' as const,
  }));

  return [...base, ...water].sort((a, b) => {
    const d = timeSortValue(a.time) - timeSortValue(b.time);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}
