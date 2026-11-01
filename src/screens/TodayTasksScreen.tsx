import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskWithCompletion, Weekday, DayDateItem } from '../types/task';
import {
  formatLocalDate,
  getWeekDays,
  getWeekdayFromDate,
  formatDisplayDate,
} from '../utils/dateUtils';
import {
  getTasksWithCompletions,
  setTaskCompletion,
  deactivateTask,
  getAllActiveTasks,
} from '../services/taskService';
import { UserRecord } from '../services/authService';
import { WeekDateSelector } from '../components/WeekDateSelector';
import { TaskCard } from '../components/TaskCard';
import { BottomNavigation, BottomTab } from '../components/BottomNavigation';
import { ProfileModal } from '../components/ProfileModal';
import { Toast } from '../components/Toast';
import { SettingsScreen } from './SettingsScreen';
import { DashboardScreen } from './DashboardScreen';
import { styles } from '../styles/todayTasks.styles';

interface TodayTasksScreenProps {
  user: UserRecord | null;
  onNavigate: (screen: 'tasks' | 'create-task') => void;
  onLogout: () => void;
  initialTab?: BottomTab;
  onTabChange?: (tab: BottomTab) => void;
}

interface LoadErrorState {
  type: 'permission' | 'network' | 'auth' | 'general';
  message: string;
}

