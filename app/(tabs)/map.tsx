import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../store/AuthContext';
import {
  fetchFriendLocations,
  formatLastSeen,
  updateMyLocation,
  FriendLocation,
} from '../../services/locationService';
import { getAcceptedConnections } from '../../services/friendRequestService';
import LeafletMap, { LeafletMapRef } from '../../components/LeafletMap';

export default function MapScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapRef = useRef<LeafletMapRef>(null);

  const isSharing = !!user?.locationSharing && user.locationSharing !== 'none';

  // ── Data loading ─────────────────────────────────────────────────────────

  async function load(showRefresh = false) {
    if (!user?.id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (isSharing) {
        const coords = await updateMyLocation(user.id);
        if (coords) setMyCoords(coords);
      }

      const connections = await getAcceptedConnections(user.id);
      const ids = connections
        .map((c: any) => c.id ?? c.userId ?? c.connectedUserId)
        .filter(Boolean);

      const locs = await fetchFriendLocations(user.id, ids);
      setFriends(locs);
    } catch (err) {
      console.error('[Map] load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = useCallback(() => load(true), [user?.id, isSharing]);

  // ── Marker tap: highlight card + fly to marker ────────────────────────────

  function handleMarkerPress(id: string) {
    setSelectedId(id);
    const person = friends.find((f) => f.id === id);
    if (person) {
      mapRef.current?.flyTo(person.latitude, person.longitude, 14);
    }
  }

  function handleCardPress(person: FriendLocation) {
    setSelectedId(person.id);
    mapRef.current?.flyTo(person.latitude, person.longitude, 14);
  }

  // ── Markers for LeafletMap ─────────────────────────────────────────────────

  const leafletMarkers = friends.map((f) => ({
    id: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    emoji: f.moodEmoji,
    name: f.fullName,
    subtitle: `Last seen ${formatLastSeen(f.locationUpdatedAt)}`,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Where is everyone?</Text>
          <Text style={styles.subtitle}>
            {loading
              ? 'Loading…'
              : friends.length === 0
                ? 'No locations shared yet'
                : `${friends.length} ${friends.length === 1 ? 'person' : 'people'} visible`}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
          <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching locations…</Text>
        </View>
      ) : (
        <View style={styles.body}>

          {/* ── Leaflet map (OpenStreetMap, no API key) ── */}
          <View style={styles.mapContainer}>
            <LeafletMap
              ref={mapRef}
              markers={leafletMarkers}
              userCoords={myCoords}
              onMarkerPress={handleMarkerPress}
              style={styles.map}
            />
            {/* OSM attribution overlay */}
            <View style={styles.osmAttrib} pointerEvents="none">
              <Text style={styles.osmText}>© OpenStreetMap contributors</Text>
            </View>
          </View>

          {/* ── People list ── */}
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={<EmptyState onSettings={() => router.push('/(tabs)/profile' as any)} />}
            renderItem={({ item }) => {
              const selected = selectedId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardAvatar, selected && styles.cardAvatarSelected]}>
                    <Text style={styles.cardEmoji}>{item.moodEmoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, selected && { color: Colors.primary }]}>
                      {item.fullName}
                    </Text>
                    <Text style={styles.cardSeen}>
                      📍 {formatLastSeen(item.locationUpdatedAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'navigate' : 'navigate-outline'}
                    size={20}
                    color={selected ? Colors.primary : Colors.textMuted}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Sharing off banner */}
      {!loading && !isSharing && (
        <View style={styles.sharingBanner}>
          <Ionicons name="location-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.sharingBannerText}>You're not sharing your location.</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={styles.sharingBannerLink}>Enable →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🗺️</Text>
      <Text style={styles.emptyTitle}>No locations shared yet</Text>
      <Text style={styles.emptyBody}>
        Friends and family can enable location sharing in their Profile settings.
        You can control who sees your location there too.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onSettings}>
        <Text style={styles.emptyCtaText}>Open Location Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textMuted },

  body: { flex: 1 },

  mapContainer: { height: 320, position: 'relative' },
  map: { flex: 1 },
  osmAttrib: {
    position: 'absolute',
    bottom: 4, right: 6,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4,
  },
  osmText: { fontSize: 9, color: '#444' },

  list: { flex: 1 },
  listContent: { padding: 14, gap: 10, flexGrow: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarSelected: { backgroundColor: Colors.primaryLight },
  cardEmoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardSeen: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  empty: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, paddingHorizontal: 24, gap: 10,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: 6, backgroundColor: Colors.primary,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sharingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.card,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  sharingBannerText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  sharingBannerLink: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
