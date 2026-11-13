import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C } from '../constants/theme';

/** One fixed icon box for every pill in the app (rule 15). */
const ICON = 28;
const WRAP = 44;

export interface StatCardProps {
  Icon: LucideIcon;
  value: string;
  label: string;
  /** Drives the value colour AND the icon-wrap tint, so pills differ by colour, not by shape. */
  accent?: string;
  tone?: 'dark' | 'light';
  /** Renders null instead of an empty box when there is nothing to show (rule 8.3). */
  hideWhenEmpty?: boolean;
}

function StatCardBase({
  Icon,
  value,
  label,
  accent = C.accentAurora,
  tone = 'dark',
  hideWhenEmpty = false,
}: StatCardProps) {
  if (hideWhenEmpty && (!value || value === '0')) {
    return null;
  }
  const light = tone === 'light';
  return (
    <View
      style={[
        styles.card,
        light ? styles.cardLight : styles.cardDark,
      ]}>
      <View style={[styles.wrap, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
        <Icon size={ICON} color={accent} strokeWidth={2} />
      </View>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, light ? styles.labelLight : styles.labelDark]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const StatCard = React.memo(StatCardBase);

interface RowProps {
  children: React.ReactNode;
  gap?: number;
  style?: any;
}

/**
 * Equal-width slots. The slot carries flex:1, the card inside carries
 * width:'100%' - never flex:1 inside flex:1 (rule 17).
 */
export function StatRow({ children, gap = 10, style }: RowProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length < 2) {
    return null;
  }
  return (
    <View style={[styles.row, { gap }, style]}>
      {items.map((child, i) => (
        <View key={'slot-' + i} style={styles.slot}>
          {child as React.ReactElement}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  slot: {
    flex: 1,
  },
  card: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardLight: {
    backgroundColor: 'rgba(0,85,139,0.07)',
    borderColor: 'rgba(0,85,139,0.16)',
  },
  wrap: {
    width: WRAP,
    height: WRAP,
    borderRadius: WRAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  labelDark: {
    color: C.line,
  },
  labelLight: {
    color: C.textSecondary,
  },
});

export default StatCard;
