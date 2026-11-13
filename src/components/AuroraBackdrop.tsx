import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { C } from '../constants/theme';
import { mulberry32 } from '../game/rng';

interface Props {
  intensity?: number;
  animated?: boolean;
  /** Keeps the dust pattern stable per screen. */
  seed?: number;
}

const DUST_COUNT = 16;

/**
 * The AURORA / GRADIENT_MESH decor layer: soft drifting colour blobs plus static
 * ice dust. Transform + opacity only, native driver (rule 12.5).
 */
function AuroraBackdropBase({ intensity = 1, animated = true, seed = 7 }: Props) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      driftA.setValue(0);
      driftB.setValue(0);
      return undefined;
    }
    const make = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    const a = make(driftA, 5200);
    const b = make(driftB, 6400);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [animated, driftA, driftB]);

  const dust = useMemo(() => {
    const rng = mulberry32(seed * 104729);
    const out: Array<{ top: string; left: string; size: number }> = [];
    for (let i = 0; i < DUST_COUNT; i++) {
      out.push({
        top: Math.round(rng() * 92) + '%',
        left: Math.round(rng() * 94) + '%',
        size: rng() > 0.7 ? 3 : 2,
      });
    }
    return out;
  }, [seed]);

  const tx = (v: Animated.Value, range: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [-range, range] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            top: '8%',
            left: '-12%',
            backgroundColor: C.accentAurora,
            opacity: 0.14 * intensity,
            transform: [{ translateX: tx(driftA, 14) }, { translateY: tx(driftB, 8) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            top: '26%',
            right: '-14%',
            backgroundColor: C.primary,
            opacity: 0.1 * intensity,
            transform: [{ translateX: tx(driftB, 16) }, { translateY: tx(driftA, 10) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blobSmall,
          {
            bottom: '14%',
            left: '18%',
            backgroundColor: C.shallow,
            opacity: 0.12 * intensity,
            transform: [{ translateY: tx(driftA, 12) }],
          },
        ]}
      />
      {dust.map((d, i) => (
        <View
          key={'dust-' + i}
          pointerEvents="none"
          style={[
            styles.dust,
            { top: d.top as any, left: d.left as any, width: d.size, height: d.size },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 260,
    height: 180,
    borderRadius: 999,
  },
  blobSmall: {
    position: 'absolute',
    width: 190,
    height: 140,
    borderRadius: 999,
  },
  dust: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: C.textOnDark,
    opacity: 0.25,
  },
});

export const AuroraBackdrop = React.memo(AuroraBackdropBase);
export default AuroraBackdrop;
