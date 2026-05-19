import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { TAG_CATEGORIES } from '../constants/Moods';

const MAX_TAGS = 10;

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ selected, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [customTags, setCustomTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const base = TAG_CATEGORIES.flatMap((c) => c.tags);
    return [...base, ...customTags];
  }, [customTags]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return TAG_CATEGORIES;
    const q = search.toLowerCase();
    return TAG_CATEGORIES.map((cat) => ({
      ...cat,
      tags: cat.tags.filter((t) => t.toLowerCase().includes(q)),
    })).filter((cat) => cat.tags.length > 0);
  }, [search]);

  const customFiltered = useMemo(() => {
    if (!search.trim()) return customTags;
    return customTags.filter((t) => t.toLowerCase().includes(search.toLowerCase()));
  }, [search, customTags]);

  const searchMatchesExisting = search.trim()
    ? allTags.some((t) => t.toLowerCase() === search.trim().toLowerCase())
    : true;

  function toggleTag(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < MAX_TAGS) {
      onChange([...selected, tag]);
    }
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function addCustomTag() {
    const tag = search.trim();
    if (!tag || allTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setCustomTags((prev) => [...prev, tag]);
    if (selected.length < MAX_TAGS) onChange([...selected, tag]);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or add a tag…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
            onSubmitEditing={addCustomTag}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {search.trim().length > 0 && !searchMatchesExisting && (
          <TouchableOpacity style={styles.addBtn} onPress={addCustomTag} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Selected tags summary */}
      {selected.length > 0 && (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>Selected ({selected.length}/{MAX_TAGS})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedChips}>
            {selected.map((tag) => (
              <TouchableOpacity key={tag} style={styles.selectedChip} onPress={() => toggleTag(tag)}>
                <Text style={styles.selectedChipText}>{tag}</Text>
                <Ionicons name="close" size={12} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Custom tags section */}
      {customFiltered.length > 0 && (
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryTitle}>⭐ Custom</Text>
          <TagChipRow tags={customFiltered} selected={selected} onToggle={toggleTag} reachedMax={selected.length >= MAX_TAGS} />
        </View>
      )}

      {/* Category sections */}
      {(search.trim() ? filteredCategories : TAG_CATEGORIES).map((cat) => {
        const isExpanded = search.trim() ? true : expandedCategories.has(cat.category);
        const anySelected = cat.tags.some((t) => selected.includes(t));
        return (
          <View key={cat.category} style={styles.categoryBlock}>
            <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(cat.category)} activeOpacity={0.7}>
              <View style={styles.categoryLeft}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryTitle}>{cat.category}</Text>
                {anySelected && <View style={styles.activeDot} />}
              </View>
              {!search.trim() && (
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textMuted}
                />
              )}
            </TouchableOpacity>
            {isExpanded && (
              <TagChipRow
                tags={cat.tags}
                selected={selected}
                onToggle={toggleTag}
                reachedMax={selected.length >= MAX_TAGS}
              />
            )}
          </View>
        );
      })}

      {selected.length >= MAX_TAGS && (
        <Text style={styles.maxHint}>Maximum {MAX_TAGS} tags selected</Text>
      )}
    </View>
  );
}

function TagChipRow({
  tags,
  selected,
  onToggle,
  reachedMax,
}: {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  reachedMax: boolean;
}) {
  return (
    <View style={styles.chipRow}>
      {tags.map((tag) => {
        const active = selected.includes(tag);
        const disabled = reachedMax && !active;
        return (
          <TouchableOpacity
            key={tag}
            style={[
              styles.chip,
              active && styles.chipActive,
              disabled && styles.chipDisabled,
            ]}
            onPress={() => onToggle(tag)}
            disabled={disabled}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRow: { gap: 8 },
  selectedLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  selectedChips: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  selectedChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  categoryBlock: { gap: 8 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryIcon: { fontSize: 15 },
  categoryTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  chipTextDisabled: { color: Colors.textMuted },

  maxHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
});
