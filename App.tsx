import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, ActivityIndicator, Image, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { TodayTasksScreen } from './src/screens/TodayTasksScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BottomTab } from './src/components/BottomNavigation';
import {
  waitForAuthReady,
  fetchUserProfile,
  subscribeToAuthState,
  logoutUser,
  cleanupLegacyCredentials,
  UserRecord,
} from './src/services/authService';
import { styles } from './src/styles/app.styles';

export type Screen = 'login' | 'signup' | 'tasks' | 'create-task' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [tasksTab, setTasksTab] = useState<BottomTab>('Tasks');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const isInitializingRef = useRef<boolean>(false);

  // Global web CSS injection to prevent input focus outlines
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'disable-input-outline';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          input, textarea, [contenteditable="true"] {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          input:focus, textarea:focus, [contenteditable="true"]:focus {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Application Launch:
  // 1. Initialize Firebase Auth session check
  // 2. Wait for auth state confirmation (persisted session check)
  // 3. If valid authenticated session exists -> retrieve UID, load user, navigate to dashboard/tasks
  // 4. If no session exists -> navigate directly to login screen
  useEffect(() => {
    let isMounted = true;
    let authUnsubscribe: (() => void) | null = null;

    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    const initializeAuthFlow = async () => {
      try {
        console.log('[App] Application launched. Initializing Firebase Authentication...');
        await cleanupLegacyCredentials();

        // Wait for Firebase Auth to restore persisted session
        const firebaseUser = await waitForAuthReady();

        if (!isMounted) return;

        if (firebaseUser) {
          console.log('[App] Persisted session confirmed for UID:', firebaseUser.uid);
          const userRecord = await fetchUserProfile(firebaseUser);
          if (isMounted) {
            setCurrentUser(userRecord);
            setCurrentScreen('tasks');
            setIsInitializing(false);
          }
        } else {
          console.log('[App] No persisted session found. Navigating to login.');
          if (isMounted) {
            setCurrentUser(null);
            setCurrentScreen('login');
            setIsInitializing(false);
          }
        }
      } catch (err) {
        console.error('[App] Auth initialization error:', err);
        if (isMounted) {
          setCurrentUser(null);
          setCurrentScreen('login');
          setIsInitializing(false);
        }
      }

      // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
      authUnsubscribe = subscribeToAuthState((user) => {
        if (!isMounted) return;
        if (user) {
          console.log('[App] Auth state updated: logged in as UID:', user.userId);
          setCurrentUser(user);
        } else {
          console.log('[App] Auth state updated: user signed out.');
          setCurrentUser(null);
          setCurrentScreen('login');
        }
      });
    };

    initializeAuthFlow();

    return () => {
      isMounted = false;
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('[App] Logout note:', e);
    }
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  const handleAuthSuccess = (user: UserRecord) => {
    console.log('[App] Auth success for UID:', user.userId);
    setCurrentUser(user);
    setCurrentScreen('tasks');
  };

  // Clean loading / splash screen while confirming persisted authentication state
  if (isInitializing) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Image
          source={require('./assets/logo.png')}
          style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 18 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#5246e2" />
        <Text style={{ marginTop: 14, fontSize: 14, color: '#64748b', fontWeight: '500' }}>
          Initializing DayAfterDay...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {currentScreen === 'login' && (
        <LoginScreen
          onNavigate={setCurrentScreen}
          onLoginSuccess={handleAuthSuccess}
        />
      )}
      {currentScreen === 'signup' && (
        <SignupScreen
          onNavigate={setCurrentScreen}
          onSignupSuccess={handleAuthSuccess}
        />
      )}
      {currentScreen === 'tasks' && currentUser && (
        <TodayTasksScreen
          user={currentUser}
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
          initialTab={tasksTab}
          onTabChange={setTasksTab}
        />
      )}
      {currentScreen === 'create-task' && currentUser && (
        <CreateTaskScreen
          userId={currentUser.userId}
          onBack={() => {
            setTasksTab('Tasks');
            setCurrentScreen('tasks');
          }}
          onSuccess={() => {
            setTasksTab('Tasks');
            setCurrentScreen('tasks');
          }}
        />
      )}
      {currentScreen === 'dashboard' && currentUser && (
        <DashboardScreen
          user={currentUser}
          onLogout={handleLogout}
          onNavigateTab={(tab) => {
            if (tab === 'Tasks') setCurrentScreen('tasks');
          }}
        />
      )}
    </View>
  );
}
