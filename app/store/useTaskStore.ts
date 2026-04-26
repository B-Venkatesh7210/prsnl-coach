import { create } from 'zustand';
import type { Task } from '../types/task';

type TaskStoreState = {
  tasks: Task[];
  completedTasks: Task[];
  missedTasks: Task[];
  setTasks: (tasks: Task[]) => void;
  completeTask: (taskId: string) => void;
  missTask: (taskId: string) => void;
  resetDay: () => void;
};

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  completedTasks: [],
  missedTasks: [],

  setTasks: (tasks) => set({ tasks }),

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
