export interface WeeklyReport {
  summary: string;
  improvements: string[];
  next_strategy: string;
}

export interface GroceryItem {
  name: string;
  quantity: string;
}

/** One row in the persisted grocery checklist */
export interface GroceryListRow {
  id: string;
  name: string;
  quantity: string;
  bought: boolean;
}

export type DayStat = {
  completion: number;
  isLeave: boolean;
  /** Completed task count for that day, when known */
  tasksCompleted?: number;
};

export type WeeklyReportContext = {
  last7Days: { date: string; completion: number; isLeave: boolean }[];
  confessions: {
    type: string;
    details: string;
    severity: string;
    createdAt: string;
  }[];
  weightKg: number | null;
};

/** Wrapper for API JSON: grocery list must be an object for json_object mode */
export type GroceryListJSON = { items: GroceryItem[] };
