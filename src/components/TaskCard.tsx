import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskWithCompletion } from '../types/task';
import { TaskCategoryBadge } from './TaskCategoryBadge';

interface TaskCardProps {
  task: TaskWithCompletion;
  isToday?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  onToggle: (taskId: string, currentCompleted: boolean) => void;
  onLongPress?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isToday = true,
  isPast = false,
  isFuture = false,
  onToggle,
  onLongPress,
}) => {
  const isReadOnly = !isToday;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        task.completed && styles.cardCompleted,
        isReadOnly && styles.cardReadOnly,
      ]}
      activeOpacity={0.9}
      onLongPress={() => {
        if (!isReadOnly && onLongPress) {
          onLongPress(task.id);
        }
      }}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkboxTouch}
        onPress={() => onToggle(task.id, task.completed)}
        activeOpacity={isReadOnly ? 0.9 : 0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View
          style={[
            styles.checkbox,
            task.completed ? styles.checkboxChecked : styles.checkboxUnchecked,
            isReadOnly && !task.completed && styles.checkboxReadOnly,
          ]}
        >
          {task.completed ? (
            <Ionicons name="checkmark" size={15} color="#ffffff" />
          ) : isReadOnly ? (
            <Ionicons name="lock-closed" size={10} color="#cbd5e1" />
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Task Title */}
      <Text
        style={[
          styles.title,
          task.completed && styles.titleCompleted,
        ]}
        numberOfLines={1}
      >
        {task.title}
      </Text>

      {/* Category Badge */}
      <TaskCategoryBadge category={task.category} size="small" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardCompleted: {
    backgroundColor: '#fafbfc',
    borderColor: '#e8edf5',
  },
  checkboxTouch: {
    marginRight: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#007aff',
    borderColor: '#007aff',
    borderWidth: 1.5,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 12,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  cardReadOnly: {
    backgroundColor: '#ffffff',
    borderColor: '#edf2f7',
  },
  checkboxReadOnly: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
});

