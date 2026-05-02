import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  async function fetchProfile(userId: string) {
    // This will be expanded once we have the 'profiles' table in Supabase
    // For now, we'll use a mock profile based on the user session
    setUser({
      id: userId,
      email: session?.user?.email || '',
      fullName: session?.user?.user_metadata?.full_name || 'User',
      updatedAt: Date.now(),
    });
  }

  async function signIn(email: string) {
    // In a real app, we'd use supabase.auth.signInWithOtp or signInWithPassword
    // For this demonstration, we'll mock a login
    setLoading(true);
    setTimeout(() => {
      setUser({
        id: 'mock-user-123',
        email: email,
        fullName: 'Ahsan Abbas',
        avatarUrl: 'https://i.pravatar.cc/150?img=47',
        updatedAt: Date.now(),
      });
      setLoading(false);
    }, 1000);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
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
