import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, G } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../store/AuthContext";
import { useMood } from "../../store/MoodContext";
import { searchUsers, fetchMemberCurrentMoodEmoji } from "../../services/userService";
import { UserProfile } from "../../types/auth";
import { MOODS } from "../../constants/Moods";
import { MoodLevel } from "../../types";
import debounce from "lodash.debounce";

const { width } = Dimensions.get("window");
const CHART_WIDTH  = width - 76;   // wider — only yAxis (28px) + padding
const CHART_HEIGHT = 200;           // taller so lines are clearly visible
const CHART_PAD    = 10;            // top/bottom padding so dots at extremes aren't clipped

const MEMBER_COLORS = [
  "#7C3AED",
  "#2563EB",
  "#059669",
  "#DC2626",
  "#D97706",
  "#0891B2",
  "#BE185D",
  "#65A30D",
];

// emoji → MoodLevel lookup built from MOODS config (single source of truth)
const emojiToLevel: Record<string, MoodLevel> = Object.fromEntries(
  MOODS.map((m) => [m.emoji, m.level]),
) as Record<string, MoodLevel>;

const moodEmojiByLevel: Record<MoodLevel, string> = Object.fromEntries(
  MOODS.map((m) => [m.level, m.emoji]),
) as Record<MoodLevel, string>;

const moodScale = [...MOODS].sort((a, b) => a.level - b.level);

type ChartPeriod = "weekly" | "monthly";

// Full "YYYY-MM-DD" keyed store — works correctly across month boundaries
type MoodStore = Record<string, MoodLevel>;
type MoodDataMap = Record<string, MoodStore>;

type CircleMember = Partial<UserProfile> & {
  name?: string;
  role?: string;
  isYou?: boolean;
};

// ── helpers ────────────────────────────────────────────────────────────────────

const getMemberName = (m: CircleMember) => m.name || m.fullName || "Unnamed user";

const getInitials = (m: CircleMember) => {
  const name = getMemberName(m).replace(" (You)", "");
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

// Maps mood level to Y coordinate with top/bottom padding so dots never clip
const getMoodY = (level: MoodLevel) =>
  CHART_PAD + ((5 - (level - 1)) / 5) * (CHART_HEIGHT - 2 * CHART_PAD);

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayStr = toDateStr(new Date());

// ── AsyncStorage for OTHER members' mood cache ─────────────────────────────────
// Login user's mood comes from SQLite (MoodContext). Only other members use this.

const peerMoodStoreKey = (memberId: string) => `peer_mood_v1_${memberId}`;

const loadPeerStore = async (memberId: string): Promise<MoodStore> => {
  try {
    const raw = await AsyncStorage.getItem(peerMoodStoreKey(memberId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Save peer store, pruning entries older than 30 days.
 * This implements the rolling 30-record offline buffer:
 * as each new day's record is written, old ones age out automatically.
 */
const savePeerStore = async (memberId: string, store: MoodStore) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const pruned = Object.fromEntries(
      Object.entries(store).filter(([k]) => new Date(k) >= cutoff),
    );
    await AsyncStorage.setItem(peerMoodStoreKey(memberId), JSON.stringify(pruned));
  } catch {}
};

// ── chart date builder ─────────────────────────────────────────────────────────

type DateEntry = { label: string; dateStr: string };

const buildDateEntries = (period: ChartPeriod): DateEntry[] => {
  const today = new Date();
  if (period === "weekly") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        label: `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`,
        dateStr: toDateStr(d),
      };
    });
  }
  const year  = today.getFullYear();
  const month = today.getMonth();
  return Array.from({ length: today.getDate() }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { label: `${i + 1}`, dateStr: toDateStr(d) };
  });
};

// ── persistence keys ───────────────────────────────────────────────────────────

// Keys are per-user so data is isolated between accounts and survives logout/login
const skFamily    = (uid: string) => `circle_family_v5_${uid}`;
const skFriends   = (uid: string) => `circle_friends_v5_${uid}`;
const skShareMood  = (uid: string) => `privacy_share_mood_${uid}`;
const skShareNotes = (uid: string) => `privacy_share_notes_${uid}`;

