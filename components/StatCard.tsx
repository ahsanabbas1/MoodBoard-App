import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import AnimatedEmoji from './AnimatedEmoji';

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
  delay?: number;
}

export default function StatCard({ label, value, subtitle, color = Colors.primary, icon, delay = 0 }: Props) {
  return (
    <View style={styles.card}>
      {icon ? <AnimatedEmoji emoji={icon} type="bounceIn" delay={delay} style={styles.icon} /> : null}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
