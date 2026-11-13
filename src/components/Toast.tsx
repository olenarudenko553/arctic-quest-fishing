import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { C } from '../constants/theme';

interface Props {
  text: string;
  tone?: 'good' | 'bad' | 'info';
  /** Changing this key replays the slide-in for a repeated message. */
  replayKey?: string | number;
}

const TONE = {
  good: { bg: 'rgba(43,217,198,0.18)', border: C.accentAurora, text: C.accentAurora },
  bad: { bg: 'rgba(232,67,58,0.18)', border: C.danger, text: '#FFC9C5' },
  info: { bg: 'rgba(0,166,203,0.18)', border: C.primary, text: C.textOnDark },
};

function ToastBase({ text, tone = 'info', replayKey }: Props) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    v.setValue(0);
    const a = Animated.spring(v, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 13,
    });
    a.start();
    return () => a.stop();
  }, [v, replayKey, text]);

  const palette = TONE[tone];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
          ],
        },
      ]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
});

export const Toast = React.memo(ToastBase);
export default Toast;
