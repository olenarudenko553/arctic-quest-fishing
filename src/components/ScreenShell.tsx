import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { assets } from '../assets';
import AuroraBackdrop from './AuroraBackdrop';

interface Props {
  /** 2-3 stop overlay that tells this screen apart from the others. */
  colors: string[];
  /** Overlay alpha - the Loader sits at 0.94, the Menu lets the art through. */
  overlay?: number;
  intensity?: number;
  animated?: boolean;
  seed?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * bg_game is the ONLY background in the app (asset contract). Screens differ by
 * their gradient overlay and the aurora decor on top of it.
 */
function ScreenShellBase({
  colors,
  overlay = 0.9,
  intensity = 1,
  animated = true,
  seed = 1,
  style,
  children,
}: Props) {
  return (
    <ImageBackground source={assets.bgGame} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: overlay }]}
        pointerEvents="none"
      />
      <AuroraBackdrop intensity={intensity} animated={animated} seed={seed} />
      <View style={[styles.content, style]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#041E2E',
  },
  content: {
    flex: 1,
  },
});

export const ScreenShell = React.memo(ScreenShellBase);
export default ScreenShell;
