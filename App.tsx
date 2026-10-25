import React, { useState, useEffect } from 'react';
import { View, Platform, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { TodayTasksScreen } from './src/screens/TodayTasksScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import {
  getCachedUser,
  subscribeToAuthState,
  logoutUser,
  UserRecord,
} from './src/services/authService';
import { styles } from './src/styles/app.styles';

export type Screen = 'login' | 'signup' | 'tasks' | 'create-task' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

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

  // Check persistent storage on startup & subscribe to Firebase auth state
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately check cached session in AsyncStorage
    const restoreSession = async () => {
      try {
        const cached = await getCachedUser();
        if (cached && isMounted) {
          setCurrentUser(cached);
          setCurrentScreen('tasks');
        }
      } catch (err) {
        console.warn('Session restore note:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    restoreSession();

    // 2. Subscribe to Firebase Auth state changes
    const unsubscribe = subscribeToAuthState((user) => {
      if (!isMounted) return;
      if (user) {
        setCurrentUser(user);
        setCurrentScreen('tasks');
      } else {
        setCurrentUser(null);
      }
      setIsInitializing(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  const handleAuthSuccess = (user: UserRecord) => {
    setCurrentUser(user);
    setCurrentScreen('tasks');
  };

  // Splash loading screen while restoring persistent session
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
      {currentScreen === 'tasks' && (
        <TodayTasksScreen
          user={currentUser}
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'create-task' && (
        <CreateTaskScreen
          userId={currentUser?.userId || ''}
          onBack={() => setCurrentScreen('tasks')}
          onSuccess={() => setCurrentScreen('tasks')}
        />
      )}
      {currentScreen === 'dashboard' && (
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
