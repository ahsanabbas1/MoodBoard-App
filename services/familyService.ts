import { supabase } from './supabase';

/**
 * Sends a family invitation to another user
 */
export async function sendInvite(fromUserId: string, toUserId: string) {
  const { error } = await supabase
    .from('invitations')
    .insert({
      sender_id: fromUserId,
      receiver_id: toUserId,
      status: 'pending'
    });

  if (error) throw error;
}

/**
 * Subscribes to real-time mood updates for a list of user IDs
 */
export function subscribeToMoodUpdates(userIds: string[], onUpdate: (data: any) => void) {
  return supabase
    .channel('family-moods')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=in.(${userIds.join(',')})`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
}
