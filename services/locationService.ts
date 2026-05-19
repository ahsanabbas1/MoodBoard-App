import * as Location from 'expo-location';
import { supabase } from './supabase';
import { LocationSharing, UserProfile } from '../types/auth';

export interface FriendLocation {
  id: string;
  fullName: string;
  moodEmoji: string;
  latitude: number;
  longitude: number;
  locationUpdatedAt: string;
  locationSharing: LocationSharing;
  locationSharingWith: string[];
}

/** Request foreground location permission. Returns true if granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const { status: existing } = await Location.getForegroundPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/** Get the device's current GPS coordinates. */
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (err) {
    console.error('[Location] getCurrentCoords failed:', err);
    return null;
  }
}

/** Push current GPS to the user's Supabase profile. */
export async function updateMyLocation(userId: string): Promise<{ latitude: number; longitude: number } | null> {
  const coords = await getCurrentCoords();
  if (!coords) return null;

  const { error } = await supabase.from('profiles').update({
    latitude: coords.latitude,
    longitude: coords.longitude,
    location_updated_at: new Date().toISOString(),
  }).eq('id', userId);

  if (error) console.error('[Location] updateMyLocation failed:', error);
  return error ? null : coords;
}

/** Clear location from Supabase (called when user turns off sharing). */
export async function clearMyLocation(userId: string): Promise<void> {
  await supabase.from('profiles').update({
    latitude: null,
    longitude: null,
    location_updated_at: null,
  }).eq('id', userId);
}

/**
 * Fetch locations of friends/family visible to the current user.
 * `connectionIds` — IDs of all accepted connections.
 * `myId` — current user's ID (to filter self out).
 */
export async function fetchFriendLocations(
  myId: string,
  connectionIds: string[],
): Promise<FriendLocation[]> {
  if (connectionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, current_mood_emoji, latitude, longitude, location_updated_at, location_sharing, location_sharing_with')
    .in('id', connectionIds)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error || !data) return [];

  return data
    .filter((p) => {
      const sharing: LocationSharing = p.location_sharing ?? 'none';
      if (sharing === 'none') return false;
      if (sharing === 'all') return true;
      // For family_only / friends_only / custom we can't determine
      // relationship type here without more data — include them and let the
      // map screen do fine-grained filtering if needed.
      return true;
    })
    .map((p) => ({
      id: p.id,
      fullName: p.full_name ?? 'Unknown',
      moodEmoji: p.current_mood_emoji ?? '👤',
      latitude: p.latitude,
      longitude: p.longitude,
      locationUpdatedAt: p.location_updated_at,
      locationSharing: p.location_sharing ?? 'none',
      locationSharingWith: p.location_sharing_with ?? [],
    }));
}

/** Human-readable "last seen" string. */
export function formatLastSeen(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return 'unknown';
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
