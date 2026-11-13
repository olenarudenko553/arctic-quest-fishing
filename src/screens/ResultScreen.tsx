import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Fish, LayoutGrid, Map, Sparkles, Target, Trophy, Zap } from 'lucide-react-native';
import { assets, SPRITES } from '../assets';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatCard, { StatRow } from '../components/StatCard';
import StarRow from '../components/StarRow';
import EmptyState from '../components/EmptyState';
import { C, G, theme } from '../constants/theme';
import { RoundSummary } from '../game/engine';
import { levelAt } from '../game/levels';
import { SaveBlob } from '../game/persistence';
import { accuracyPct, formatKg, formatScore } from '../game/scoring';

interface Props {
  summary: RoundSummary;
  save: SaveBlob;
  newSpecies: string | null;
  onAgain: () => void;
  onMenu: () => void;
  onCollection: () => void;
  onLevels: () => void;
}

const HEADLINE = {
  win: { text: 'HAUL SECURED', color: C.accentAurora },
  snapped: { text: 'LINE SNAPPED', color: C.danger },
  timeout: { text: 'ICE WENT QUIET', color: C.warn },
};

function ResultScreen({
  summary,
  save,
  newSpecies,
  onAgain,
  onMenu,
  onCollection,
  onLevels,
}: Props) {
  const banner = useRef(new Animated.Value(0)).current;
  const level = levelAt(summary.levelIndex);
  const win = summary.outcome === 'win';
  const head = HEADLINE[summary.outcome] || HEADLINE.timeout;

  useEffect(() => {
    if (!newSpecies) {
      banner.setValue(0);
      return undefined;
    }
    const a = Animated.timing(banner, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [banner, newSpecies]);

  const rows = summary.caught.slice(0, 4);
  const accuracy = accuracyPct(summary.perfectDrops, summary.drops);

  return (
    <ScreenShell
      colors={win ? G.resultWin : G.resultLoss}
      overlay={theme.overlay.result}
      animated={!save.settings.reducedMotion}
      seed={41}>
      <IceHeader title={'L' + level.number + ' RESULT'} subtitle={level.zoneName} />

      <View style={styles.body}>
        {newSpecies ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.newBanner,
              {
                opacity: banner,
                transform: [
                  { translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
                ],
              },
            ]}>
            <Sparkles size={16} color={C.accentAurora} strokeWidth={2.2} />
            <Text style={styles.newBannerText} numberOfLines={1}>
              {'NEW SPECIES: ' + newSpecies}
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles.headBlock}>
          <Text style={[styles.headline, { color: head.color }]} numberOfLines={1}>
            {head.text}
          </Text>
          <View style={styles.starWrap}>
            <StarRow earned={summary.stars} total={3} size={30} animated gap={10} />
          </View>
        </View>

        <View style={styles.catchCard}>
          {rows.length > 0 ? (
            rows.map((c, i) => (
              <View key={'catch-' + i} style={styles.catchRow}>
                <Image source={SPRITES[c.speciesId]} style={styles.catchSprite} resizeMode="contain" />
                <View style={styles.catchTexts}>
                  <Text style={styles.catchName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.catchMeta} numberOfLines={1}>
                    {formatKg(c.kg) + '   COMBO x' + c.combo}
                  </Text>
                </View>
                <Text style={styles.catchPoints} numberOfLines={1}>
                  {'+' + formatScore(c.points)}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState
              Icon={Fish}
              title="NO FISH LANDED"
              hint="THE ICE KEEPS ITS SECRETS. WORK A FRESHER HOLE NEXT RUN."
            />
          )}
        </View>

        <StatRow style={styles.stats}>
          <StatCard Icon={Target} value={formatScore(summary.score)} label="SCORE" accent={C.accentAurora} />
          <StatCard Icon={Trophy} value={formatScore(save.bestScore)} label="BEST" accent={C.warn} />
          {summary.bestCombo > 1 ? (
            <StatCard Icon={Zap} value={'x' + summary.bestCombo} label="COMBO" accent={C.primary} />
          ) : accuracy > 0 ? (
            <StatCard Icon={Zap} value={accuracy + '%'} label="PERFECT" accent={C.primary} />
          ) : null}
        </StatRow>

        <View style={styles.actions}>
          <PrimaryButton label="FISH AGAIN" Icon={Fish} onPress={onAgain} height={60} />
          <View style={styles.secondaryRow}>
            <View style={styles.secondaryCell}>
              <SecondaryButton label="MENU" imageIcon={assets.iconHome} onPress={onMenu} />
            </View>
            <View style={styles.secondaryCell}>
              <SecondaryButton label="LEVELS" Icon={Map} onPress={onLevels} />
            </View>
          </View>
          <SecondaryButton label="COLLECTION" Icon={LayoutGrid} onPress={onCollection} />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  headBlock: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  starWrap: {
    marginTop: 14,
  },
  catchCard: {
    marginTop: 14,
    flex: 1,
    borderRadius: 22,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
  },
  catchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
  },
  catchSprite: {
    width: 40,
    height: 40,
  },
  catchTexts: {
    flex: 1,
  },
  catchName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.textOnDark,
  },
  catchMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: C.accentAurora,
    fontVariant: ['tabular-nums'],
  },
  catchPoints: {
    fontSize: 14,
    fontWeight: '800',
    color: C.warn,
    fontVariant: ['tabular-nums'],
  },
  stats: {
    marginTop: 14,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCell: {
    flex: 1,
  },
  newBanner: {
    alignSelf: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(43,217,198,0.18)',
    borderWidth: 1,
    borderColor: C.accentAurora,
    zIndex: 5,
  },
  newBannerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.accentAurora,
  },
});

export default ResultScreen;
