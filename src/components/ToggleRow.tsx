import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C, theme } from '../constants/theme';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const TRACK_W = 52;
const TRACK_H = 30;
const KNOB = 24;

interface Props {
  Icon: LucideIcon;
  title: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRowBase({ Icon, title, description, value, onChange }: Props) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    const a = Animated.spring(x, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      ...theme.springs.press,
    });
    a.start();
    return () => a.stop();
  }, [value, x]);

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={HIT}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={styles.row}>
      <View style={[styles.iconWrap, value ? styles.iconWrapOn : null]}>
        <Icon size={24} color={value ? C.accentAurora : C.line} strokeWidth={2} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <View style={[styles.track, value ? styles.trackOn : null]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              transform: [
                { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [3, TRACK_W - KNOB - 3] }) },
              ],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

interface DangerProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
}

/** Destructive variant - same geometry, danger colours, no toggle. */
export function DangerRow({ Icon, title, description, onPress }: DangerProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.row, styles.rowDanger]}>
      <View style={[styles.iconWrap, styles.iconWrapDanger]}>
        <Icon size={24} color={C.danger} strokeWidth={2} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, styles.titleDanger]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 12,
  },
  rowDanger: {
    backgroundColor: 'rgba(232,67,58,0.12)',
    borderColor: 'rgba(232,67,58,0.4)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  iconWrapOn: {
    backgroundColor: 'rgba(43,217,198,0.18)',
    borderColor: 'rgba(43,217,198,0.45)',
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(232,67,58,0.18)',
    borderColor: 'rgba(232,67,58,0.45)',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textOnDark,
  },
  titleDanger: {
    color: C.danger,
  },
  desc: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: C.line,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: C.primary,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
  },
});

export const ToggleRow = React.memo(ToggleRowBase);
export default ToggleRow;
