import { create } from 'zustand';
import type { ConfessionEntry } from '../types/ai';
import type { Task } from '../types/task';

type ConfessionInput = {
  type: string;
  details: string;
  severity: string;
};

type TaskStoreState = {
  tasks: Task[];
  completedTasks: Task[];
  missedTasks: Task[];
  confessions: ConfessionEntry[];
  setTasks: (tasks: Task[]) => void;
  addConfession: (c: ConfessionInput) => void;
  completeTask: (taskId: string) => void;
  missTask: (taskId: string) => void;
  resetDay: () => void;
};

function newId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  completedTasks: [],
  missedTasks: [],
  confessions: [],

  setTasks: (tasks) => set({ tasks }),

  addConfession: (payload) =>
    set((state) => {
      const entry: ConfessionEntry = {
        id: newId(),
        type: payload.type,
        details: payload.details,
        severity: payload.severity,
        createdAt: new Date().toISOString(),
      };
      return { confessions: [entry, ...state.confessions] };
    }),

  completeTask: (taskId) =>
    set((state) => {
      const found = state.tasks.find((t) => t.id === taskId);
      if (!found) return state;
      const done: Task = { ...found, status: 'completed' };
      return {
        tasks: state.tasks.filter((t) => t.id !== taskId),
        completedTasks: [...state.completedTasks, done],
        missedTasks: state.missedTasks,
      };
    }),

  missTask: (taskId) =>
    set((state) => {
      const found = state.tasks.find((t) => t.id === taskId);
      if (!found) return state;
      const lost: Task = { ...found, status: 'missed' };
      return {
        tasks: state.tasks.filter((t) => t.id !== taskId),
        completedTasks: state.completedTasks,
        missedTasks: [...state.missedTasks, lost],
      };
    }),

  resetDay: () =>
    set({
      tasks: [],
      completedTasks: [],
      missedTasks: [],
    }),
}));
