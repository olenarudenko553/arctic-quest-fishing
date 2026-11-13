import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import {
  BarChart3,
  Fish,
  LayoutGrid,
  Map,
  Play,
  Settings as SettingsIcon,
  Star,
  Trophy,
} from 'lucide-react-native';
import { assets } from '../assets';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import LureChip from '../components/LureChip';
import StatCard, { StatRow } from '../components/StatCard';
import { C, G, theme } from '../constants/theme';
import { LURES } from '../game/lures';
import { TOTAL_STARS } from '../game/levels';
import { SaveBlob, speciesFound, totalStars } from '../game/persistence';
import { formatScore } from '../game/scoring';
import { SPECIES } from '../game/species';

interface Props {
  save: SaveBlob;
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onProgress: () => void;
  onSettings: () => void;
  onPickLure: (id: string) => void;
}

function MenuScreen({
  save,
  onPlay,
  onLevels,
  onCollection,
  onProgress,
  onSettings,
  onPickLure,
}: Props) {
  const sheet = useRef(new Animated.Value(0)).current;
  const ghost = useRef(new Animated.Value(0)).current;
  const reduced = save.settings.reducedMotion;

  useEffect(() => {
    const a = Animated.timing(sheet, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [sheet]);

  useEffect(() => {
    if (reduced) {
      ghost.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ghost, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ghost, reduced]);

  const stars = totalStars(save);
  const found = speciesFound(save);

  const chips = useMemo(
    () =>
      LURES.map(l => ({
        id: l.id,
        label: l.label,
        locked: stars < l.starsRequired,
        active: save.lure === l.id,
      })),
    [save.lure, stars],
  );

  const activeLure = LURES.find(l => l.id === save.lure) || LURES[0];

  const bestBadge = (
    <View style={styles.badge}>
      <Trophy size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles.badgeText} numberOfLines={1}>
        {'BEST ' + formatScore(save.bestScore)}
      </Text>
    </View>
  );

  return (
    <ScreenShell colors={G.menu} overlay={theme.overlay.menu} intensity={1} animated={!reduced} seed={11}>
      <IceHeader title="EXPEDITION BASE" rightSlot={bestBadge} bordered={false} />

      <View style={styles.art}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghostWrap,
            {
              transform: [
                { translateX: ghost.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
              ],
            },
          ]}>
          <Image source={assets.sprite5} style={styles.ghost} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.sheet,
          {
            opacity: sheet,
            transform: [
              { translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
            ],
          },
        ]}>
        <Text style={styles.title}>ARCTIC QUEST</Text>
        <Text style={styles.tagline}>READ THE ICE, FEEL THE LINE</Text>

        <StatRow style={styles.statRow}>
          {found > 0 ? (
            <StatCard
              Icon={Fish}
              value={found + '/' + SPECIES.length}
              label="SPECIES"
              accent={C.primary}
              tone="light"
            />
          ) : null}
          {stars > 0 ? (
            <StatCard
              Icon={Star}
              value={stars + '/' + TOTAL_STARS}
              label="STARS"
              accent={C.accentAurora}
              tone="light"
            />
          ) : null}
        </StatRow>

        <View style={styles.chipRow}>
          {chips.map(c => (
            <LureChip
              key={c.id}
              label={c.label}
              active={c.active}
              locked={c.locked}
              onPress={() => onPickLure(c.id)}
            />
          ))}
        </View>

        <Text style={styles.hint} numberOfLines={1}>
          {'LURE: ' + activeLure.blurb}
        </Text>

        <PrimaryButton label="PLAY NOW" Icon={Play} onPress={onPlay} height={60} />

        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <SecondaryButton label="LEVELS" Icon={Map} tone="light" onPress={onLevels} />
          </View>
          <View style={styles.gridCell}>
            <SecondaryButton label="COLLECTION" Icon={LayoutGrid} tone="light" onPress={onCollection} />
          </View>
          <View style={styles.gridCell}>
            <SecondaryButton label="PROGRESS" Icon={BarChart3} tone="light" onPress={onProgress} />
          </View>
          <View style={styles.gridCell}>
            <SecondaryButton label="SETTINGS" Icon={SettingsIcon} tone="light" onPress={onSettings} />
          </View>
        </View>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    overflow: 'hidden',
  },
  ghostWrap: {
    opacity: 0.16,
  },
  ghost: {
    width: 130,
    height: 130,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(4,30,46,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.textOnDark,
    fontVariant: ['tabular-nums'],
  },
  sheet: {
    backgroundColor: 'rgba(232,244,248,0.94)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    ...theme.shadow.panel,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.textPrimary,
  },
  tagline: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: C.textSecondary,
  },
  statRow: {
    marginTop: 14,
  },
  chipRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  hint: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: C.textSecondary,
    textAlign: 'center',
  },
  grid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    width: '47.5%',
    flexGrow: 1,
  },
});

export default MenuScreen;
