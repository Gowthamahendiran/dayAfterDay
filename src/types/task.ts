import { Timestamp } from 'firebase/firestore';

export type Weekday = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type TaskCategory = 'Personal' | 'Work' | 'Health' | 'Learning';

export interface Task {
  id: string;
  userId: string;
  title: string;
  daysOfWeek: Weekday[];
  category: TaskCategory;
  isActive: boolean;
  startDate?: string; // YYYY-MM-DD starting date
  createdAt?: Timestamp | Date | any;
  updatedAt?: Timestamp | Date | any;
}

export interface TaskCompletion {
  id: string;
  userId: string;
  taskId: string;
  date: string; // YYYY-MM-DD local calendar date
  completed: boolean;
  completedAt?: Timestamp | Date | any;
}

export interface TaskWithCompletion extends Task {
  completed: boolean;
}

export interface DayDateItem {
  dayName: Weekday;
  dayLabel: string; // "Sun", "Mon", etc.
  dateNumber: number; // 24, 25, etc.
  fullDateString: string; // YYYY-MM-DD
  isToday: boolean;
  isPast?: boolean;
  isFuture?: boolean;
}
