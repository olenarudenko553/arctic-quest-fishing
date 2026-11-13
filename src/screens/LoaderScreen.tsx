import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { assets } from '../assets';
import { LOADER_DURATION_MS } from '../constants/config';
import { C, G, theme } from '../constants/theme';
import ScreenShell from '../components/ScreenShell';

interface Props {
  onDone: () => void;
}

/**
 * Brand card only: no PLAY button, no stat chips, no tap-to-skip. It holds for
 * exactly LOADER_DURATION_MS and leaves on the timer (rule 2.1 / 2.2 / 2.3),
 * under the darkest overlay in the app so it never photographs like the Menu.
 */
function LoaderScreen({ onDone }: Props) {
  const medallion = useRef(new Animated.Value(0)).current;
  const titleIn = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.spring(medallion, {
        toValue: 1,
        useNativeDriver: true,
        ...theme.springs.pop,
      }),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(titleIn, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    intro.start();

    // width animation - the single documented useNativeDriver:false in the app
    const bar = Animated.timing(progress, {
      toValue: 1,
      duration: LOADER_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    bar.start();

    const timer = setTimeout(() => doneRef.current(), LOADER_DURATION_MS);
    return () => {
      clearTimeout(timer);
      intro.stop();
      bar.stop();
    };
  }, [medallion, progress, titleIn]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScreenShell colors={G.loader} overlay={theme.overlay.loader} intensity={1.1} seed={3}>
      <View style={styles.centre}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.medallion,
            {
              opacity: medallion,
              transform: [
                { scale: medallion.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
              ],
            },
          ]}>
          <Image source={assets.logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.titleBlock,
            {
              opacity: titleIn,
              transform: [
                { translateY: titleIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            },
          ]}>
          <Text style={styles.title}>ARCTIC QUEST</Text>
          <Text style={styles.subtitle}>ICE FISHING EXPEDITION</Text>
        </Animated.View>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]}>
            <LinearGradient
              colors={['#00A6CB', '#2BD9C6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.loading}>LOADING</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  medallion: {
    width: 148,
    height: 148,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#00A6CB',
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  logo: {
    width: 104,
    height: 104,
  },
  titleBlock: {
    marginTop: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    color: C.textOnDark,
    textShadowColor: '#00A6CB',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.6,
    color: '#9DCEDB',
  },
  barTrack: {
    marginTop: 44,
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loading: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#7BA3B2',
  },
});

export default LoaderScreen;
