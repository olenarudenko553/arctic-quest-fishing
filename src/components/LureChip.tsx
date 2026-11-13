import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { C } from '../constants/theme';
import usePressScale from '../hooks/usePressScale';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  label: string;
  active: boolean;
  locked: boolean;
  onPress: () => void;
}

function LureChipBase({ label, active, locked, onPress }: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: locked }}
      accessibilityLabel={label}
      style={styles.press}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.chip,
          active ? styles.active : locked ? styles.locked : styles.idle,
          { transform: [{ scale }] },
        ]}>
        <View style={styles.row}>
          {locked ? <Lock size={14} color={C.textMuted} strokeWidth={2.2} /> : null}
          <Text
            style={[
              styles.label,
              active ? styles.labelActive : locked ? styles.labelLocked : styles.labelIdle,
            ]}
            numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  chip: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  idle: {
    backgroundColor: 'rgba(0,85,139,0.07)',
    borderColor: 'rgba(0,85,139,0.18)',
  },
  active: {
    backgroundColor: 'rgba(0,166,203,0.14)',
    borderColor: C.primary,
  },
  locked: {
    backgroundColor: 'rgba(157,206,219,0.35)',
    borderColor: 'rgba(157,206,219,0.5)',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  labelIdle: {
    color: C.textSecondary,
  },
  labelActive: {
    color: C.secondary,
  },
  labelLocked: {
    color: C.textMuted,
  },
});

export const LureChip = React.memo(LureChipBase);
export default LureChip;
