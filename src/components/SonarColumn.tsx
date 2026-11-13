import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { C } from '../constants/theme';
import { clamp } from '../game/rng';
import { SPRITES } from '../assets';
import { formatDepth } from '../game/scoring';

interface Props {
  depthLo: number;
  depthHi: number;
  bandCentre: number;
  tolerance: number;
  decoys: number[];
  markerDepth: number;
  lockedDepth: number;
  /** SONAR ASSIST shows the numeric readout and the band metres. */
  assist: boolean;
  reducedMotion: boolean;
  locked: boolean;
  fighting: boolean;
  biting: boolean;
  speciesId: number;
  /** 0..1 of the fish brought in. */
  reelProgress: number;
}

const RAIL_W = 62;
const ROWS = 5;

function SonarColumnBase(p: Props) {
  const [h, setH] = useState(300);
  const [w, setW] = useState(280);
  const ping = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const l = e.nativeEvent.layout;
    if (l.height > 0) {
      setH(l.height);
    }
    if (l.width > 0) {
      setW(l.width);
    }
  };

  useEffect(() => {
    if (p.reducedMotion) {
      ping.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(ping, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [ping, p.reducedMotion]);

  useEffect(() => {
    if (!p.biting) {
      shake.setValue(0);
      return undefined;
    }
    const seq = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    seq.start();
    return () => seq.stop();
  }, [p.biting, shake]);

  const span = Math.max(0.001, p.depthHi - p.depthLo);
  const toY = (d: number) => clamp((d - p.depthLo) / span, 0, 1) * (h - 8) + 4;

  const bandH = Math.max(34, (p.tolerance * 2.2 / span) * h);
  const bandY = clamp(toY(p.bandCentre) - bandH / 2, 2, Math.max(2, h - bandH - 2));
  const markerY = toY(p.locked ? p.lockedDepth : p.markerDepth);

  const rows: number[] = [];
  for (let i = 0; i <= ROWS; i++) {
    rows.push(p.depthLo + (span * i) / ROWS);
  }

  const fishY = p.fighting ? toY(p.lockedDepth) - clamp(p.reelProgress, 0, 1) * (toY(p.lockedDepth) - 24) : 0;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
          ],
        },
      ]}
      pointerEvents="box-none">
      <View style={styles.column} onLayout={onLayout}>
        <LinearGradient
          colors={['#0A6E95', '#00558B', '#041E2E']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: p.fighting ? 0.45 : 1 }]}
          pointerEvents="none"
        />

        {rows.map((d, i) => (
          <View key={'grid-' + i} style={[styles.grid, { top: toY(d) }]} pointerEvents="none" />
        ))}

        {p.decoys.map((d, i) => (
          <View
            key={'decoy-' + i}
            pointerEvents="none"
            style={[
              styles.decoy,
              { top: toY(d) - 9, left: 18 + ((i * 37) % Math.max(40, w - 120)) },
            ]}
          />
        ))}

        <View
          pointerEvents="none"
          style={[styles.band, { top: bandY, height: bandH }]}>
          <LinearGradient
            colors={['rgba(43,217,198,0.08)', 'rgba(43,217,198,0.45)', 'rgba(43,217,198,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {p.assist ? (
            <Text style={styles.bandLabel} numberOfLines={1}>
              {'ECHO ' + formatDepth(p.bandCentre)}
            </Text>
          ) : (
            <Text style={styles.bandLabel} numberOfLines={1}>
              ECHO
            </Text>
          )}
        </View>

        <View pointerEvents="none" style={[styles.markerRow, { top: markerY - 7 }]}>
          <View style={[styles.markerLine, p.locked ? styles.markerLineLocked : null]} />
          <View
            style={[
              styles.diamond,
              p.biting ? styles.diamondHot : null,
              p.locked ? styles.diamondLocked : null,
            ]}
          />
        </View>

        {p.fighting ? (
          <View pointerEvents="none" style={[styles.lineToFish, { height: Math.max(0, fishY) }]} />
        ) : null}

        {p.fighting ? (
          <Image
            source={SPRITES[clamp(p.speciesId, 0, SPRITES.length - 1)]}
            style={[styles.fish, { top: Math.max(8, fishY - 34) }]}
            resizeMode="contain"
          />
        ) : null}

        {!p.reducedMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pingRing,
              {
                top: markerY - 34,
                opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [
                  { scale: ping.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) },
                ],
              },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.rail} pointerEvents="none">
        {rows.map((d, i) => (
          <Text key={'rail-' + i} style={[styles.railText, { top: toY(d) - 7 }]} numberOfLines={1}>
            {d.toFixed(0) + ' m'}
          </Text>
        ))}
        {p.assist ? (
          <View style={[styles.readout, { top: clamp(markerY - 14, 0, Math.max(0, h - 28)) }]}>
            <Text style={styles.readoutText} numberOfLines={1}>
              {formatDepth(p.locked ? p.lockedDepth : p.markerDepth)}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  decoy: {
    position: 'absolute',
    width: 54,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.line,
    opacity: 0.35,
  },
  band: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43,217,198,0.5)',
  },
  bandLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.accentAurora,
  },
  markerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerLine: {
    flex: 1,
    height: 2,
    backgroundColor: C.warn,
    opacity: 0.9,
  },
  markerLineLocked: {
    backgroundColor: C.accentAurora,
  },
  diamond: {
    width: 14,
    height: 14,
    marginRight: 10,
    backgroundColor: C.warn,
    transform: [{ rotate: '45deg' }],
  },
  diamondHot: {
    backgroundColor: '#FFD4A8',
  },
  diamondLocked: {
    backgroundColor: C.accentAurora,
  },
  lineToFish: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    backgroundColor: 'rgba(234,246,250,0.75)',
  },
  fish: {
    position: 'absolute',
    left: '50%',
    marginLeft: -42,
    width: 84,
    height: 84,
  },
  pingRing: {
    position: 'absolute',
    right: 10,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: C.accentAurora,
  },
  rail: {
    width: RAIL_W,
    marginLeft: 8,
  },
  railText: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(234,246,250,0.55)',
    fontVariant: ['tabular-nums'],
  },
  readout: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,30,46,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(43,217,198,0.45)',
  },
  readoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.accentAurora,
    fontVariant: ['tabular-nums'],
  },
});

export const SonarColumn = React.memo(SonarColumnBase);
export default SonarColumn;
