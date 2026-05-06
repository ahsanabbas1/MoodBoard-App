import { supabase } from './supabase';
import { UserProfile } from '../types/auth';

export type RelationshipType = 'friend' | 'family';
export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  relationshipType: RelationshipType;
  status: RequestStatus;
  createdAt: string;
  senderProfile?: UserProfile;
}

/**
 * Send a friend/family request. Silently ignores duplicate pending requests.
 */
export async function sendFriendRequest(
  senderId: string,
  receiverId: string,
  relationshipType: RelationshipType,
): Promise<void> {
  const { error } = await supabase.from('friend_requests').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    relationship_type: relationshipType,
    status: 'pending',
  });
  // 23505 = unique constraint violation (request already exists)
  if (error && error.code !== '23505') throw error;
}

/**
 * Fetch all pending requests addressed to this user, with sender profile info.
 */
export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      sender_id,
      receiver_id,
      relationship_type,
      status,
      created_at,
      profiles!friend_requests_sender_id_fkey (
        id, full_name, email, username, avatar_url, current_mood_emoji, updated_at
      )
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const p = row.profiles;
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      relationshipType: row.relationship_type as RelationshipType,
      status: row.status as RequestStatus,
      createdAt: row.created_at,
      senderProfile: p
        ? {
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            username: p.username ?? undefined,
            avatarUrl: p.avatar_url,
            currentMoodEmoji: p.current_mood_emoji,
            updatedAt: new Date(p.updated_at).getTime(),
          }
        : undefined,
    };
  });
}

/**
 * Accept or reject a pending request.
 */
export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'rejected',
): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId);
  if (error) throw error;
}

/**
 * Get all accepted connections for a user (as either sender or receiver).
 * Returns the OTHER user's profile along with the relationship type.
 */
export async function getAcceptedConnections(userId: string): Promise<Array<{ profile: UserProfile; relationshipType: RelationshipType }>> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      sender_id,
      receiver_id,
      relationship_type,
      sender_profile:profiles!friend_requests_sender_id_fkey (
        id, full_name, email, username, avatar_url, current_mood_emoji, updated_at
      ),
      receiver_profile:profiles!friend_requests_receiver_id_fkey (
        id, full_name, email, username, avatar_url, current_mood_emoji, updated_at
      )
    `)
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching accepted connections:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const isSender = row.sender_id === userId;
    const p = isSender ? row.receiver_profile : row.sender_profile;
    return {
      profile: {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        username: p.username ?? undefined,
        avatarUrl: p.avatar_url,
        currentMoodEmoji: p.current_mood_emoji,
        updatedAt: new Date(p.updated_at).getTime(),
      },
      relationshipType: row.relationship_type as RelationshipType,
    };
  });
}

/**
 * Check if a pending request already exists from sender to receiver.
 */
export async function hasPendingRequest(senderId: string, receiverId: string): Promise<boolean> {
  const { data } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle();
  return !!data;
}
