import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import {
  EMOTION_WHEEL,
  CoreEmotion,
  SecondaryEmotion,
  EmotionSelection,
} from '../constants/EmotionWheel';
import { Colors } from '../constants/Colors';

interface Props {
  onSelect: (emotion: EmotionSelection | null) => void;
  selection: EmotionSelection | null;
}

// ─── geometry ─────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const SIZE = Math.min(SCREEN_W - 40, 310);
const CX = SIZE / 2;
const CY = SIZE / 2;
const CENTER_R = 54;   // white center circle
const INNER_R = 58;    // ring inner edge (just outside center circle)
const OUTER_R = SIZE / 2 - 3; // ring outer edge
const LABEL_R = (INNER_R + OUTER_R) / 2; // label placement radius

type Level = 'core' | 'secondary' | 'tertiary';

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function polarXY(r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(r1: number, r2: number, startDeg: number, endDeg: number): string {
  const s1 = polarXY(r1, startDeg);
  const e1 = polarXY(r1, endDeg);
  const s2 = polarXY(r2, startDeg);
  const e2 = polarXY(r2, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s1.x} ${s1.y} L ${s2.x} ${s2.y} A ${r2} ${r2} 0 ${large} 1 ${e2.x} ${e2.y} L ${e1.x} ${e1.y} A ${r1} ${r1} 0 ${large} 0 ${s1.x} ${s1.y} Z`;
}


// ─── Slice data types ─────────────────────────────────────────────────────────

interface SliceData {
  label: string;
  emoji: string;
  fill: string;
  strokeColor: string;
  textFill: string;
  startDeg: number;
  endDeg: number;
  index: number; // index into source array for onPress lookup
}

function buildSlices(level: Level, activeCore: CoreEmotion | null, activeSec: SecondaryEmotion | null): SliceData[] {
  if (level === 'core') {
    const n = EMOTION_WHEEL.length;
    return EMOTION_WHEEL.map((core, i) => ({
      label: core.label,
      emoji: core.emoji,
      fill: core.color,
      strokeColor: 'rgba(255,255,255,0.6)',
      textFill: core.textColor,
      startDeg: (i / n) * 360,
      endDeg: ((i + 1) / n) * 360,
      index: i,
    }));
  }

  if (level === 'secondary' && activeCore) {
    const secs = activeCore.secondary;
    const n = secs.length;
    return secs.map((sec, i) => ({
      label: sec.label,
      emoji: sec.emoji,
      fill: interpolateColor(activeCore.color, activeCore.terColor, i / (n - 1)),
      strokeColor: 'rgba(255,255,255,0.7)',
      textFill: activeCore.textColor,
      startDeg: (i / n) * 360,
      endDeg: ((i + 1) / n) * 360,
      index: i,
    }));
  }

  if (level === 'tertiary' && activeSec && activeCore) {
    const ters = activeSec.children;
    const n = ters.length;
    return ters.map((ter, i) => ({
      label: ter.label,
      emoji: ter.emoji,
      fill: i === 0 ? activeCore.secColor : activeCore.terColor,
      strokeColor: 'rgba(255,255,255,0.7)',
      textFill: activeCore.textColor,
      startDeg: (i / n) * 360,
      endDeg: ((i + 1) / n) * 360,
      index: i,
    }));
  }

  return [];
}

// Simple linear color interpolation for gradient secondary ring colors
function interpolateColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Adaptive font sizes — bigger and proportional to available space per slice
function getFontSizes(sliceCount: number, labelLength: number) {
  const emojiSize = sliceCount <= 2 ? 38 : sliceCount <= 4 ? 30 : sliceCount <= 7 ? 24 : 20;
  const baseText  = sliceCount <= 2 ? 16 : sliceCount <= 4 ? 14 : sliceCount <= 7 ? 12 : 10;
  // Trim slightly for long labels (> 9 chars) to avoid overflow
  const textSize  = labelLength > 9 ? baseText - 1.5 : baseText;
  return { emojiSize, textSize: Math.max(9, textSize) };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmotionWheelPicker({ onSelect, selection }: Props) {
  const [level, setLevel] = useState<Level>('core');
  const [activeCore, setActiveCore] = useState<CoreEmotion | null>(null);
  const [activeSec, setActiveSec] = useState<SecondaryEmotion | null>(null);

  const slices = useMemo(
    () => buildSlices(level, activeCore, activeSec),
    [level, activeCore, activeSec],
  );

  // ── Interaction handlers ─────────────────────────────────────────────────
  function handleSlicePress(sl: SliceData) {
    if (level === 'core') {
      const core = EMOTION_WHEEL[sl.index];
      setActiveCore(core);
      setActiveSec(null);
      setLevel('secondary');
      onSelect({ label: core.label, core: core.label, emoji: core.emoji });
    } else if (level === 'secondary' && activeCore) {
      const sec = activeCore.secondary[sl.index];
      setActiveSec(sec);
      setLevel('tertiary');
      onSelect({ label: sec.label, core: activeCore.label, emoji: sec.emoji });
    } else if (level === 'tertiary' && activeSec && activeCore) {
      const ter = activeSec.children[sl.index];
      onSelect({ label: ter.label, core: activeCore.label, emoji: ter.emoji });
    }
  }

  function goBack() {
    if (level === 'tertiary') {
      setLevel('secondary');
      setActiveSec(null);
      if (activeCore) onSelect({ label: activeCore.label, core: activeCore.label, emoji: activeCore.emoji });
    } else if (level === 'secondary') {
      setLevel('core');
      setActiveCore(null);
      onSelect(null);
    }
  }

  function reset() {
    setLevel('core');
    setActiveCore(null);
    setActiveSec(null);
    onSelect(null);
  }

  const canGoBack = level !== 'core';
  const accentColor = activeCore?.color ?? Colors.primary;

  return (
    <View style={styles.container}>

      {/* ── Breadcrumb path ── */}
      <View style={styles.breadcrumb}>
        <TouchableOpacity onPress={reset} style={styles.crumbItem}>
          <Text style={[styles.crumbText, level === 'core' && { color: accentColor, fontWeight: '700' }]}>
            All
          </Text>
        </TouchableOpacity>
        {activeCore && (
          <>
            <Text style={styles.crumbArrow}>›</Text>
            <TouchableOpacity
              onPress={() => { setLevel('secondary'); setActiveSec(null); if (activeCore) onSelect({ label: activeCore.label, core: activeCore.label, emoji: activeCore.emoji }); }}
              style={styles.crumbItem}
            >
              <Text style={[styles.crumbText, level === 'secondary' && { color: accentColor, fontWeight: '700' }]}>
                {activeCore.emoji} {activeCore.label}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {activeSec && (
          <>
            <Text style={styles.crumbArrow}>›</Text>
            <Text style={[styles.crumbText, { color: accentColor, fontWeight: '700' }]}>
              {activeSec.emoji} {activeSec.label}
            </Text>
          </>
        )}
      </View>

      {/* ── SVG Wheel ── */}
      <View style={[styles.wheelWrap, { width: SIZE, height: SIZE }]}>
        <Svg width={SIZE} height={SIZE}>
          {slices.map((sl, i) => {
            const midDeg = (sl.startDeg + sl.endDeg) / 2;
            const pos = polarXY(LABEL_R, midDeg);
            const { textSize, emojiSize } = getFontSizes(slices.length, sl.label.length);
            const isSelected =
              selection?.label === sl.label && selection?.core === (activeCore?.label ?? sl.label);

            // Vertical stack: emoji above the midpoint, text below — always horizontal
            const emojiY = pos.y - textSize * 0.6;
            const textY  = pos.y + emojiSize * 0.52;

            return (
              <G key={`sl-${i}`}>
                {/* Slice arc */}
                <Path
                  d={slicePath(INNER_R, OUTER_R, sl.startDeg, sl.endDeg)}
                  fill={sl.fill}
                  stroke={isSelected ? '#fff' : sl.strokeColor}
                  strokeWidth={isSelected ? 3 : 1.5}
                  onPress={() => handleSlicePress(sl)}
                />
                {/* Selected highlight */}
                {isSelected && (
                  <Path
                    d={slicePath(INNER_R, OUTER_R, sl.startDeg, sl.endDeg)}
                    fill="rgba(255,255,255,0.18)"
                    pointerEvents="none"
                  />
                )}
                {/* Emoji — always horizontal */}
                <SvgText
                  x={pos.x}
                  y={emojiY}
                  textAnchor="middle"
                  fontSize={emojiSize}
                  pointerEvents="none"
                >
                  {sl.emoji}
                </SvgText>
                {/* Label — always horizontal */}
                <SvgText
                  x={pos.x}
                  y={textY}
                  textAnchor="middle"
                  fontSize={textSize}
                  fill={sl.textFill}
                  fontWeight="700"
                  pointerEvents="none"
                >
                  {sl.label}
                </SvgText>
              </G>
            );
          })}

          {/* Center circle */}
          <Circle
            cx={CX}
            cy={CY}
            r={CENTER_R}
            fill="#fff"
            stroke={accentColor}
            strokeWidth={canGoBack ? 2.5 : 1.5}
            onPress={canGoBack ? goBack : undefined}
          />
        </Svg>

        {/* Center content overlay */}
        <TouchableOpacity
          style={styles.centerOverlay}
          onPress={canGoBack ? goBack : undefined}
          activeOpacity={canGoBack ? 0.75 : 1}
        >
          {canGoBack ? (
            <View style={styles.centerBackContent}>
              <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
              <Text style={[styles.centerBackLabel, { color: accentColor }]}>
                {level === 'tertiary' ? activeSec?.label : activeCore?.label}
              </Text>
              <Text style={styles.centerBackHint}>tap to go back</Text>
            </View>
          ) : (
            <View style={styles.centerIdleContent}>
              <Text style={styles.centerIdleEmoji}>🎯</Text>
              <Text style={styles.centerIdleText}>Tap a slice{'\n'}to begin</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Level stepper ── */}
      <View style={styles.stepper}>
        {(['core', 'secondary', 'tertiary'] as Level[]).map((l, i) => {
          const labels = ['Core emotion', 'More specific', 'Most detailed'];
          const isActive = level === l;
          const isPast = ['core', 'secondary', 'tertiary'].indexOf(level) > i;
          const dotColor = isActive || isPast ? accentColor : Colors.border;
          return (
            <View key={l} style={styles.stepperItem}>
              <View style={[styles.stepDot, { backgroundColor: dotColor }, isActive && styles.stepDotActive]} />
              <Text style={[styles.stepLabel, (isActive || isPast) && { color: accentColor }]}>
                {labels[i]}
              </Text>
              {i < 2 && <View style={[styles.stepLine, { backgroundColor: isPast ? accentColor : Colors.border }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 24,
  },
  crumbItem: { paddingHorizontal: 2 },
  crumbText: { fontSize: 13, color: Colors.textMuted },
  crumbArrow: { fontSize: 14, color: Colors.textMuted },

  wheelWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerOverlay: {
    position: 'absolute',
    width: (CENTER_R - 4) * 2,
    height: (CENTER_R - 4) * 2,
    borderRadius: CENTER_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBackContent: { alignItems: 'center', gap: 0 },
  backArrow: { fontSize: 20, lineHeight: 22, fontWeight: '700' },
  centerBackLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  centerBackHint: { fontSize: 8.5, color: Colors.textMuted, textAlign: 'center', marginTop: 1 },

  centerIdleContent: { alignItems: 'center', gap: 2 },
  centerIdleEmoji: { fontSize: 22, opacity: 0.5 },
  centerIdleText: { fontSize: 9, color: Colors.textMuted, textAlign: 'center', lineHeight: 13 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepperItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepDotActive: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontSize: 11, color: Colors.textMuted },
  stepLine: { width: 20, height: 1.5, marginHorizontal: 4 },
});
