import React from 'react';
import { Animated, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { assets } from '../assets';
import { C, theme } from '../constants/theme';
import usePressScale from '../hooks/usePressScale';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface PillProps {
  onPress: () => void;
  icon?: ImageSourcePropType;
  label?: string;
  accessibilityLabel: string;
}

/** The 44x44 round-plate button used for BACK and PAUSE on every screen. */
export function HeaderPill({ onPress, icon, label, accessibilityLabel }: PillProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.92);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.pill}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.pillInner, { transform: [{ scale }] }]}>
        <Image
          source={assets.buttonRound}
          style={styles.plate}
          resizeMode="contain"
        />
        {icon ? (
          <Image source={icon} style={styles.pillIcon} resizeMode="contain" />
        ) : (
          <ArrowLeft size={22} color={C.textOnDark} strokeWidth={2} />
        )}
      </Animated.View>
      {label ? <Text style={styles.pillLabel}>{label}</Text> : null}
    </Pressable>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  bordered?: boolean;
}

/**
 * ONE header component for every screen (Menu, Levels, Game, Result, Collection,
 * Progress, Settings) - different slots, identical geometry (rule 12).
 */
function IceHeaderBase({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  onBack,
  backLabel = 'BACK',
  bordered = true,
}: Props) {
  return (
    <View style={[styles.header, bordered ? styles.bordered : null]}>
      <View style={styles.side}>
        {leftSlot
          ? leftSlot
          : onBack
          ? <HeaderPill onPress={onBack} accessibilityLabel={backLabel} label={backLabel} />
          : null}
      </View>
      <View style={styles.centre}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 44,
    height: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: C.headerFill,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  side: {
    width: 92,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.textOnDark,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: C.line,
  },
  pill: {
    width: 44,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.85,
  },
  pillIcon: {
    width: 22,
    height: 22,
  },
  pillLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.line,
  },
});

export const IceHeader = React.memo(IceHeaderBase);
export default IceHeader;
