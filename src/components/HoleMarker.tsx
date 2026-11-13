import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { C, theme } from '../constants/theme';
import { clamp } from '../game/rng';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  left: number;
  top: number;
  size: number;
  freshness: number;
  active: boolean;
  onPress: () => void;
}

/** A drilled hole: dark water disc, bright rim, and a freshness ring in SVG. */
function HoleMarkerBase({ left, top, size, freshness, active, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.spring(scale, {
      toValue: active ? 1.06 : 1,
      useNativeDriver: true,
      ...theme.springs.base,
    });
    a.start();
    return () => a.stop();
  }, [active, scale]);

  const f = clamp(freshness, 0, 100) / 100;
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const ringColor = f > 0.6 ? C.accentAurora : f > 0.3 ? C.primary : C.warn;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={'ICE HOLE, FRESHNESS ' + Math.round(f * 100) + ' PERCENT'}
      style={[styles.press, { left, top, width: size, height: size + 20 }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.anim, { width: size, height: size, transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#063A5E', '#041E2E']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[
            styles.water,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: active ? C.accentAurora : '#EAF6FA',
            },
          ]}
        />
        <View style={styles.ring} pointerEvents="none">
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={ringColor}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${circ * f} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </View>
      </Animated.View>
      <Text style={[styles.caption, { color: ringColor }]} numberOfLines={1}>
        {'FRESH ' + Math.round(f * 100) + '%'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    position: 'absolute',
    alignItems: 'center',
  },
  anim: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: {
    position: 'absolute',
    borderWidth: 3,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  caption: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

export const HoleMarker = React.memo(HoleMarkerBase);
export default HoleMarker;
