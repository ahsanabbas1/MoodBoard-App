import { supabase } from './supabase';
import { UserProfile } from '../types/auth';

/**
 * Searches for users by full name or email
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    username: row.username ?? undefined,
    avatarUrl: row.avatar_url,
    currentMoodEmoji: row.current_mood_emoji,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

/**
 * Returns true if the username is available (not taken by any other user).
 */
export async function checkUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', currentUserId)
    .maybeSingle();
  return !data;
}

/**
 * Fetches the family circle (connected users)
 */
export async function getFamilyCircle(userId: string): Promise<UserProfile[]> {
  // Logic to fetch connected users will go here
  // For now, returning mock data to maintain UI
  return [];
}

/**
 * Fetches a single member's current mood emoji from their online profile.
 * Returns null if the member has no mood recorded or is offline.
 */
export async function fetchMemberCurrentMoodEmoji(memberId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('current_mood_emoji')
      .eq('id', memberId)
      .single();
    if (error || !data) return null;
    return data.current_mood_emoji ?? null;
  } catch {
    return null;
  }
}
