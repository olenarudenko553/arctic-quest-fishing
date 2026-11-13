import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { C } from '../constants/theme';
import { clamp } from '../game/rng';

interface Props {
  /** 0..1 of the fish brought in. */
  progress: number;
  label?: string;
  height?: number;
  track?: string;
  colors?: string[];
}

function ReelProgressBarBase({
  progress,
  label,
  height = 8,
  track = 'rgba(255,255,255,0.14)',
  colors = ['#2BD9C6', '#00A6CB'],
}: Props) {
  const pct = Math.round(clamp(progress, 0, 1) * 100);
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{pct + '%'}</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: (pct + '%') as any, height, borderRadius: height / 2 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: C.textSecondary,
  },
  value: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});

export const ReelProgressBar = React.memo(ReelProgressBarBase);
export default ReelProgressBar;
