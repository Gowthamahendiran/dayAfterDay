import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Weekday, TaskCategory } from '../types/task';
import { WEEKDAY_ORDER, WEEKDAY_LABELS } from '../utils/dateUtils';
import { createTask } from '../services/taskService';
import { Toast } from '../components/Toast';
import { styles } from '../styles/createTask.styles';

interface CreateTaskScreenProps {
  userId: string;
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORIES: {
  key: TaskCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  selectedBorder: string;
}[] = [
  {
    key: 'Personal',
    label: 'Personal',
    icon: 'home',
    bg: '#fdf2f4',
    color: '#e11d48',
    selectedBorder: '#fda4af',
  },
  {
    key: 'Work',
    label: 'Work',
    icon: 'briefcase',
    bg: '#e8f4fd',
    color: '#0284c7',
    selectedBorder: '#7dd3fc',
  },
  {
    key: 'Health',
    label: 'Health',
    icon: 'heart',
    bg: '#e8f8f0',
    color: '#16a34a',
    selectedBorder: '#86efac',
  },
  {
    key: 'Learning',
    label: 'Learning',
    icon: 'book',
    bg: '#f3f0ff',
    color: '#7c3aed',
    selectedBorder: '#c4b5fd',
  },
];

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({
  userId,
  onBack,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  const toggleDay = (day: Weekday) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = async () => {
    setToastMessage('');
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setToastMessage('Please enter a task title.');
      return;
    }
    if (trimmedTitle.length > 50) {
      setToastMessage('Task title must be 50 characters or less.');
      return;
    }
    if (selectedDays.length === 0) {
      setToastMessage('Please select at least one day for this task.');
      return;
    }
    if (!selectedCategory) {
      setToastMessage('Please choose a category.');
      return;
    }

    try {
      setLoading(true);
      await createTask(userId, trimmedTitle, selectedDays, selectedCategory);
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setToastMessage(err?.message || 'Failed to create task. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={!!toastMessage}
        message={toastMessage}
        type="error"
        onDismiss={() => setToastMessage('')}
      />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#4338ca" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create Task</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Task Title */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconSquircle}>
                <Ionicons name="document-text-outline" size={20} color="#5246e2" />
              </View>
              <View style={styles.sectionHeaderTextCol}>
                <Text style={styles.sectionTitle}>Task Title</Text>
              </View>
            </View>

            <View
              style={[
                styles.titleInputWrapper,
                isTitleFocused && styles.titleInputFocused,
              ]}
            >
              <TextInput
                style={styles.titleTextInput}
                placeholder="Enter task title..."
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
              />
              <Text style={styles.charCounter}>{title.length}/50</Text>
            </View>
          </View>

          {/* Section 2: Date / Days Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconSquircle}>
                <Ionicons name="calendar-outline" size={20} color="#5246e2" />
              </View>
              <View style={styles.sectionHeaderTextCol}>
                <Text style={styles.sectionTitle}>Date</Text>
                <Text style={styles.sectionSubtitle}>Select the days for this task</Text>
              </View>
            </View>

            <View style={styles.weekdaysRow}>
              {WEEKDAY_ORDER.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.weekdayCard,
                      isSelected ? styles.weekdayCardSelected : styles.weekdayCardUnselected,
                    ]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        isSelected ? styles.weekdayTextSelected : styles.weekdayTextUnselected,
                      ]}
                    >
                      {WEEKDAY_LABELS[day]}
                    </Text>

                    <View
                      style={[
                        styles.weekdayCheckbox,
                        isSelected ? styles.weekdayCheckboxSelected : styles.weekdayCheckboxUnselected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#ffffff" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3: Category */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconSquircle}>
                <Ionicons name="pricetag-outline" size={20} color="#5246e2" />
              </View>
              <View style={styles.sectionHeaderTextCol}>
                <Text style={styles.sectionTitle}>Category</Text>
                <Text style={styles.sectionSubtitle}>Choose a category for this task</Text>
              </View>
            </View>

            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: isSelected ? cat.bg : '#ffffff' },
                      isSelected
                        ? [styles.categoryCardSelected, { borderColor: cat.selectedBorder }]
                        : styles.categoryCardUnselected,
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={24}
                      color={cat.color}
                      style={styles.categoryIcon}
                    />
                    <Text style={[styles.categoryLabel, { color: cat.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.createButtonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
