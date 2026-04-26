import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConfessionEntry } from '../types/ai';
import type { Task } from '../types/task';

const KEY = 'TASKS';

export interface PersistedTaskState {
  tasks: Task[];
  completedTasks: Task[];
  missedTasks: Task[];
  confessions?: ConfessionEntry[];
}

/**
 * Persists the full day task state. Key is "TASKS" per spec.
 */
export async function saveTasksToStorage(
  data: PersistedTaskState
): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function loadTasksFromStorage(): Promise<PersistedTaskState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as PersistedTaskState;
  } catch {
    return null;
  }
}
