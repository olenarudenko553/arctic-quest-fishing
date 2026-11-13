import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { C, G } from '../constants/theme';
import { clamp } from '../game/rng';
import { SafeZone } from '../game/tension';

interface Props {
  tension: number;
  zone: SafeZone;
  /** HIGH-CONTRAST TENSION: a solid taller band with an outline. */
  highContrast: boolean;
}

const H = 18;
const NEEDLE_W = 4;
const NEEDLE_H = 26;

/**
 * Zone widths are plain layout (percent), the needle is a plain transform
 * recomputed from engine state - no width animation anywhere (rule 12.5).
 */
function TensionGaugeBase({ tension, zone, highContrast }: Props) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const t = clamp(tension, 0, 100);
  const safeLeft = clamp(zone.lo, 0, 100);
  const safeWidth = clamp(zone.hi - zone.lo, 0, 100);
  const dangerLeft = clamp(zone.hi, 0, 100);
  const dangerWidth = clamp(100 - zone.hi, 0, 100);
  const needleX = w > 0 ? (t / 100) * (w - NEEDLE_W) : 0;
  const inRed = t > zone.hi;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>LINE TENSION</Text>
        <Text style={[styles.state, inRed ? styles.stateRed : styles.stateSafe]}>
          {inRed ? 'RED - EASE OFF' : t < zone.lo ? 'SLACK' : 'HOLDING'}
        </Text>
      </View>
      <View style={styles.track} onLayout={onLayout}>
        <View
          style={[
            styles.zone,
            {
              left: (safeLeft + '%') as any,
              width: (safeWidth + '%') as any,
              backgroundColor: highContrast ? C.accentAurora : 'rgba(43,217,198,0.35)',
              borderWidth: highContrast ? 2 : 0,
              borderColor: C.secondary,
            },
          ]}
        />
        <LinearGradient
          colors={G.ctaHot}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.zone,
            {
              left: (dangerLeft + '%') as any,
              width: (dangerWidth + '%') as any,
              opacity: highContrast ? 0.75 : 0.35,
            },
          ]}
        />
        <View
          style={[
            styles.needle,
            { transform: [{ translateX: needleX }] },
            inRed ? styles.needleRed : null,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.textSecondary,
  },
  state: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  stateSafe: {
    color: C.secondary,
  },
  stateRed: {
    color: C.danger,
  },
  track: {
    width: '100%',
    height: H,
    borderRadius: H / 2,
    backgroundColor: C.surfaceAlt,
    overflow: 'visible',
    justifyContent: 'center',
  },
  zone: {
    position: 'absolute',
    top: 0,
    height: H,
    borderRadius: H / 2,
  },
  needle: {
    position: 'absolute',
    left: 0,
    width: NEEDLE_W,
    height: NEEDLE_H,
    borderRadius: 2,
    backgroundColor: C.textPrimary,
  },
  needleRed: {
    backgroundColor: C.danger,
  },
});

export const TensionGauge = React.memo(TensionGaugeBase);
export default TensionGauge;
