import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { C, G, theme } from '../constants/theme';
import usePressScale from '../hooks/usePressScale';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
/** Fixed across every button in the app (rule 14). */
const ICON = 24;

interface Props {
  label: string;
  Icon?: LucideIcon;
  colors?: string[];
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * The one big CTA. Pressable is the PARENT, the Animated.View lives inside it
 * (rule 4.6) and still carries pointerEvents="box-none" so nothing can swallow
 * the press on an Android release build.
 */
function PrimaryButtonBase({
  label,
  Icon,
  colors = G.cta,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  height = 60,
  style,
  testID,
}: Props) {
  const { scale, onPressIn: inScale, onPressOut: outScale } = usePressScale(0.96);

  const handleIn = () => {
    inScale();
    if (onPressIn) {
      onPressIn();
    }
  };
  const handleOut = () => {
    outScale();
    if (onPressOut) {
      onPressOut();
    }
  };

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handleIn}
      onPressOut={disabled ? undefined : handleOut}
      disabled={disabled}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.press, { height }, disabled ? styles.disabled : null, style]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.anim, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={disabled ? [C.surfaceAlt, C.line] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}>
          <View style={styles.row}>
            {Icon ? <Icon size={ICON} color={C.textOnDark} strokeWidth={2.2} /> : null}
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    width: '100%',
    borderRadius: theme.radius.button,
    ...theme.shadow.cta,
  },
  disabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  anim: {
    flex: 1,
    borderRadius: theme.radius.button,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    lineHeight: ICON,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: '#FFFFFF',
  },
});

export const PrimaryButton = React.memo(PrimaryButtonBase);
export default PrimaryButton;
