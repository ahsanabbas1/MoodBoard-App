import { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { toDateString } from '../utils/date';

interface Props {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  loggedDates: Set<string>;
  onSelect: (date: string) => void;
  onClose: () => void;
}

interface DayItem {
  dateStr: string;
  label: string;       // "Today", "Yesterday", or "Mon, 12 May"
  isToday: boolean;
  alreadyLogged: boolean;
  weekday: string;
  dateNum: number;
  month: string;
}

export default function DatePickerModal({ visible, selectedDate, loggedDates, onSelect, onClose }: Props) {
  const days = useMemo<DayItem[]>(() => {
    const today = new Date();
    return Array.from({ length: 90 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toDateString(d);
      const isToday = i === 0;
      const isYesterday = i === 1;
      let label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (isToday) label = 'Today';
      else if (isYesterday) label = 'Yesterday';
      return {
        dateStr,
        label,
        isToday,
        alreadyLogged: loggedDates.has(dateStr),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
      };
    });
  }, [loggedDates]);

  function handleSelect(dateStr: string) {
    onSelect(dateStr);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>You can log a mood for any of the last 90 days.</Text>

          <FlatList
            data={days}
            keyExtractor={(d) => d.dateStr}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = item.dateStr === selectedDate;
              return (
                <TouchableOpacity
                  style={[styles.dayRow, isSelected && styles.dayRowSelected]}
                  onPress={() => handleSelect(item.dateStr)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayLeft}>
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                      {item.label}
                    </Text>
                    {!item.isToday && (
                      <Text style={styles.dayDate}>{item.dateStr}</Text>
                    )}
                  </View>
                  <View style={styles.dayRight}>
                    {item.alreadyLogged && (
                      <View style={styles.loggedBadge}>
                        <Text style={styles.loggedBadgeText}>Logged</Text>
                      </View>
                    )}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  list: { gap: 6, paddingBottom: 20 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dayLeft: { gap: 2 },
  dayLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dayLabelSelected: { color: Colors.primary },
  dayDate: { fontSize: 12, color: Colors.textMuted },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loggedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loggedBadgeText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
});
