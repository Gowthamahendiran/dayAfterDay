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
  clearInitialSeededTasks,
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
}

export const TodayTasksScreen: React.FC<TodayTasksScreenProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDate(new Date())
  );
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [hasAnyTasks, setHasAnyTasks] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('Dashboard');
  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // 7 days of the selected week (Sunday through Saturday)
  const weekDays: DayDateItem[] = useMemo(
    () => getWeekDays(new Date(), weekOffset),
    [weekOffset]
  );

  // Compute uppercase Weekday (SUN..SAT) from selectedDate YYYY-MM-DD
  const selectedWeekday: Weekday = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return getWeekdayFromDate(dateObj);
    } catch {
      return getWeekdayFromDate(new Date());
    }
  }, [selectedDate]);

  // Load tasks for the selected date and weekday
  const loadTasks = useCallback(
    async (showLoadingSpinner = true) => {
      if (!user?.userId) return;

      if (showLoadingSpinner) {
        setLoading(true);
      }

      try {
        // Clear any sample/mock tasks so the list starts clean
        await clearInitialSeededTasks(user.userId);

        const [allUserTasks, loadedTasks] = await Promise.all([
          getAllActiveTasks(user.userId),
          getTasksWithCompletions(
            user.userId,
            selectedWeekday,
            selectedDate
          ),
        ]);
        setHasAnyTasks(allUserTasks.length > 0);
        setTasks(loadedTasks);
      } catch (err: any) {
        console.error('Error loading tasks:', err);
        setToastMessage(err?.message || 'Failed to load tasks. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.userId, selectedWeekday, selectedDate]
  );

  useEffect(() => {
    loadTasks(true);
  }, [loadTasks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks(false);
  }, [loadTasks]);

  // Toggle completion with optimistic UI update - ONLY allowed on today!
  const handleToggleCompletion = async (
    taskId: string,
    currentCompleted: boolean
  ) => {
    if (!user?.userId) return;

    // Enforce that only today's tasks can be completed or modified
    if (selectedDate !== todayStr) {
      if (selectedDate < todayStr) {
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
      console.error('Error toggling task completion:', err);
      // Revert on failure
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

    if (selectedDate !== todayStr) {
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
              console.error('Error deactivating task:', err);
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
    setWeekOffset(0);
    setSelectedDate(todayStr);
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
          onNavigateTab={(tab) => setActiveTab(tab)}
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

            {/* 7-day Weekly Date Selector (with Week Switcher Row above dates) */}
            <WeekDateSelector
              days={weekDays}
              selectedDate={selectedDate}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              weekOffset={weekOffset}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onResetToday={handleResetToday}
            />

            {/* Progress Card: "0 of 1 completed" + "0%" + Horizontal Progress Bar */}
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
                      isToday={selectedDate === todayStr}
                      isPast={selectedDate < todayStr}
                      isFuture={selectedDate > todayStr}
                      onToggle={handleToggleCompletion}
                      onLongPress={handleDeleteTask}
                    />
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    {selectedDate < todayStr ? (
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
                    ) : selectedDate > todayStr ? (
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
                      // Today Empty State
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

          {/* Floating Circle + Button (above bottom nav, bottom right) */}
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



      {/* Bottom Navigation (Tasks, Progress, Calendar, Settings) */}
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab)}
      />
    </SafeAreaView>
  );
};
