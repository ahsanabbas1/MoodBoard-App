import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Dimensions, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { useAuth } from '../../store/AuthContext';
import { searchUsers } from '../../services/userService';
import { UserProfile } from '../../types/auth';
import debounce from 'lodash.debounce';

const { width } = Dimensions.get('window');

// Mock Data for the chart
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chartWidth = width - 80; // Accounting for padding
const chartHeight = 120;
const xStep = chartWidth / 6;

const greenData = [80, 50, 30, 25, 20, 40, 50]; // Mock points
const yellowData = [100, 70, 60, 65, 60, 90, 80];
const purpleData = [120, 105, 95, 105, 115, 110, 120];

// Format points to SVG polyline format
const formatPoints = (data: number[]) => {
  return data.map((y, index) => `${index * xStep},${y}`).join(' ');
};

const greenPoints = formatPoints(greenData);
const yellowPoints = formatPoints(yellowData);
const purplePoints = formatPoints(purpleData);

const staticMembers = [
  { id: '1', name: 'Ayesha (You)', role: 'Admin', isYou: true, image: 'https://i.pravatar.cc/150?img=47' },
  { id: '2', name: 'Usman', role: 'Member', isYou: false, image: 'https://i.pravatar.cc/150?img=11' },
  { id: '3', name: 'Hina', role: 'Member', isYou: false, image: 'https://i.pravatar.cc/150?img=32' },
];

export default function FamilyScreen() {
  const { user: currentUser } = useAuth();
  const [shareMood, setShareMood] = useState(true);
  const [shareNotes, setShareNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const visibilityOptions = ['All Members', 'Close Friends', 'Colleagues', 'Extended Family'];
  const [visibilityIndex, setVisibilityIndex] = useState(0);

  const cycleVisibility = () => {
    setVisibilityIndex((prev) => (prev + 1) % visibilityOptions.length);
  };

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results.filter(u => u.id !== currentUser?.id));
      setIsSearching(false);
    }, 500),
    [currentUser]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Family Circle</Text>
        <TouchableOpacity>
          <Ionicons name="people" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {searchResults.length > 0 && (
          <View style={styles.searchResultsCard}>
            <Text style={styles.searchTitle}>Search Results</Text>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.searchItem}>
                <View style={styles.searchUser}>
                  <View style={[styles.miniAvatar, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={styles.miniAvatarText}>{user.fullName.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.searchName}>{user.fullName}</Text>
                    <Text style={styles.searchEmail}>{user.email}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="person-add" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Family Mood Overview</Text>
          <Text style={styles.chartSubtitle}>This Week</Text>

          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              <Text style={styles.yEmoji}>😄</Text>
              <Text style={styles.yEmoji}>😐</Text>
              <Text style={styles.yEmoji}>😡</Text>
            </View>

            <View style={styles.svgContainer}>
              <Svg width={chartWidth} height={chartHeight}>
                <Line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#F3F4F6" strokeWidth="1" />
                <Polyline points={greenPoints} fill="none" stroke="#22C55E" strokeWidth="2" />
                {greenData.map((y, i) => (
                  <Circle key={`g-${i}`} cx={i * xStep} cy={y} r="3" fill="#FFFFFF" stroke="#22C55E" strokeWidth="2" />
                ))}
                <Polyline points={yellowPoints} fill="none" stroke="#EAB308" strokeWidth="2" />
                {yellowData.map((y, i) => (
                  <Circle key={`y-${i}`} cx={i * xStep} cy={y} r="3" fill="#FFFFFF" stroke="#EAB308" strokeWidth="2" />
                ))}
                <Polyline points={purplePoints} fill="none" stroke="#8B5CF6" strokeWidth="2" />
                {purpleData.map((y, i) => (
                  <Circle key={`p-${i}`} cx={i * xStep} cy={y} r="3" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2" />
                ))}
              </Svg>

              <View style={styles.xAxis}>
                {days.map((day) => (
                  <Text key={day} style={styles.xLabel}>{day}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Two Columns Layout */}
        <View style={styles.columnsContainer}>
          <View style={styles.leftColumn}>
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.membersList}>
              {staticMembers.map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <Image source={{ uri: member.image }} style={styles.avatar} />
                  <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.isYou && <Text style={styles.crown}>👑</Text>}
                    </View>
                    <Text style={styles.memberRole}>{member.role}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.inviteButton}>
              <Ionicons name="person-add-outline" size={18} color="#5B21B6" />
              <Text style={styles.inviteButtonText}>Invite Member</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightColumn}>
            <Text style={styles.sectionTitleRight}>Privacy Settings</Text>
            <View style={styles.settingCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Share my mood</Text>
                  <Text style={styles.toggleSub}>(Emoji only)</Text>
                </View>
                <Switch
                  value={shareMood}
                  onValueChange={setShareMood}
                  trackColor={{ false: Colors.border, true: '#22C55E' }}
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
                  trackColor={{ false: Colors.border, true: '#22C55E' }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.navCard} onPress={cycleVisibility}>
              <View>
                <Text style={styles.navCardTitle}>Visible to</Text>
                <Text style={styles.navCardValue}>{visibilityOptions[visibilityIndex]}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  
  searchContainer: { paddingHorizontal: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  
  searchResultsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  searchTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 12 },
  searchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  searchUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  searchName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  searchEmail: { fontSize: 12, color: Colors.textMuted },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  chartSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  chartContainer: { flexDirection: 'row' },
  yAxis: { justifyContent: 'space-between', paddingRight: 10, height: chartHeight, paddingVertical: 10 },
  yEmoji: { fontSize: 18 },
  svgContainer: { flex: 1, height: chartHeight + 30 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginLeft: -10 },
  xLabel: { fontSize: 12, color: Colors.textMuted },

  columnsContainer: { flexDirection: 'row', gap: 16 },
  leftColumn: { flex: 1.1 },
  rightColumn: { flex: 1, gap: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  sectionTitleRight: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  membersList: { gap: 16, marginBottom: 20 },
  memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  crown: { fontSize: 14 },
  memberRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
    gap: 8,
  },
  inviteButtonText: { color: '#5B21B6', fontWeight: '600', fontSize: 14 },

  settingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  navCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  navCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  navCardValue: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
});
