export type TaskStatus = 'pending' | 'completed' | 'missed';

export interface Task {
  id: string;
  title: string;
  time: string;
  type:
    | 'wake'
    | 'preworkout'
    | 'workout'
    | 'meal'
    | 'water'
    | 'custom';
  status: TaskStatus;
}
