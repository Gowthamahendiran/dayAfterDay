import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TaskProgressProps {
  completed: number;
  total: number;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ completed, total }) => {
  if (total === 0) return null;

  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.summaryText}>
        {completed} of {total} completed
      </Text>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  progressBarTrack: {
    width: 110,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5246e2',
    borderRadius: 3,
  },
});
