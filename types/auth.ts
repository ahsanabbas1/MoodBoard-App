export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  currentMoodEmoji?: string;
  updatedAt: number;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
}
