import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Task, TaskCategory, Weekday, TaskWithCompletion } from '../types/task';
import { formatLocalDate } from '../utils/dateUtils';

const TASKS_COLLECTION = 'tasks';
const COMPLETIONS_COLLECTION = 'taskCompletions';

/**
 * Validates that Firebase Auth has confirmed the user's session before querying Firestore.
 * Returns the guaranteed, authenticated user's UID (auth.currentUser.uid).
 */
function assertAuthenticatedUser(userId: string): string {
  if (!userId) {
    throw new Error('User ID is required to execute task operations.');
  }
  const currentAuth = auth.currentUser;
  if (!currentAuth) {
    console.warn('[taskService] Assertion failed: auth.currentUser is null. Cannot query Firestore.');
    throw new Error('Missing or insufficient permissions: User is not authenticated.');
  }
  if (currentAuth.uid !== userId) {
    console.warn(`[taskService] Assertion failed: UID mismatch. auth.currentUser.uid=${currentAuth.uid}, requested userId=${userId}`);
    throw new Error('Missing or insufficient permissions: User ID mismatch.');
  }
  return currentAuth.uid;
}

/**
 * Creates a new recurring task in Firestore
 */
export async function createTask(
  userId: string,
  title: string,
  daysOfWeek: Weekday[],
  category: TaskCategory
): Promise<Task> {
  const authUid = assertAuthenticatedUser(userId);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error('Task title cannot be empty.');
  if (trimmedTitle.length > 50) throw new Error('Task title cannot exceed 50 characters.');
  if (!daysOfWeek || daysOfWeek.length === 0) throw new Error('Please select at least one day.');
  if (!category) throw new Error('Please select a category.');

  const todayStr = formatLocalDate(new Date());
  const tasksRef = collection(db, TASKS_COLLECTION);
  const newDocRef = doc(tasksRef);

  const taskData = {
    userId: authUid,
    title: trimmedTitle,
    daysOfWeek,
    category,
    isActive: true,
    startDate: todayStr, // Task takes effect starting from creation date
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log(`[taskService] Creating new task for UID ${authUid}: "${trimmedTitle}" with days: [${daysOfWeek.join(', ')}]`);
  await setDoc(newDocRef, taskData);
  console.log(`[taskService] Task created successfully with ID: ${newDocRef.id}`);

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
  const authUid = assertAuthenticatedUser(userId);

  console.log(`[taskService] Querying tasks for UID: ${authUid}, weekday: ${weekday}, date: ${dateStr || 'N/A'}`);
  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(
    tasksRef,
    where('userId', '==', authUid),
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
      if (dateStr && taskStartDate && dateStr < taskStartDate) {
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

  console.log(`[taskService] Returned ${tasks.length} active tasks for weekday ${weekday}`);
  return tasks;
}

/**
 * Fetches all active tasks owned by a user across all days
 */
export async function getAllActiveTasks(userId: string): Promise<Task[]> {
  const authUid = assertAuthenticatedUser(userId);

  console.log(`[taskService] Querying all active tasks for UID: ${authUid}`);
  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(tasksRef, where('userId', '==', authUid));

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
        startDate: data.startDate || '2000-01-01',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }
  });

  console.log(`[taskService] Total active tasks for user: ${tasks.length}`);
  return tasks;
}

/**
 * Fetches completion statuses for a user on a given date (YYYY-MM-DD)
 */
export async function getCompletionsForDate(
  userId: string,
  date: string
): Promise<Record<string, boolean>> {
  const authUid = assertAuthenticatedUser(userId);

  const completionsRef = collection(db, COMPLETIONS_COLLECTION);
  const q = query(
    completionsRef,
    where('userId', '==', authUid),
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

  console.log(`[taskService] Retrieved ${Object.keys(completionMap).length} completion records for date ${date}`);
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
  const authUid = assertAuthenticatedUser(userId);

  const docId = `${taskId}_${date}`;
  const docRef = doc(db, COMPLETIONS_COLLECTION, docId);

  console.log(`[taskService] Persisting task completion: docId=${docId}, completed=${completed}`);
  await setDoc(docRef, {
    userId: authUid,
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
  assertAuthenticatedUser(userId);

  console.log(`[taskService] Deactivating task ${taskId} for UID ${userId}`);
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
 * Clears previously seeded sample tasks if specifically requested.
 * Safe guard: does NOT delete user tasks during regular app usage.
 */
export async function clearInitialSeededTasks(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const authUid = assertAuthenticatedUser(userId);

    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, where('userId', '==', authUid));
    const snapshot = await getDocs(q);

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Only delete if specifically tagged as seeded
      if (data.isSeeded === true) {
        deletePromises.push(deleteDoc(doc(db, TASKS_COLLECTION, docSnap.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[taskService] Cleaned up ${deletePromises.length} seeded tasks`);
    }
  } catch (err) {
    console.warn('[taskService] Note on clearInitialSeededTasks:', err);
  }
}