// ── component ─────────────────────────────────────────────────────────────────

export default function FamilyFriendsScreen() {
  const { user: currentUser } = useAuth();
  // SQLite-backed real mood history for the logged-in user
  const { entries: myEntries } = useMood();

  const adminMember: CircleMember = useMemo(
    () => ({
      id: currentUser?.id || "you",
      name: `${currentUser?.fullName || (currentUser as any)?.displayName || "You"} (You)`,
      role: "Admin",
      isYou: true,
    }),
    [currentUser?.id, currentUser?.fullName, (currentUser as any)?.displayName],
  );

  const [activeTab, setActiveTab]         = useState<"family" | "friends">("family");
  const [shareMood, setShareMood]         = useState(true);
  const [shareNotes, setShareNotes]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [chartPeriod, setChartPeriod]     = useState<ChartPeriod>("weekly");

  const [familyMembers, setFamilyMembers] = useState<CircleMember[]>([adminMember]);
  const [friendMembers, setFriendMembers] = useState<CircleMember[]>([adminMember]);
  // Ref (not state) so toggling it never triggers a re-render or spurious persist writes
  const readyToSaveRef = useRef(false);

  // memberId → full-date MoodStore
  const [moodData, setMoodData] = useState<MoodDataMap>({});

  // ── build admin's MoodStore directly from SQLite entries (no network needed) ──
  // myEntries is ordered DESC by createdAt; take the first (latest) entry per day.
  const adminMoodStore: MoodStore = useMemo(() => {
    const store: MoodStore = {};
    for (const entry of myEntries) {
      if (!store[entry.date]) store[entry.date] = entry.mood;
    }
    return store;
  }, [myEntries]);

  // Keep moodData in sync with adminMoodStore whenever SQLite entries change
  useEffect(() => {
    if (!adminMember.id) return;
    setMoodData((prev) => ({ ...prev, [adminMember.id!]: adminMoodStore }));
  }, [adminMoodStore, adminMember.id]);

  // ── load persisted state — re-runs whenever the logged-in user changes ──────────
  // Keys are per-user so data survives logout/login and is isolated between accounts.
  useEffect(() => {
    if (!adminMember.id || adminMember.id === "you") return; // wait for real user ID
    readyToSaveRef.current = false; // block saves while we're loading
    const uid = adminMember.id;
    (async () => {
      try {
        const [fam, fri, sm, sn] = await Promise.all([
          AsyncStorage.getItem(skFamily(uid)),
          AsyncStorage.getItem(skFriends(uid)),
          AsyncStorage.getItem(skShareMood(uid)),
          AsyncStorage.getItem(skShareNotes(uid)),
        ]);
        if (fam) {
          const parsed: CircleMember[] = JSON.parse(fam);
          setFamilyMembers([adminMember, ...parsed.filter((m) => !m.isYou)]);
        }
        if (fri) {
          const parsed: CircleMember[] = JSON.parse(fri);
          setFriendMembers([adminMember, ...parsed.filter((m) => !m.isYou)]);
        }
        if (sm !== null) setShareMood(JSON.parse(sm));
        if (sn !== null) setShareNotes(JSON.parse(sn));
      } catch {}
      readyToSaveRef.current = true;
    })();
  }, [adminMember.id]); // re-run when the user changes (login/logout)

  // ── keep admin profile name/avatar current in both lists ──────────────────────
  useEffect(() => {
    setFamilyMembers((prev) => prev.map((m) => (m.isYou ? { ...m, ...adminMember } : m)));
    setFriendMembers((prev) => prev.map((m) => (m.isYou ? { ...m, ...adminMember } : m)));
  }, [adminMember.name]);

  // ── persist — only fire after load completes, keyed to the current user ────────
  useEffect(() => {
    if (!readyToSaveRef.current || !adminMember.id || adminMember.id === "you") return;
    AsyncStorage.setItem(skFamily(adminMember.id), JSON.stringify(familyMembers)).catch(() => {});
  }, [familyMembers]);

  useEffect(() => {
    if (!readyToSaveRef.current || !adminMember.id || adminMember.id === "you") return;
    AsyncStorage.setItem(skFriends(adminMember.id), JSON.stringify(friendMembers)).catch(() => {});
  }, [friendMembers]);

  useEffect(() => {
    if (!readyToSaveRef.current || !adminMember.id || adminMember.id === "you") return;
    AsyncStorage.setItem(skShareMood(adminMember.id), JSON.stringify(shareMood)).catch(() => {});
  }, [shareMood]);

  useEffect(() => {
    if (!readyToSaveRef.current || !adminMember.id || adminMember.id === "you") return;
    AsyncStorage.setItem(skShareNotes(adminMember.id), JSON.stringify(shareNotes)).catch(() => {});
  }, [shareNotes]);

  // ── derived ────────────────────────────────────────────────────────────────────
  const currentMembers = activeTab === "family" ? familyMembers : friendMembers;
  const dateEntries    = useMemo(() => buildDateEntries(chartPeriod), [chartPeriod]);
  const xStep          = dateEntries.length > 1 ? CHART_WIDTH / (dateEntries.length - 1) : 0;

  // Load peer mood data after the initial storage load completes
  const [peerLoadTick, setPeerLoadTick] = useState(0);
  useEffect(() => {
    if (!readyToSaveRef.current) return;
    setPeerLoadTick((t) => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMembers.map((m) => m.id).join(","), activeTab]);

  useEffect(() => {
    if (peerLoadTick === 0) return;
    const peers = currentMembers.filter((m) => !m.isYou && m.id);
    if (peers.length === 0) return;

    (async () => {
      const updates: MoodDataMap = {};
      await Promise.all(
        peers.map(async (member) => {
          const id = member.id!;
          const store = await loadPeerStore(id);

          try {
            const emoji = await fetchMemberCurrentMoodEmoji(id);
            if (emoji) {
              const level = emojiToLevel[emoji];
              if (level) {
                store[todayStr] = level;
                await savePeerStore(id, store);
              }
            }
          } catch {
            // network unavailable — use cached data only
          }

          updates[id] = { ...store };
        }),
      );
      setMoodData((prev) => ({ ...prev, ...updates }));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerLoadTick]);

  // ── search ─────────────────────────────────────────────────────────────────────
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) { setSearchResults([]); return; }
      const results = await searchUsers(query);
      setSearchResults(
        results.filter(
          (u) =>
            u.id !== currentUser?.id &&
            !familyMembers.some((m) => m.id === u.id) &&
            !friendMembers.some((m) => m.id === u.id),
        ),
      );
    }, 500),
    [currentUser, familyMembers, friendMembers],
  );
  useEffect(() => { performSearch(searchQuery); }, [performSearch, searchQuery]);

  // ── member management ──────────────────────────────────────────────────────────
  const addMember = (user: UserProfile, list: "family" | "friends") => {
    const member: CircleMember = {
      ...user,
      role: list === "family" ? "Family" : "Friend",
      isYou: false,
    };
    if (list === "family") setFamilyMembers((prev) => [...prev, member]);
    else { setFriendMembers((prev) => [...prev, member]); setActiveTab("friends"); }
    setSearchResults((prev) => prev.filter((item) => item.id !== user.id));
  };

  const deleteMember = (member: CircleMember) => {
    if (member.isYou) return;
    Alert.alert(
      "Remove member?",
      `Remove ${getMemberName(member)} from your ${activeTab} list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (activeTab === "family")
              setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id));
            else
              setFriendMembers((prev) => prev.filter((m) => m.id !== member.id));
          },
        },
      ],
    );
  };

  const moveMember = (member: CircleMember) => {
    if (member.isYou) return;
    const moveTo = activeTab === "family" ? "friends" : "family";
    Alert.alert(
      "Move member",
      `Move ${getMemberName(member)} to ${moveTo === "family" ? "Family" : "Friends"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          onPress: () => {
            if (activeTab === "family") {
              setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id));
              setFriendMembers((prev) => [...prev, { ...member, role: "Friend" }]);
              setActiveTab("friends");
            } else {
              setFriendMembers((prev) => prev.filter((m) => m.id !== member.id));
              setFamilyMembers((prev) => [...prev, { ...member, role: "Family" }]);
              setActiveTab("family");
            }
          },
        },
      ],
    );
  };

  // ── chart line renderer ────────────────────────────────────────────────────────
  const renderMemberLine = (member: CircleMember, color: string) => {
    if (member.isYou && !shareMood) return null;

    const store = moodData[member.id || ""] || {};
    const pts   = dateEntries.map((entry, i) => {
      const mood = store[entry.dateStr];
      return mood !== undefined ? { x: i * xStep, y: getMoodY(mood) } : null;
    });

    if (!pts.some(Boolean)) return null;

    return (
      <G key={`group-${member.id}`}>
        {pts.map((pt, i) => {
          if (i === 0 || !pt || !pts[i - 1]) return null;
          const prev = pts[i - 1]!;
          return (
            <Line
              key={`ln-${member.id}-${i}`}
              x1={prev.x.toString()} y1={prev.y.toString()}
              x2={pt.x.toString()}  y2={pt.y.toString()}
              stroke={color} strokeWidth="2.5"
            />
          );
        })}
        {pts.map((pt, i) =>
          pt ? (
            <Circle
              key={`dot-${member.id}-${i}`}
              cx={pt.x.toString()} cy={pt.y.toString()}
              r="5" fill={color} stroke="#FFFFFF" strokeWidth="2"
            />
          ) : null,
        )}
      </G>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Family & Friends Circle</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["family", "friends"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "family" ? "Family" : "Friends"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Search results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsCard}>
            <Text style={styles.searchTitle}>Search Results</Text>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.searchItem}>
                <View style={styles.searchUser}>
                  <View style={[styles.initialsCircle, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={[styles.initialsText, { color: Colors.primary }]}>
                      {user.fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.searchName}>{user.fullName}</Text>
                    <Text style={styles.searchEmail}>{user.email}</Text>
                  </View>
                </View>
                <View style={styles.searchActions}>
                  <TouchableOpacity style={styles.addChoiceBtn} onPress={() => addMember(user, "family")}>
                    <Text style={styles.addChoiceText}>Family</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addChoiceBtn} onPress={() => addMember(user, "friends")}>
                    <Text style={styles.addChoiceText}>Friend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chartTitle}>
                {activeTab === "family" ? "Family Mood" : "Friends Mood"}
              </Text>
              <Text style={styles.chartSubtitle}>
                {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
              </Text>
            </View>
            <View style={styles.periodToggle}>
              {(["weekly", "monthly"] as ChartPeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodButton, chartPeriod === period && styles.periodButtonActive]}
                  onPress={() => setChartPeriod(period)}
                >
                  <Text style={[styles.periodButtonText, chartPeriod === period && styles.periodButtonTextActive]}>
                    {period === "weekly" ? "7D" : "MTD"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {currentMembers.length === 0 ? (
            <Text style={styles.emptyChart}>
              Add a {activeTab === "family" ? "family member" : "friend"} to see mood trends.
            </Text>
          ) : (
            <View style={styles.chartBody}>
              <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
                {[...moodScale].reverse().map((mood) => (
                  <Text key={mood.level} style={styles.yEmojiLabel}>{mood.emoji}</Text>
                ))}
              </View>

              <View style={{ width: CHART_WIDTH }}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  {moodScale.map((mood) => {
                    const y = getMoodY(mood.level as MoodLevel);
                    return (
                      <Line key={`hg-${mood.level}`}
                        x1="0" y1={y.toString()} x2={CHART_WIDTH.toString()} y2={y.toString()}
                        stroke="#F3F4F6" strokeWidth="1"
                      />
                    );
                  })}
                  {dateEntries.map((entry, i) => (
                    <Line key={`vg-${entry.dateStr}`}
                      x1={(i * xStep).toString()} y1="0"
                      x2={(i * xStep).toString()} y2={CHART_HEIGHT.toString()}
                      stroke="#F3F4F6" strokeWidth="1"
                    />
                  ))}
                  {currentMembers.map((member, index) =>
                    renderMemberLine(member, MEMBER_COLORS[index % MEMBER_COLORS.length]),
                  )}
                </Svg>

                <View style={styles.xAxis}>
                  {dateEntries
                    .filter((_, i) =>
                      chartPeriod === "weekly"
                        ? true
                        : i === 0 || i === dateEntries.length - 1 || (i + 1) % 7 === 0,
                    )
                    .map((entry) => (
                      <Text key={entry.dateStr} style={styles.xDateLabel}>{entry.label}</Text>
                    ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* AI insight — derived from real moodData */}
        {(() => {
          const peers = currentMembers.filter((m) => !m.isYou);
          const label = activeTab === "family" ? "Family" : "Friends";

          // Collect today's moods for all members
          const todayMoods = currentMembers
            .map((m) => ({ name: getMemberName(m).replace(" (You)", ""), mood: moodData[m.id || ""]?.[todayStr] }))
            .filter((x) => x.mood !== undefined) as { name: string; mood: MoodLevel }[];

          const moodEmojiMap: Record<MoodLevel, string> = moodEmojiByLevel;

          let insight = "";
          if (todayMoods.length === 0) {
            insight = peers.length === 0
              ? `Add ${label.toLowerCase()} members to compare moods and see insights here.`
              : `No moods logged yet today. Check back after your ${label.toLowerCase()} have tracked their day.`;
          } else {
            const avg = todayMoods.reduce((s, x) => s + x.mood, 0) / todayMoods.length;
            const avgRounded = Math.round(avg) as MoodLevel;
            const topMember = [...todayMoods].sort((a, b) => b.mood - a.mood)[0];
            const lowMember = [...todayMoods].sort((a, b) => a.mood - b.mood)[0];
            const emoji = moodEmojiMap[avgRounded];
            if (todayMoods.length === 1) {
              insight = `${topMember.name} is feeling ${moodEmojiMap[topMember.mood]} today. Keep the connection going — a quick message goes a long way!`;
            } else if (topMember.mood === lowMember.mood) {
              insight = `Everyone in your ${label.toLowerCase()} circle is feeling ${emoji} today. Great synchrony!`;
            } else {
              insight = `${label} avg mood today is ${emoji}. ${topMember.name} is the brightest ${moodEmojiMap[topMember.mood as MoodLevel]} — maybe check in with ${lowMember.name} ${moodEmojiMap[lowMember.mood as MoodLevel]}.`;
            }
          }

          return (
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>✨ {label} Insight</Text>
              <Text style={styles.aiBody}>{insight}</Text>
            </View>
          );
        })()}

        {/* Member cards */}
        <View style={styles.memberSection}>
          <View style={styles.memberSectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === "family" ? "Family Members" : "Friends"}
            </Text>
            <TouchableOpacity style={styles.inviteButton}>
              <Ionicons name="person-add-outline" size={16} color="#5B21B6" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 12, paddingVertical: 4 }}>
              {currentMembers.map((member, index) => {
                const color     = MEMBER_COLORS[index % MEMBER_COLORS.length];
                const store     = moodData[member.id || ""] || {};
                const todayMood = store[todayStr];
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={[styles.memberInitialsCircle, { backgroundColor: color + "22", borderColor: color }]}>
                      <Text style={[styles.memberInitialsText, { color }]}>{getInitials(member)}</Text>
                    </View>
                    <Text style={styles.memberCardName} numberOfLines={1}>
                      {getMemberName(member).replace(" (You)", "")}
                    </Text>
                    <Text style={styles.memberCardRole} numberOfLines={1}>
                      {member.isYou ? "You ★" : member.role || (activeTab === "family" ? "Family" : "Friend")}
                    </Text>
                    {todayMood && (
                      <Text style={styles.todayMoodEmoji}>{moodEmojiByLevel[todayMood]}</Text>
                    )}
                    {!member.isYou && (
                      <View style={styles.memberCardActions}>
                        <TouchableOpacity style={styles.cardIconBtn} onPress={() => moveMember(member)}>
                          <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cardIconBtn} onPress={() => deleteMember(member)}>
                          <Ionicons name="trash-outline" size={14} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={[styles.colorStrip, { backgroundColor: color }]} />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Privacy Settings */}
        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.settingCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Share my mood</Text>
                <Text style={styles.toggleSub}>Show my line on others' charts</Text>
              </View>
              <Switch
                value={shareMood}
                onValueChange={setShareMood}
                trackColor={{ false: Colors.border, true: "#22C55E" }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={[styles.toggleRow, { marginTop: 20 }]}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Share my notes</Text>
                <Text style={styles.toggleSub}>(With family)</Text>
              </View>
              <Switch
                value={shareNotes}
                onValueChange={setShareNotes}
                trackColor={{ false: Colors.border, true: "#22C55E" }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },

  tabRow: { flexDirection: "row", justifyContent: "center", marginBottom: 10 },
  tab: { marginHorizontal: 10, paddingBottom: 4, borderBottomWidth: 2, borderColor: "transparent" },
  tabActive: { borderColor: Colors.primary },
  tabText: { fontWeight: "400", color: Colors.textPrimary, fontSize: 16 },
  tabTextActive: { fontWeight: "700" },

  searchContainer: { paddingHorizontal: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  searchResultsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  searchTitle: { fontSize: 14, fontWeight: "700", color: Colors.primary, marginBottom: 12 },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  searchUser: { flexDirection: "row", alignItems: "center", gap: 10 },
  initialsCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  initialsText: { fontSize: 13, fontWeight: "700" },
  searchName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  searchEmail: { fontSize: 12, color: Colors.textMuted },
  searchActions: { flexDirection: "row", gap: 8 },
  addChoiceBtn: {
    minWidth: 56, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 10,
  },
  addChoiceText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },

  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    paddingBottom: 18,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  chartHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", gap: 10, marginBottom: 10,
  },
  chartTitle:    { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  chartSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  periodToggle:  { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 2 },
  periodButton:  { paddingHorizontal: 8, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  periodButtonActive:     { backgroundColor: Colors.white },
  periodButtonText:       { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  periodButtonTextActive: { color: Colors.primary },
  emptyChart: { textAlign: "center", color: Colors.textMuted, fontSize: 13, paddingVertical: 30 },
  chartBody:  { flexDirection: "row", alignItems: "flex-start" },
  yAxis: { justifyContent: "space-between", paddingRight: 6, width: 30 },
  yEmojiLabel: { fontSize: 15, textAlign: "center" },
  xAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 2 },
  xDateLabel: { fontSize: 9, color: Colors.textSecondary, textAlign: "center" },

  aiCard:  { backgroundColor: "#F3F4F6", borderRadius: 14, padding: 14 },
  aiTitle: { fontWeight: "700", fontSize: 14, color: Colors.primary, marginBottom: 4 },
  aiBody:  { color: Colors.textSecondary, fontSize: 12 },

  memberSection: {},
  memberSectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  inviteButton: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1,
    borderColor: "#E9D5FF", backgroundColor: "#FAF5FF",
  },
  inviteButtonText: { color: "#5B21B6", fontWeight: "600", fontSize: 12 },

  memberCard: {
    width: 96,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingTop: 12, paddingHorizontal: 10, paddingBottom: 16,
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  memberInitialsCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, marginBottom: 6,
  },
  memberInitialsText: { fontSize: 17, fontWeight: "700" },
  memberCardName: { fontSize: 11, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  memberCardRole: { fontSize: 10, color: Colors.textSecondary, textAlign: "center", marginTop: 1 },
  todayMoodEmoji: { fontSize: 18, marginTop: 4 },
  memberCardActions: { flexDirection: "row", gap: 6, marginTop: 8 },
  cardIconBtn: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: "#F9FAFB",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  colorStrip: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3 },

  privacySection: { gap: 10 },
  settingCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  toggleRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  toggleSub:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
