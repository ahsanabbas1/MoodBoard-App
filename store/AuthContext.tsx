import React, { createContext, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { UserProfile, AuthState } from "../types/auth";

const USERNAME_ADJECTIVES = [
  "Happy",
  "Calm",
  "Bright",
  "Sunny",
  "Bold",
  "Chill",
  "Zen",
  "Warm",
  "Kind",
  "Swift",
  "Cozy",
  "Mellow",
  "Lively",
  "Gentle",
  "Radiant",
];
const USERNAME_NOUNS = [
  "Panda",
  "River",
  "Star",
  "Moon",
  "Bear",
  "Cloud",
  "Wave",
  "Fox",
  "Owl",
  "Leaf",
  "Breeze",
  "Spark",
  "Bloom",
  "Sage",
  "Ember",
];

async function generateUniqueUsername(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const adj =
      USERNAME_ADJECTIVES[
        Math.floor(Math.random() * USERNAME_ADJECTIVES.length)
      ];
    const noun =
      USERNAME_NOUNS[Math.floor(Math.random() * USERNAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    const candidate = `${adj}${noun}${num}`;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // fallback: timestamp-based unique suffix
  return `user_${Date.now().toString(36)}`;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error("Error checking user session:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(userId: string, currentSession?: any) {
    const s = currentSession || session;
    const email = s?.user?.email || "";
    const defaultName = email.split("@")[0] || "User";

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist — create with a unique username
        const username = await generateUniqueUsername();
        const newProfile = {
          id: userId,
          email: email,
          full_name: defaultName,
          username,
          updated_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase
          .from("profiles")
          .insert(newProfile);
        if (!insertError) {
          setUser({
            id: userId,
            email,
            fullName: defaultName,
            username,
            updatedAt: Date.now(),
          });
        } else {
          console.error("Error creating profile:", insertError);
          setUser({
            id: userId,
            email,
            fullName: defaultName,
            username,
            updatedAt: Date.now(),
          });
        }
      } else if (data) {
        setUser({
          id: data.id,
          email: data.email,
          fullName: data.full_name || defaultName,
          username: data.username ?? undefined,
          avatarUrl: data.avatar_url,
          currentMoodEmoji: data.current_mood_emoji,
          updatedAt: new Date(data.updated_at).getTime(),
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          locationUpdatedAt: data.location_updated_at ?? undefined,
          locationSharing: data.location_sharing ?? 'none',
          locationSharingWith: data.location_sharing_with ?? [],
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) return;

    // Optimistic update locally
    setUser({ ...user, ...updates, updatedAt: Date.now() });

    const dbUpdates: Record<string, any> = {
      id: user.id,
      email: user.email,
      full_name:
        updates.fullName !== undefined ? updates.fullName : user.fullName,
      current_mood_emoji:
        updates.currentMoodEmoji !== undefined
          ? updates.currentMoodEmoji
          : user.currentMoodEmoji,
      updated_at: new Date().toISOString(),
    };
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.locationUpdatedAt !== undefined) dbUpdates.location_updated_at = updates.locationUpdatedAt;
    if (updates.locationSharing !== undefined) dbUpdates.location_sharing = updates.locationSharing;
    if (updates.locationSharingWith !== undefined) dbUpdates.location_sharing_with = updates.locationSharingWith;

    const { error } = await supabase.from("profiles").upsert(dbUpdates);
    if (error) {
      console.error("Error updating profile:", error);
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
      const redirectUrl = Linking.createURL("/login");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      // The UI will handle the success message and mode switch
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    // Clear user-specific AsyncStorage data before logging out
    if (user?.id) {
      const uid = user.id;
      try {
        await AsyncStorage.multiRemove([
          // Friend/Family circles
          `circle_family_v5_${uid}`,
          `circle_friends_v5_${uid}`,
          // Privacy settings
          `privacy_share_mood_${uid}`,
          `privacy_share_notes_${uid}`,
          // Notifications
          `notifications_v1_${uid}`,
          `reminder_settings_v1_${uid}`,
          // AI insights cache
          `ai_insights_cache_${uid}`,
          // Profile preferences
          `profile_prefs_${uid}`,
          // Peer mood data
          `peer_mood_v1_${uid}`,
          // Friend circles cache
          `pending_circle_family_${uid}`,
          `pending_circle_friends_${uid}`,
        ]);
      } catch (error) {
        console.error("Error clearing AsyncStorage on logout:", error);
      }
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  async function deleteAccount() {
    if (!user?.id) return;

    const uid = user.id;

    try {
      // Delete all friend requests (both sent and received)
      await supabase
        .from("friend_requests")
        .delete()
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      // Delete user profile
      await supabase.from("profiles").delete().eq("id", uid);

      // Delete all local mood entries
      const { clearAllEntries } = await import("../store/database");
      await clearAllEntries(uid);

      // Clear all user-specific AsyncStorage data
      try {
        await AsyncStorage.multiRemove([
          `circle_family_v5_${uid}`,
          `circle_friends_v5_${uid}`,
          `privacy_share_mood_${uid}`,
          `privacy_share_notes_${uid}`,
          `notifications_v1_${uid}`,
          `reminder_settings_v1_${uid}`,
          `ai_insights_cache_${uid}`,
          `profile_prefs_${uid}`,
          `peer_mood_v1_${uid}`,
          `pending_circle_family_${uid}`,
          `pending_circle_friends_${uid}`,
        ]);
      } catch (error) {
        console.error(
          "Error clearing AsyncStorage during account deletion:",
          error,
        );
      }

      // Delete the auth account (this will sign out the user)
      const { data } = await supabase.auth.admin.deleteUser(uid);

      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
