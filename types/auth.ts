export type LocationSharing = 'none' | 'all' | 'family_only' | 'friends_only' | 'custom';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  currentMoodEmoji?: string;
  updatedAt: number;
  // Location sharing
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string; // ISO timestamp
  locationSharing?: LocationSharing;
  locationSharingWith?: string[]; // user IDs for 'custom' mode
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
}
