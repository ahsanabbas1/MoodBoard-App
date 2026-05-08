import { supabase } from "./supabase";

export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | "family_request"
  | "family_request_accepted"
  | "family_request_rejected"
  | "friend_removed"
  | "family_removed";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  fromUserId: string;
  requestId?: string;
  relationshipType?: "friend" | "family";
  message: string;
  read: boolean;
  createdAt: string;
  fromUserProfile?: {
    id: string;
    fullName: string;
    username?: string;
    avatarUrl?: string;
  };
}

/**
 * Create a notification for a friend/family request.
 * Sent when User A sends a request to User B.
 */
export async function createRequestNotification(
  receiverId: string,
  senderId: string,
  relationshipType: "friend" | "family",
  requestId: string,
): Promise<void> {
  const notificationType =
    relationshipType === "friend" ? "friend_request" : "family_request";
  const message =
    relationshipType === "friend"
      ? "sent you a friend request"
      : "sent you a family request";

  const { error } = await supabase.from("notifications").insert({
    user_id: receiverId,
    from_user_id: senderId,
    type: notificationType,
    request_id: requestId,
    relationship_type: relationshipType,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating request notification:", error);
    throw error;
  }
}

/**
 * Create a notification for the requester when their request is accepted.
 */
export async function createAcceptedNotification(
  senderId: string,
  receiverId: string,
  relationshipType: "friend" | "family",
  requestId: string,
): Promise<void> {
  const notificationType =
    relationshipType === "friend"
      ? "friend_request_accepted"
      : "family_request_accepted";
  const message =
    relationshipType === "friend"
      ? "accepted your friend request"
      : "accepted your family request";

  const { error } = await supabase.from("notifications").insert({
    user_id: senderId,
    from_user_id: receiverId,
    type: notificationType,
    request_id: requestId,
    relationship_type: relationshipType,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating accepted notification:", error);
    throw error;
  }
}

/**
 * Create a notification for the requester when their request is rejected.
 */
export async function createRejectedNotification(
  senderId: string,
  receiverId: string,
  relationshipType: "friend" | "family",
  requestId: string,
): Promise<void> {
  const notificationType =
    relationshipType === "friend"
      ? "friend_request_rejected"
      : "family_request_rejected";
  const message =
    relationshipType === "friend"
      ? "declined your friend request"
      : "declined your family request";

  const { error } = await supabase.from("notifications").insert({
    user_id: senderId,
    from_user_id: receiverId,
    type: notificationType,
    request_id: requestId,
    relationship_type: relationshipType,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating rejected notification:", error);
    throw error;
  }
}

/**
 * Create a notification when a user is removed from friend/family list.
 */
export async function createRemovalNotification(
  removerId: string,
  removedId: string,
  relationshipType: "friend" | "family",
): Promise<void> {
  const notificationType =
    relationshipType === "friend" ? "friend_removed" : "family_removed";
  const message =
    relationshipType === "friend"
      ? "removed you from their friends list"
      : "removed you from their family list";

  const { error } = await supabase.from("notifications").insert({
    user_id: removedId,
    from_user_id: removerId,
    type: notificationType,
    relationship_type: relationshipType,
    message,
    read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating removal notification:", error);
    throw error;
  }
}

/**
 * Fetch all notifications for a user, sorted by most recent first.
 */
export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      user_id,
      from_user_id,
      type,
      request_id,
      relationship_type,
      message,
      read,
      created_at,
      profiles!notifications_from_user_id_fkey (
        id,
        full_name,
        username,
        avatar_url
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return (data || []).map((row: any) => {
    const p = row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      fromUserId: row.from_user_id,
      requestId: row.request_id,
      relationshipType: row.relationship_type,
      message: row.message,
      read: row.read,
      createdAt: row.created_at,
      fromUserProfile: p
        ? {
            id: p.id,
            fullName: p.full_name,
            username: p.username,
            avatarUrl: p.avatar_url,
          }
        : undefined,
    };
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

/**
 * Delete a notification.
 */
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Get count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }

  return data?.length || 0;
}
