export interface DietPlan {
  pre_workout: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
}

export interface AIResponse {
  diet: DietPlan;
  adjustments: string[];
}

/**
 * Stored confession entry (Zustand + optional persistence).
 */
export interface ConfessionEntry {
  id: string;
  type: string;
  details: string;
  severity: string;
  createdAt: string;
}

export type ContextData = {
  lastMeals: string[];
  confessions: { type: string; details: string; severity: string }[];
  completionPercentage: number;
};
