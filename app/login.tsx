import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleAuth() {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccessMsg('Account created! Check your email for the confirmation link.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred during authentication');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C6FFF', '#FF6B9D']}
        style={styles.background}
      />
      
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="heart" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>MoodBoard</Text>
            <Text style={styles.subtitle}>Track your mood, share with family.</Text>
          </View>

          {errorMsg ? (
            <View style={styles.messageBoxError}>
              <Text style={styles.messageText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.messageBoxSuccess}>
              <Text style={styles.messageText}>{successMsg}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#7C6FFF" />
              ) : (
                <Text style={styles.loginBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Enter your email', 'Type your email address above, then tap Forgot Password.');
                    return;
                  }
                  setLoading(true);
                  try {
                    const redirectTo = Platform.OS === 'web'
                      ? window.location.origin
                      : 'moodboard://';
                    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo,
                    });
                    if (error) throw error;
                    Alert.alert('Check your inbox', `A password reset link has been sent to ${email.trim()}.`);
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Failed to send reset email.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.signUpText}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7C6FFF' },
  background: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  keyboardView: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 50 },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },

  messageBoxError: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
  },
  messageBoxSuccess: {
    backgroundColor: 'rgba(52,199,89,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.4)',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 16,
  },
  loginBtn: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C6FFF',
  },
  forgotBtn: { alignSelf: 'center', marginTop: 16 },
  forgotText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  signUpText: { color: '#fff', fontSize: 15, fontWeight: '700' },

});
