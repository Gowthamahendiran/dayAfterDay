import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task, TaskCategory, Weekday, TaskWithCompletion } from '../types/task';
import { formatLocalDate } from '../utils/dateUtils';

const TASKS_COLLECTION = 'tasks';
const COMPLETIONS_COLLECTION = 'taskCompletions';

/**
 * Creates a new recurring task in Firestore
 */
export async function createTask(
  userId: string,
  title: string,
  daysOfWeek: Weekday[],
  category: TaskCategory
): Promise<Task> {
  if (!userId) throw new Error('User authentication is required to create a task.');

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error('Task title cannot be empty.');
  if (trimmedTitle.length > 50) throw new Error('Task title cannot exceed 50 characters.');
  if (!daysOfWeek || daysOfWeek.length === 0) throw new Error('Please select at least one day.');
  if (!category) throw new Error('Please select a category.');

  const todayStr = formatLocalDate(new Date());
  const tasksRef = collection(db, TASKS_COLLECTION);
  const newDocRef = doc(tasksRef);

  const taskData = {
    userId,
    title: trimmedTitle,
    daysOfWeek,
    category,
    isActive: true,
    startDate: todayStr, // Task takes effect starting from creation date
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newDocRef, taskData);

  return {
    id: newDocRef.id,
    ...taskData,
  };
}

/**
 * Fetches all active tasks for a user scheduled on a given weekday that have started on or before dateStr
 */
export async function getTasksForWeekday(
  userId: string,
  weekday: Weekday,
  dateStr?: string
): Promise<Task[]> {
  if (!userId) return [];

  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(
    tasksRef,
    where('userId', '==', userId),
    where('daysOfWeek', 'array-contains', weekday)
  );

  const querySnapshot = await getDocs(q);
  const tasks: Task[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.isActive !== false) {
      let taskStartDate = data.startDate;
      if (!taskStartDate && data.createdAt) {
        try {
          const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          taskStartDate = formatLocalDate(d);
        } catch {
          taskStartDate = '2000-01-01';
        }
      }
      if (!taskStartDate) {
        taskStartDate = '2000-01-01';
      }

      // If viewing a past date prior to task creation, do not show the task
      if (dateStr && dateStr < taskStartDate) {
        return;
      }

      tasks.push({
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        daysOfWeek: data.daysOfWeek || [],
        category: data.category,
        isActive: data.isActive ?? true,
        startDate: taskStartDate,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }
  });

  return tasks;
}

/**
 * Fetches all active tasks owned by a user across all days
 */
export async function getAllActiveTasks(userId: string): Promise<Task[]> {
  if (!userId) return [];

  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(tasksRef, where('userId', '==', userId));

  const querySnapshot = await getDocs(q);
  const tasks: Task[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.isActive !== false) {
      tasks.push({
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        daysOfWeek: data.daysOfWeek || [],
        category: data.category,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }
  });

  return tasks;
}

/**
 * Fetches completion statuses for a user on a given date (YYYY-MM-DD)
 */
export async function getCompletionsForDate(
  userId: string,
  date: string
): Promise<Record<string, boolean>> {
  if (!userId || !date) return {};

  const completionsRef = collection(db, COMPLETIONS_COLLECTION);
  const q = query(
    completionsRef,
    where('userId', '==', userId),
    where('date', '==', date)
  );

  const querySnapshot = await getDocs(q);
  const completionMap: Record<string, boolean> = {};

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.taskId) {
      completionMap[data.taskId] = !!data.completed;
    }
  });

  return completionMap;
}

/**
 * Toggles or sets task completion for a specific calendar date (YYYY-MM-DD)
 * Uses deterministic document ID: `${taskId}_${date}`
 */
export async function setTaskCompletion(
  userId: string,
  taskId: string,
  date: string,
  completed: boolean
): Promise<void> {
  if (!userId || !taskId || !date) return;

  const docId = `${taskId}_${date}`;
  const docRef = doc(db, COMPLETIONS_COLLECTION, docId);

  await setDoc(docRef, {
    userId,
    taskId,
    date,
    completed,
    completedAt: serverTimestamp(),
  });
}

/**
 * Soft deletes an active task by marking isActive = false
 */
export async function deactivateTask(userId: string, taskId: string): Promise<void> {
  if (!userId || !taskId) return;
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Combines tasks scheduled for a weekday with their completion status for a specific date
 */
export async function getTasksWithCompletions(
  userId: string,
  weekday: Weekday,
  dateStr: string
): Promise<TaskWithCompletion[]> {
  const [tasks, completions] = await Promise.all([
    getTasksForWeekday(userId, weekday, dateStr),
    getCompletionsForDate(userId, dateStr),
  ]);

  return tasks.map((task) => ({
    ...task,
    completed: completions[task.id] === true,
  }));
}

/**
 * Clears previously seeded sample tasks if present for this user
 */
export async function clearInitialSeededTasks(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const SEEDED_TITLES = [
      'Morning Workout',
      'Read a Book',
      'Drink Water',
      'Work on Project',
      'Plan Tomorrow',
    ];

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (SEEDED_TITLES.includes(data.title)) {
        deletePromises.push(deleteDoc(doc(db, TASKS_COLLECTION, docSnap.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn('Note on clearing seeded tasks:', err);
  }
}
