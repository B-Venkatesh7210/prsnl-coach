import type { Task } from './task';

export interface CoachResponse {
  feedback: string;
  tomorrow_adjustments: string[];
}

/**
 * Data passed to the coach feedback API. Uses current-day task and confession state.
 */
export type CoachContextData = {
  completionPercentage: number;
  completedTasks: Task[];
  missedTasks: Task[];
  confessions: { type: string; details: string; severity: string }[];
};
