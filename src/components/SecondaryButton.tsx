import React from 'react';
import { Animated, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { assets } from '../assets';
import { C, theme } from '../constants/theme';
import usePressScale from '../hooks/usePressScale';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
/** Same icon box as PrimaryButton - sizes are never mixed on one screen (rule 14). */
const ICON = 24;

interface Props {
  label: string;
  Icon?: LucideIcon;
  /** A contract PNG used in place of a vector icon (MENU uses icon_home). */
  imageIcon?: ImageSourcePropType;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'light' | 'dark' | 'danger';
  height?: number;
  style?: ViewStyle;
  /** Backs the button with the contract plate PNG (250x80, same 3.125 ratio). */
  plate?: boolean;
}

function SecondaryButtonBase({
  label,
  Icon,
  imageIcon,
  onPress,
  disabled = false,
  tone = 'dark',
  height = 48,
  style,
  plate = false,
}: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  const palette =
    tone === 'light'
      ? { bg: 'rgba(0,85,139,0.08)', border: 'rgba(0,85,139,0.18)', text: C.secondary, icon: C.primary }
      : tone === 'danger'
      ? { bg: 'rgba(232,67,58,0.14)', border: 'rgba(232,67,58,0.45)', text: C.danger, icon: C.danger }
      : { bg: 'rgba(255,255,255,0.08)', border: theme.colors.glassBorder, text: C.textOnDark, icon: C.accentAurora };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.press, { height }, disabled ? styles.disabled : null, style]}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.anim,
          { backgroundColor: palette.bg, borderColor: palette.border, transform: [{ scale }] },
        ]}>
        {plate ? (
          <Image
            source={assets.buttonRect}
            style={styles.plate}
            resizeMode="contain"
          />
        ) : null}
        <View style={styles.row}>
          {imageIcon ? (
            <Image source={imageIcon} style={styles.img} resizeMode="contain" />
          ) : Icon ? (
            <Icon size={ICON} color={palette.icon} strokeWidth={2} />
          ) : null}
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    width: '100%',
    borderRadius: 14,
  },
  disabled: {
    opacity: 0.45,
  },
  anim: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.8,
  },
  img: {
    width: ICON,
    height: ICON,
  },
  label: {
    lineHeight: ICON,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});

export const SecondaryButton = React.memo(SecondaryButtonBase);
export default SecondaryButton;
