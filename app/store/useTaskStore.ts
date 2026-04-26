import { create } from 'zustand';
import type { ConfessionEntry, DietPlan } from '../types/ai';
import type { DayStat, GroceryItem, GroceryListRow, WeeklyReport } from '../types/weekly';
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
  lockIn: boolean;
  tomorrowAdjustments: string[];
  dailyStats: Record<string, DayStat>;
  lastDiet: DietPlan | null;
  groceryList: GroceryListRow[];
  currentWeightKg: number | null;
  /** True after currentWeightKg changes until user refreshes the diet or dismisses. */
  dietRecheckAfterWeight: boolean;
  lastWeeklyReport: WeeklyReport | null;

  setTasks: (tasks: Task[]) => void;
  addConfession: (c: ConfessionInput) => void;
  setLockIn: (value: boolean) => void;
  setTomorrowAdjustments: (items: string[]) => void;
  setCompletion: (date: string, completion: number, tasksCompleted?: number) => void;
  setLeave: (date: string) => void;
  removeLeave: (date: string) => void;
  setLastDiet: (diet: DietPlan | null) => void;
  setGroceryList: (list: GroceryListRow[]) => void;
  importGroceryFromAI: (items: GroceryItem[]) => void;
  toggleGroceryBought: (id: string) => void;
  setCurrentWeight: (kg: number | null) => void;
  clearDietRecheckAfterWeight: () => void;
  setLastWeeklyReport: (r: WeeklyReport | null) => void;

  completeTask: (taskId: string) => void;
  missTask: (taskId: string) => void;
  resetDay: () => void;
};

function newId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowId(): string {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  completedTasks: [],
  missedTasks: [],
  confessions: [],
  lockIn: false,
  tomorrowAdjustments: [],
  dailyStats: {},
  lastDiet: null,
  groceryList: [],
  currentWeightKg: null,
  dietRecheckAfterWeight: false,
  lastWeeklyReport: null,

  setTasks: (tasks) => set({ tasks }),

  setLockIn: (value) => set({ lockIn: value }),

  setTomorrowAdjustments: (items) => set({ tomorrowAdjustments: items }),

  setCompletion: (date, completion, tasksCompleted) =>
    set((state) => {
      const prev = state.dailyStats[date] ?? { completion: 0, isLeave: false };
      const next: DayStat = {
        ...prev,
        completion: Math.max(0, Math.min(100, Math.round(completion))),
        isLeave: false,
        ...(typeof tasksCompleted === 'number' ? { tasksCompleted } : {}),
      };
      return { dailyStats: { ...state.dailyStats, [date]: next } };
    }),

  setLeave: (date) =>
    set((state) => ({
      dailyStats: {
        ...state.dailyStats,
        [date]: {
          completion: 0,
          isLeave: true,
          tasksCompleted: 0,
        },
      },
    })),

  removeLeave: (date) =>
    set((state) => {
      const p = state.dailyStats[date];
      if (!p || !p.isLeave) return state;
      return {
        dailyStats: {
          ...state.dailyStats,
          [date]: { ...p, isLeave: false },
        },
      };
    }),

  setLastDiet: (diet) => set({ lastDiet: diet }),

  setGroceryList: (list) => set({ groceryList: list }),

  importGroceryFromAI: (items) =>
    set({
      groceryList: items.map((g) => ({
        id: rowId(),
        name: g.name,
        quantity: g.quantity,
        bought: false,
      })),
    }),

  toggleGroceryBought: (id) =>
    set((state) => ({
      groceryList: state.groceryList.map((r) =>
        r.id === id ? { ...r, bought: !r.bought } : r
      ),
    })),

  setCurrentWeight: (kg) =>
    set((state) => {
      const prev = state.currentWeightKg;
      const a = prev;
      const b = kg;
      const same =
        (a == null && b == null) ||
        (typeof a === 'number' &&
          typeof b === 'number' &&
          Math.abs(a - b) < 0.01);
      return {
        currentWeightKg: kg,
        dietRecheckAfterWeight: same
          ? state.dietRecheckAfterWeight
          : true,
      };
    }),

  clearDietRecheckAfterWeight: () => set({ dietRecheckAfterWeight: false }),

  setLastWeeklyReport: (r) => set({ lastWeeklyReport: r }),

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
