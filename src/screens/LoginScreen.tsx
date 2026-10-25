import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { loginUser, UserRecord } from '../services/authService';
import { Toast } from '../components/Toast';
import { styles } from '../styles/login.styles';

interface LoginScreenProps {
  onNavigate: (screen: 'login' | 'signup' | 'dashboard') => void;
  onLoginSuccess?: (user: UserRecord) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/configuration-not-found') {
      return 'Authentication is not enabled. Please enable Email/Password in your Firebase Console under Authentication -> Sign-in method.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password. Please try again.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is disabled. Please enable it in Firebase Console -> Authentication -> Sign-in method.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Access temporarily locked due to multiple failed attempts. Please try again later.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connection.';
    }
    if (err?.message?.includes('API key')) {
      return 'Please check your Firebase credentials in the .env file.';
    }
    return err?.message || 'Email or password is wrong.';
  };

  const handleLogin = async () => {
    setToastMessage('');

    if (!identifier.trim()) {
      setToastMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setToastMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const user = await loginUser(identifier, password);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      setToastMessage(getFirebaseErrorMessage(err));
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Please check your email inbox for password recovery instructions.'
    );
  };

  return (
    <View style={styles.outerBackground}>
      {/* Toast Notification */}
      <Toast
        visible={!!toastMessage}
        message={toastMessage}
        type="error"
        onDismiss={() => setToastMessage('')}
      />

      {/* Ambient background pastel glows */}
      <View style={styles.ambientGlowTopRight} />
      <View style={styles.ambientGlowBottomLeft} />
      <View style={styles.ambientGlowCenter} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flexOne}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Centered White Card */}
            <View style={styles.card}>
              {/* Top Branding */}
              <View style={styles.brandRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.brandTitle}>DayAfterDay</Text>
              </View>

              {/* Hero Illustration */}
              <View style={styles.illustrationWrapper}>
                <Image
                  source={require('../../assets/login.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              {/* Headings */}
              <View style={styles.titleContainer}>
                <Text style={styles.heading}>Log In</Text>
                <Text style={styles.subheading}>Welcome back, please sign in to continue</Text>
              </View>

              {/* Input Cards */}
              <View style={styles.formContainer}>
                {/* Username/Email Input */}
                <View
                  style={[
                    styles.inputCard,
                    focusedField === 'identifier' && styles.inputCardFocused,
                  ]}
                >
                  <View style={styles.iconBadge}>
                    <Ionicons name="mail-outline" size={20} color="#5246e2" />
                  </View>
                  <View style={styles.inputColumn}>
                    <Text style={styles.inputLabel}>Email or Username</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your email or username"
                      placeholderTextColor="#9ca3af"
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        if (toastMessage) setToastMessage('');
                      }}
                      onFocus={() => setFocusedField('identifier')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View
                  style={[
                    styles.inputCard,
                    focusedField === 'password' && styles.inputCardFocused,
                  ]}
                >
                  <View style={styles.iconBadge}>
                    <Ionicons name="lock-closed-outline" size={20} color="#5246e2" />
                  </View>
                  <View style={styles.inputColumn}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (toastMessage) setToastMessage('');
                      }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#8e96a4"
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPasswordContainer}
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Submit Pill Button with Arrow */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={styles.buttonWrapper}
                >
                  <LinearGradient
                    colors={['#584ded', '#4338ca']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Log In</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color="#ffffff"
                          style={styles.buttonArrow}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Footer Navigation Link */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don't have an account? </Text>
                  <TouchableOpacity
                    onPress={() => onNavigate('signup')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.footerLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