export const TodayTasksScreen: React.FC<TodayTasksScreenProps> = ({
  user,
  onNavigate,
  onLogout,
  initialTab = 'Tasks',
  onTabChange,
}) => {
  // Dynamic today tracking using device local time (YYYY-MM-DD)
  const [currentTodayStr, setCurrentTodayStr] = useState<string>(() =>
    formatLocalDate(new Date())
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDate(new Date())
  );
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [hasAnyTasks, setHasAnyTasks] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<LoadErrorState | null>(null);
  const [activeTab, setActiveTab] = useState<BottomTab>(initialTab);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Synchronize activeTab if initialTab changes (e.g. returning to tasks from CreateTask)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabPress = useCallback(
    (tab: BottomTab) => {
      setActiveTab(tab);
      if (onTabChange) {
        onTabChange(tab);
      }
    },
    [onTabChange]
  );

  // 7 days of the selected week (Sunday through Saturday)
  const weekDays: DayDateItem[] = useMemo(
    () => getWeekDays(new Date(), weekOffset),
    [weekOffset, currentTodayStr]
  );

  // Compute uppercase Weekday (SUN..SAT) from selectedDate YYYY-MM-DD using local noon to avoid DST shift
  const selectedWeekday: Weekday = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day, 12, 0, 0);
      return getWeekdayFromDate(dateObj);
    } catch {
      return getWeekdayFromDate(new Date());
    }
  }, [selectedDate]);

  // Synchronize dynamic today date across midnight and background/foreground transitions
  const checkDateRollOver = useCallback(() => {
    const realToday = formatLocalDate(new Date());
    setCurrentTodayStr((prevToday) => {
      if (realToday !== prevToday) {
        console.log(`[TodayTasksScreen] Date roll-over detected: was ${prevToday}, now ${realToday}`);
        // If user was viewing previous today, advance to new today automatically
        setSelectedDate((prevSelected) => {
          if (prevSelected === prevToday) {
            return realToday;
          }
          return prevSelected;
        });
        return realToday;
      }
      return prevToday;
    });
  }, []);

  // Load tasks for the selected date and weekday
  const loadTasks = useCallback(
    async (showLoadingSpinner = true) => {
      if (!user?.userId) {
        console.warn('[TodayTasksScreen] Cannot load tasks: user ID missing');
        return;
      }

      if (showLoadingSpinner) {
        setLoading(true);
      }
      setLoadError(null);

      console.log(`[TodayTasksScreen] Fetching tasks: UID=${user.userId}, date=${selectedDate}, weekday=${selectedWeekday}`);

      try {
        const [allUserTasks, loadedTasks] = await Promise.all([
          getAllActiveTasks(user.userId),
          getTasksWithCompletions(
            user.userId,
            selectedWeekday,
            selectedDate
          ),
        ]);

        console.log(`[TodayTasksScreen] Successfully loaded ${loadedTasks.length} tasks for ${selectedDate}. Total user active: ${allUserTasks.length}`);

        setHasAnyTasks(allUserTasks.length > 0);
        setTasks(loadedTasks);
        setLoadError(null);
      } catch (err: any) {
        console.error('[TodayTasksScreen] Failed to load tasks:', err);

        const errMsg: string = err?.message || String(err);
        const errCode: string = err?.code || '';

        let errType: LoadErrorState['type'] = 'general';
        let displayMsg = 'Failed to load tasks. Please try again.';

        if (errCode === 'permission-denied' || errMsg.toLowerCase().includes('permission')) {
          errType = 'permission';
          displayMsg = 'Missing or insufficient permissions. Please verify your authentication session.';
        } else if (errCode === 'unavailable' || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('offline')) {
          errType = 'network';
          displayMsg = 'Network connectivity issue. Please check your internet connection.';
        } else if (errMsg.toLowerCase().includes('auth') || errMsg.toLowerCase().includes('authenticated')) {
          errType = 'auth';
          displayMsg = 'Authentication session expired. Please sign in again.';
        }

        setLoadError({ type: errType, message: displayMsg });
        setToastMessage(displayMsg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.userId, selectedWeekday, selectedDate]
  );

  // Initial load and whenever selected date/weekday changes
  useEffect(() => {
    loadTasks(true);
  }, [loadTasks]);

  // Mobile AppState & Lifecycle handling: refresh on foreground and detect date roll-overs
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[TodayTasksScreen] Mobile AppState changed to: ${nextAppState}`);
      if (nextAppState === 'active') {
        checkDateRollOver();
        loadTasks(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // Periodic check (every 30s) for date roll-over while app stays open
    const interval = setInterval(() => {
      checkDateRollOver();
    }, 30000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [checkDateRollOver, loadTasks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    checkDateRollOver();
    loadTasks(false);
  }, [checkDateRollOver, loadTasks]);

  // Toggle completion with optimistic UI update - ONLY allowed on today!
  const handleToggleCompletion = async (
    taskId: string,
    currentCompleted: boolean
  ) => {
    if (!user?.userId) return;

    // Enforce that only today's tasks can be completed or modified
    if (selectedDate !== currentTodayStr) {
      if (selectedDate < currentTodayStr) {
        setToastMessage('Past tasks are read-only and cannot be modified.');
      } else {
        setToastMessage('Future tasks can only be completed on their scheduled day.');
      }
      return;
    }

    const newCompleted = !currentCompleted;

    // 1. Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t))
    );

    // 2. Persist to Firestore
    try {
      await setTaskCompletion(user.userId, taskId, selectedDate, newCompleted);
    } catch (err: any) {
      console.error('[TodayTasksScreen] Error toggling task completion:', err);
      // Revert optimistic update on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: currentCompleted } : t
        )
      );
      setToastMessage('Failed to update completion status. Reverted.');
    }
  };

  // Task deletion handler with confirmation - ONLY allowed on today
  const handleDeleteTask = (taskId: string) => {
    if (!user?.userId) return;

    if (selectedDate !== currentTodayStr) {
      setToastMessage('Past or future tasks cannot be deleted.');
      return;
    }

    const targetTask = tasks.find((t) => t.id === taskId);
    const taskTitle = targetTask?.title || 'this task';

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistically remove from list
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            try {
              await deactivateTask(user.userId, taskId);
              const remaining = await getAllActiveTasks(user.userId);
              setHasAnyTasks(remaining.length > 0);
            } catch (err: any) {
              console.error('[TodayTasksScreen] Error deactivating task:', err);
              setToastMessage('Failed to delete task. Please try again.');
              loadTasks(false);
            }
          },
        },
      ]
    );
  };

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const handleResetToday = () => {
    const realToday = formatLocalDate(new Date());
    setCurrentTodayStr(realToday);
    setWeekOffset(0);
    setSelectedDate(realToday);
  };

  // Progress metrics
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={!!toastMessage}
        message={toastMessage}
        type="error"
        onDismiss={() => setToastMessage('')}
      />

      <ProfileModal
        visible={isProfileModalVisible}
        user={user}
        onClose={() => setIsProfileModalVisible(false)}
        onLogout={onLogout}
      />

      {/* Dashboard Screen */}
      {activeTab === 'Dashboard' && (
        <DashboardScreen
          user={user}
          onNavigateTab={(tab) => handleTabPress(tab)}
          onNavigateCreateTask={() => onNavigate('create-task')}
        />
      )}

      {/* Tasks Screen */}
      {activeTab === 'Tasks' && (
        <View style={{ flex: 1 }}>
          {/* Sticky Header Section */}
          <View style={styles.stickyHeader}>
            {/* Header Row: Tasks Title */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Tasks</Text>
            </View>

            {/* 7-day Weekly Date Selector */}
            <WeekDateSelector
              days={weekDays}
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                setLoadError(null);
              }}
              weekOffset={weekOffset}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onResetToday={handleResetToday}
            />

            {/* Progress Card: "X of Y completed" + "%" + Horizontal Progress Bar */}
            <View style={styles.progressCard}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressCountText}>
                  {completedCount} of {totalCount} completed
                </Text>
                <Text style={styles.progressPercentageText}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007aff" />
                <Text style={styles.loadingText}>Loading your daily tasks...</Text>
              </View>
            ) : loadError && tasks.length === 0 ? (
              /* Error State: Differentiated error view with Retry mechanism */
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#007aff']}
                    tintColor="#007aff"
                  />
                }
              >
                <View style={styles.errorContainer}>
                  <View style={styles.errorIconCircle}>
                    <Ionicons
                      name={
                        loadError.type === 'network'
                          ? 'cloud-offline-outline'
                          : loadError.type === 'permission'
                          ? 'lock-closed-outline'
                          : 'alert-circle-outline'
                      }
                      size={32}
                      color="#ef4444"
                    />
                  </View>
                  <Text style={styles.errorTitle}>
                    {loadError.type === 'network'
                      ? 'Connection Problem'
                      : loadError.type === 'permission'
                      ? 'Permission Required'
                      : loadError.type === 'auth'
                      ? 'Session Expired'
                      : 'Unable to Load Tasks'}
                  </Text>
                  <Text style={styles.errorMessage}>{loadError.message}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => loadTasks(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="reload" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#007aff']}
                    tintColor="#007aff"
                  />
                }
              >
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isToday={selectedDate === currentTodayStr}
                      isPast={selectedDate < currentTodayStr}
                      isFuture={selectedDate > currentTodayStr}
                      onToggle={handleToggleCompletion}
                      onLongPress={handleDeleteTask}
                    />
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    {selectedDate < currentTodayStr ? (
                      // Past Day Empty State
                      <>
                        <View style={[styles.emptyIconCircle, { backgroundColor: '#f1f5f9' }]}>
                          <Ionicons name="time-outline" size={32} color="#64748b" />
                        </View>
                        <Text style={[styles.emptyTitle, styles.pastEmptyTitle]}>
                          No pending tasks recorded at this date ({formatDisplayDate(selectedDate)})
                        </Text>
                        <TouchableOpacity
                          style={styles.createTaskEmptyBtn}
                          onPress={handleResetToday}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.createTaskEmptyBtnText}>Jump to Today</Text>
                        </TouchableOpacity>
                      </>
                    ) : selectedDate > currentTodayStr ? (
                      // Future Day Empty State
                      <>
                        <View style={[styles.emptyIconCircle, { backgroundColor: '#ede9fe' }]}>
                          <Ionicons name="calendar-outline" size={32} color="#5246e2" />
                        </View>
                        <Text style={styles.emptyTitle}>No upcoming tasks</Text>
                        <Text style={styles.emptySubtitle}>
                          You have no routine tasks scheduled for this day.{'\n'}
                          Create a recurring task to plan ahead.
                        </Text>
                        <TouchableOpacity
                          style={styles.createTaskEmptyBtn}
                          onPress={() => onNavigate('create-task')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.createTaskEmptyBtnText}>+ Create Task</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Today Empty State (only displayed when request succeeded and list is genuinely empty)
                      <>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="checkbox-outline" size={32} color="#5246e2" />
                        </View>
                        <Text style={styles.emptyTitle}>No tasks for today</Text>
                        <Text style={styles.emptySubtitle}>
                          You have no tasks scheduled for today.{'\n'}
                          Tap below to create a new routine task.
                        </Text>
                        <TouchableOpacity
                          style={styles.createTaskEmptyBtn}
                          onPress={() => onNavigate('create-task')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.createTaskEmptyBtnText}>+ Create Task</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Floating Circle + Button */}
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => onNavigate('create-task')}
            activeOpacity={0.85}
            accessibilityLabel="Create New Task"
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Screen */}
      {activeTab === 'Settings' && (
        <SettingsScreen
          user={user}
          onLogout={onLogout}
          onProfilePress={() => setIsProfileModalVisible(true)}
        />
      )}

      {/* Bottom Navigation (Dashboard, Tasks, Settings) */}
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={(tab) => handleTabPress(tab)}
      />
    </SafeAreaView>
  );
};
