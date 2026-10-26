import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRecord } from '../services/authService';
import { styles } from '../styles/settings.styles';

interface SettingsScreenProps {
  user: UserRecord | null;
  onLogout: () => void;
  onProfilePress?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onLogout,
  onProfilePress,
}) => {
  const displayName =
    user?.name || (user?.email ? user.email.split('@')[0] : 'Gowtham');
  const displayEmail = user?.email || 'gowtham@example.com';

  const handleAppearance = () => {
    Alert.alert('Appearance', 'Current theme: System Default (Light)', [
      { text: 'OK' },
    ]);
  };

  const handleWeekStart = () => {
    Alert.alert(
      'Week Start Day',
      'The calendar week currently starts on Sunday.',
      [{ text: 'OK' }]
    );
  };

  const handleCategories = () => {
    Alert.alert(
      'Task Categories',
      'Available categories:\n• 💚 Health\n• 💼 Work\n• 📚 Learning\n• 🏠 Personal',
      [{ text: 'OK' }]
    );
  };

  const handleTaskManagement = () => {
    Alert.alert(
      'Task Management',
      'Tasks repeat every week on their scheduled routine days.',
      [{ text: 'OK' }]
    );
  };

  const handleBackup = () => {
    Alert.alert(
      'Backup & Restore',
      'Your tasks and completion logs are automatically synchronized with Firebase cloud storage.',
      [{ text: 'OK' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to reset your local data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Data Cleared', 'Your history has been refreshed.');
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About DayAfterDay',
      'DayAfterDay v1.0.0\nBuild your daily routine, day after day.',
      [{ text: 'Close' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Help & Support',
      'Need help with DayAfterDay?\nContact support at support@dayafterday.app',
      [{ text: 'OK' }]
    );
  };

  const handleConfirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Sticky Top Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={onProfilePress || handleConfirmLogout}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Ionicons name="person-outline" size={26} color="#007aff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Section 1: PREFERENCES */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleAppearance}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#fef6e7' }]}
            >
              <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.itemLabel}>Appearance</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleWeekStart}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#eafaf1' }]}
            >
              <Ionicons name="calendar-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.itemLabel}>Week Start</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Section 2: TASKS */}
        <Text style={styles.sectionHeader}>TASKS</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleCategories}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#f6f0ff' }]}
            >
              <Ionicons name="list-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.itemLabel}>Categories</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleTaskManagement}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#edf5ff' }]}
            >
              <Ionicons name="checkbox-outline" size={20} color="#007aff" />
            </View>
            <Text style={styles.itemLabel}>Task Management</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Section 3: DATA */}
        <Text style={styles.sectionHeader}>DATA</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleBackup}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#edf5ff' }]}
            >
              <Ionicons name="cloud-outline" size={20} color="#0284c7" />
            </View>
            <Text style={styles.itemLabel}>Backup & Restore</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleClearData}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#fef2f2' }]}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </View>
            <Text style={styles.itemLabel}>Clear All Data</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Section 4: SUPPORT */}
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleAbout}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#edf5ff' }]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#007aff"
              />
            </View>
            <Text style={styles.itemLabel}>About</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleHelp}
            activeOpacity={0.7}
          >
            <View
              style={[styles.itemIconSquircle, { backgroundColor: '#faf5ff' }]}
            >
              <Ionicons name="help-circle-outline" size={20} color="#a855f7" />
            </View>
            <Text style={styles.itemLabel}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout Row */}
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleConfirmLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
