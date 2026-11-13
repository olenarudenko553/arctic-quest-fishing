import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Lock } from 'lucide-react-native';
import { C, G } from '../constants/theme';
import usePressScale from '../hooks/usePressScale';
import StarRow from './StarRow';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  number: number;
  stars: number;
  locked: boolean;
  size: number;
  onPress: () => void;
}

function LevelTileBase({ number, stars, locked, size, onPress }: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={locked ? 'LEVEL ' + number + ' LOCKED' : 'LEVEL ' + number}
      style={[styles.press, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.anim, { transform: [{ scale }] }]}>
        {locked ? (
          <View style={styles.locked}>
            <Lock size={20} color={C.textMuted} strokeWidth={2.2} />
            <Text style={styles.lockCaption} numberOfLines={1}>
              {'CLEAR L' + Math.max(1, number - 1)}
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={G.cta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.open}>
            <Text style={styles.number}>{String(number)}</Text>
            <StarRow earned={stars} total={3} size={11} gap={3} />
          </LinearGradient>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 16,
  },
  anim: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  open: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
  },
  number: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  lockCaption: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
  },
});

export const LevelTile = React.memo(LevelTileBase);
export default LevelTile;
