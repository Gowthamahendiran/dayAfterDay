import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRecord } from '../services/authService';
import { BottomTab } from '../components/BottomNavigation';
import { getTasksWithCompletions, setTaskCompletion } from '../services/taskService';
import { formatLocalDate, getWeekdayFromDate } from '../utils/dateUtils';
import { TaskWithCompletion } from '../types/task';
import { styles } from '../styles/dashboard.styles';

interface DashboardScreenProps {
  user: UserRecord | null;
  onNavigateTab?: (tab: BottomTab) => void;
  onNavigateCreateTask?: () => void;
  onLogout?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  onNavigateTab = () => {},
}) => {
  // Mock interactive state for Today's Task fallback
  const [isWaterCompleted, setIsWaterCompleted] = useState<boolean>(false);
  const [realTasks, setRealTasks] = useState<TaskWithCompletion[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>('This Week');

  // Load real tasks if the user has any
  useEffect(() => {
    let isMounted = true;
    const fetchUserTasks = async () => {
      if (!user?.userId) return;
      try {
        const todayStr = formatLocalDate(new Date());
        const weekday = getWeekdayFromDate(new Date());
        const tasks = await getTasksWithCompletions(user.userId, weekday, todayStr);
        if (isMounted && tasks && tasks.length > 0) {
          setRealTasks(tasks);
        }
      } catch (err) {
        console.warn('Dashboard tasks load note:', err);
      }
    };

    fetchUserTasks();
    return () => {
      isMounted = false;
    };
  }, [user?.userId]);

  // Handle toggling real task
  const handleToggleRealTask = async (task: TaskWithCompletion) => {
    if (!user?.userId) return;
    const nextCompleted = !task.completed;
    const todayStr = formatLocalDate(new Date());

    setRealTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      await setTaskCompletion(user.userId, task.id, todayStr, nextCompleted);
    } catch (err) {
      console.warn('Error updating task completion:', err);
    }
  };

  // 7-day streak tracker data matching the design mockup (Sun 25 - Sat 31)
  const streakDays = [
    { day: 'Sun', date: '25', completed: true },
    { day: 'Mon', date: '26', completed: true },
    { day: 'Tue', date: '27', completed: true },
    { day: 'Wed', date: '28', completed: true },
    { day: 'Thu', date: '29', completed: true },
    { day: 'Fri', date: '30', completed: true },
    { day: 'Sat', date: '31', completed: false },
  ];

  // Weekly activity bar chart data matching the screenshot heights
  const activityData = [
    { day: 'Sun', height: 90, color: '#4f96fd' },
    { day: 'Mon', height: 52, color: '#4f96fd' },
    { day: 'Tue', height: 44, color: '#4f96fd' },
    { day: 'Wed', height: 96, color: '#4f96fd' },
    { day: 'Thu', height: 50, color: '#4f96fd' },
    { day: 'Fri', height: 56, color: '#4f96fd' },
    { day: 'Sat', height: 16, color: '#e2e8f0' },
  ];

  const handleDropdownPress = () => {
    Alert.alert(
      'Activity Period',
      'Select time range to display',
      [
        { text: 'This Week', onPress: () => setSelectedRange('This Week') },
        { text: 'Last Week', onPress: () => setSelectedRange('Last Week') },
        { text: 'This Month', onPress: () => setSelectedRange('This Month') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // If real tasks exist, use their counts, otherwise use mockup numbers (4 of 5 / 80%)
  const hasRealTasks = realTasks.length > 0;
  const completedCount = hasRealTasks
    ? realTasks.filter((t) => t.completed).length
    : isWaterCompleted
    ? 1
    : 0;
  const totalCount = hasRealTasks ? realTasks.length : 1;

  return (
    <View style={styles.container}>
      {/* Sticky Main Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Current Streak Card */}
        <TouchableOpacity
          style={styles.streakCard}
          activeOpacity={0.88}
          onPress={() => onNavigateTab('Tasks')}
        >
          <View style={styles.streakTopRow}>
            <View style={styles.streakLeftInfo}>
              <View style={styles.flameCircle}>
                <Ionicons name="flame" size={30} color="#f97316" />
              </View>
              <View style={styles.streakTextCol}>
                <Text style={styles.streakLabel}>Current Streak</Text>
                <Text style={styles.streakDaysValue}>7 days</Text>
                <Text style={styles.streakSubtext}>Keep going! You're on fire!</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#94a3b8"
              style={styles.streakChevron}
            />
          </View>

          {/* 7-Day Streak Tracker */}
          <View style={styles.streakDaysRow}>
            {streakDays.map((item) => (
              <View key={item.day} style={styles.streakDayCol}>
                <Text style={styles.streakDayName}>{item.day}</Text>
                {item.completed ? (
                  <View style={styles.streakCheckCircle}>
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  </View>
                ) : (
                  <View style={styles.streakEmptyCircle} />
                )}
                <Text style={styles.streakDateNum}>{item.date}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* This Week Card */}
        <View style={styles.thisWeekCard}>
          <View style={styles.thisWeekHeader}>
            <Text style={styles.thisWeekTitle}>This Week</Text>
            <TouchableOpacity
              style={styles.thisWeekSubtitleRow}
              onPress={() => onNavigateTab('Tasks')}
              activeOpacity={0.7}
            >
              <Text style={styles.thisWeekSubtitleText}>4 of 5 completed</Text>
              <Ionicons name="chevron-forward" size={14} color="#8a92a6" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar (80%) */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: '80%' }]} />
          </View>

          {/* 4 Metric Cards */}
          <View style={styles.metricsRow}>
            {/* Completed */}
            <View style={[styles.metricBox, { backgroundColor: '#edf5ff' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#007aff" />
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>

            {/* Pending */}
            <View style={[styles.metricBox, { backgroundColor: '#f5f0ff' }]}>
              <Ionicons name="radio-button-on" size={20} color="#8b5cf6" />
              <Text style={styles.metricValue}>1</Text>
              <Text style={styles.metricLabel}>Pending</Text>
            </View>

            {/* Completion */}
            <View style={[styles.metricBox, { backgroundColor: '#eafaf1' }]}>
              <Ionicons name="calendar" size={20} color="#10b981" />
              <Text style={styles.metricValue}>80%</Text>
              <Text style={styles.metricLabel}>Completion</Text>
            </View>

            {/* Best Streak */}
            <View style={[styles.metricBox, { backgroundColor: '#fef9e7' }]}>
              <Ionicons name="star" size={20} color="#eab308" />
              <Text style={styles.metricValue}>7</Text>
              <Text style={styles.metricLabel}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* Today's Tasks Preview Card */}
        <View style={styles.todayTasksCard}>
          <View style={styles.todayTasksHeader}>
            <Text style={styles.todayTasksTitle}>Today's Tasks</Text>
            <TouchableOpacity
              style={styles.todayTasksSubtitleRow}
              activeOpacity={0.7}
              onPress={() => onNavigateTab('Tasks')}
            >
              <Text style={styles.todayTasksSubtitleText}>
                {completedCount} of {totalCount} completed
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#8a92a6" />
            </TouchableOpacity>
          </View>

          {/* If user has real tasks, render the first one or the "Drink water" default */}
          {hasRealTasks ? (
            realTasks.slice(0, 2).map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItemBox, { marginBottom: 8 }]}
                activeOpacity={0.7}
                onPress={() => handleToggleRealTask(task)}
              >
                <View style={styles.taskLeftRow}>
                  <View
                    style={[
                      styles.taskCheckbox,
                      task.completed && styles.taskCheckboxChecked,
                    ]}
                  >
                    {task.completed && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.taskTitleText,
                      task.completed && styles.taskTitleChecked,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </View>

                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {task.category === 'Health'
                      ? '💚 Health'
                      : task.category === 'Work'
                      ? '💼 Work'
                      : '⭐ ' + task.category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            /* Default Mockup Task: "Drink water" matching screenshot */
            <TouchableOpacity
              style={styles.taskItemBox}
              activeOpacity={0.7}
              onPress={() => setIsWaterCompleted((prev) => !prev)}
            >
              <View style={styles.taskLeftRow}>
                <View
                  style={[
                    styles.taskCheckbox,
                    isWaterCompleted && styles.taskCheckboxChecked,
                  ]}
                >
                  {isWaterCompleted && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </View>
                <Text
                  style={[
                    styles.taskTitleText,
                    isWaterCompleted && styles.taskTitleChecked,
                  ]}
                >
                  Drink water
                </Text>
              </View>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>💚 Health</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Weekly Activity Card */}
        <View style={styles.weeklyActivityCard}>
          <View style={styles.weeklyActivityHeader}>
            <Text style={styles.weeklyActivityTitle}>Weekly Activity</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={handleDropdownPress}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>{selectedRange}</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Bar Chart matching screenshot */}
          <View style={styles.barChartContainer}>
            {activityData.map((bar) => (
              <View key={bar.day} style={styles.barCol}>
                <View
                  style={[
                    styles.barPill,
                    { height: bar.height, backgroundColor: bar.color },
                  ]}
                />
                <Text style={styles.barLabel}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
