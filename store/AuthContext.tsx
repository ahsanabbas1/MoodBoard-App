import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { UserProfile, AuthState } from '../types/auth';
import * as db from './database';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session on load
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(userId: string, currentSession?: any) {
    const s = currentSession || session;
    const email = s?.user?.email || '';
    const defaultName = email.split('@')[0] || 'User';

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile = {
          id: userId,
          email: email,
          full_name: defaultName,
          updated_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (!insertError) {
          setUser({
            id: userId,
            email: email,
            fullName: defaultName,
            updatedAt: Date.now(),
          });
        } else {
          console.error('Error creating profile:', insertError);
          setUser({ id: userId, email, fullName: defaultName, updatedAt: Date.now() });
        }
      } else if (data) {
        setUser({
          id: data.id,
          email: data.email,
          fullName: data.full_name || defaultName,
          avatarUrl: data.avatar_url,
          currentMoodEmoji: data.current_mood_emoji,
          updatedAt: new Date(data.updated_at).getTime(),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) return;
    
    // Optimistic update locally
    setUser({ ...user, ...updates, updatedAt: Date.now() });

    const dbUpdates = {
      id: user.id,
      email: user.email,
      full_name: updates.fullName !== undefined ? updates.fullName : user.fullName,
      current_mood_emoji: updates.currentMoodEmoji !== undefined ? updates.currentMoodEmoji : user.currentMoodEmoji,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(dbUpdates);
    if (error) {
      console.error('Error updating profile:', error);
    }
  }

  async function signIn(email: string, password: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string) {
    setLoading(true);
    try {
      // Create a dynamic redirect URL that works for both local Expo Go and compiled APKs
      const redirectUrl = Linking.createURL('/login');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      if (error) throw error;
      // The UI will handle the success message and mode switch

    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const uid = user?.id;
    // Clear all local user data before invalidating the session
    if (uid) {
      await db.clearAllEntries(uid).catch(() => {});
    }
    // Remove non-user-keyed AsyncStorage keys that would leak to the next user
    await AsyncStorage.multiRemove([
      'ai_insights_cache',
      'notifications_v1',
      'reminder_settings_v1',
    ]).catch(() => {});

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
