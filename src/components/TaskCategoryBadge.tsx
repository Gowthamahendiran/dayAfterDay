import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskCategory } from '../types/task';

interface TaskCategoryBadgeProps {
  category: TaskCategory;
  size?: 'small' | 'medium';
}

interface CategoryStyleConfig {
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const CATEGORY_CONFIG: Record<TaskCategory, CategoryStyleConfig> = {
  Health: {
    bg: '#e6f9f0',
    color: '#10b981',
    icon: 'heart',
  },
  Learning: {
    bg: '#f3f0ff',
    color: '#7c3aed',
    icon: 'book',
  },
  Work: {
    bg: '#e8f4fd',
    color: '#0284c7',
    icon: 'briefcase',
  },
  Personal: {
    bg: '#fdf2f4',
    color: '#e11d48',
    icon: 'home',
  },
};

export const TaskCategoryBadge: React.FC<TaskCategoryBadgeProps> = ({
  category,
  size = 'small',
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Personal;
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall ? styles.badgeSmall : styles.badgeMedium,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={isSmall ? 12 : 14}
        color={config.color}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall ? styles.labelSmall : styles.labelMedium,
        ]}
      >
        {category}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeMedium: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 13,
  },
});

