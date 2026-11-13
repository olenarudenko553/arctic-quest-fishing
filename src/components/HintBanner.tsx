import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C } from '../constants/theme';

interface Props {
  text: string;
  Icon?: LucideIcon;
  tone?: 'dark' | 'light';
}

/**
 * Names the GESTURE and its RESULT on the game screen (rule 9.1):
 * "TAP A HOLE TO DROP YOUR LINE", "HOLD TO REEL, RELEASE TO EASE THE LINE".
 */
function HintBannerBase({ text, Icon, tone = 'dark' }: Props) {
  const light = tone === 'light';
  return (
    <View style={[styles.pill, light ? styles.light : styles.dark]}>
      {Icon ? <Icon size={16} color={light ? C.textSecondary : C.accentAurora} strokeWidth={2} /> : null}
      <Text style={[styles.text, light ? styles.textLight : styles.textDark]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dark: {
    backgroundColor: 'rgba(4,30,46,0.55)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  light: {
    backgroundColor: 'rgba(0,85,139,0.08)',
    borderColor: 'rgba(0,85,139,0.16)',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  textDark: {
    color: C.textOnDark,
  },
  textLight: {
    color: C.textSecondary,
  },
});

export const HintBanner = React.memo(HintBannerBase);
export default HintBanner;
