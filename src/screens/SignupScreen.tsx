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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signUpUser, UserRecord } from '../services/authService';
import { Toast } from '../components/Toast';
import { styles } from '../styles/signup.styles';

interface SignupScreenProps {
  onNavigate: (screen: 'login' | 'signup' | 'dashboard') => void;
  onSignupSuccess?: (user: UserRecord) => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onNavigate,
  onSignupSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [focusedField, setFocusedField] = useState<'username' | 'email' | 'password' | null>(null);

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/configuration-not-found') {
      return 'Authentication is not enabled. Please enable Email/Password in your Firebase Console under Authentication -> Sign-in method.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Try logging in.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is disabled. Please enable it in Firebase Console -> Authentication -> Sign-in method.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connection.';
    }
    if (err?.message?.includes('API key')) {
      return 'Please check your Firebase credentials in the .env file.';
    }
    return err?.message || 'Failed to create account. Please check your details.';
  };

  const handleSignup = async () => {
    setToastMessage('');

    if (!username.trim()) {
      setToastMessage('Please enter a username.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setToastMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setToastMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const user = await signUpUser(username, email, password);
      setLoading(false);
      if (onSignupSuccess) {
        onSignupSuccess(user);
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      setToastMessage(getFirebaseErrorMessage(err));
    }
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
                  source={require('../../assets/signup.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              {/* Headings */}
              <View style={styles.titleContainer}>
                <Text style={styles.heading}>Sign Up</Text>
                <Text style={styles.subheading}>Create your account to get started</Text>
              </View>

              {/* Input Cards */}
              <View style={styles.formContainer}>
                {/* Username Input */}
                <View
                  style={[
                    styles.inputCard,
                    focusedField === 'username' && styles.inputCardFocused,
                  ]}
                >
                  <View style={styles.iconBadge}>
                    <Ionicons name="person-outline" size={20} color="#5246e2" />
                  </View>
                  <View style={styles.inputColumn}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Choose a username"
                      placeholderTextColor="#9ca3af"
                      value={username}
                      onChangeText={(val) => {
                        setUsername(val);
                        if (toastMessage) setToastMessage('');
                      }}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Email Input */}
                <View
                  style={[
                    styles.inputCard,
                    focusedField === 'email' && styles.inputCardFocused,
                  ]}
                >
                  <View style={styles.iconBadge}>
                    <Ionicons name="mail-outline" size={20} color="#5246e2" />
                  </View>
                  <View style={styles.inputColumn}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (toastMessage) setToastMessage('');
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
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
                      placeholder="Create a password"
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

                {/* Submit Pill Button with Arrow */}
                <TouchableOpacity
                  onPress={handleSignup}
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
                        <Text style={styles.buttonText}>Sign Up</Text>
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
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity
                    onPress={() => onNavigate('login')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.footerLink}>Log in</Text>
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
