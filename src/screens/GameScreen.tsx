import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Anchor, Crosshair, Hand, Map, Target, Timer } from 'lucide-react-native';
import { assets, SPRITES } from '../assets';
import ScreenShell from '../components/ScreenShell';
import IceHeader, { HeaderPill } from '../components/IceHeader';
import IceFieldBoard from '../components/IceFieldBoard';
import SonarColumn from '../components/SonarColumn';
import TensionGauge from '../components/TensionGauge';
import HintBanner from '../components/HintBanner';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import PauseOverlay from '../components/PauseOverlay';
import Toast from '../components/Toast';
import { C, G, theme } from '../constants/theme';
import { MAX_LINE_BREAKS } from '../constants/config';
import { ctaEnabled, ctaLabel, RoundSummary } from '../game/engine';
import { levelAt } from '../game/levels';
import { SaveBlob } from '../game/persistence';
import { formatClock, formatDepth, formatKg, formatScore } from '../game/scoring';
import { safeZone } from '../game/tension';
import { speciesById } from '../game/species';
import { clamp } from '../game/rng';
import useFishingEngine from '../hooks/useFishingEngine';

interface Props {
  levelIndex: number;
  save: SaveBlob;
  onGameOver: (summary: RoundSummary) => void;
  onMenu: () => void;
}

function GameScreen({ levelIndex, save, onGameOver, onMenu }: Props) {
  const engine = useFishingEngine(levelIndex, save.lure, onGameOver);
  const s = engine.state;
  const level = levelAt(levelIndex);
  const reduced = save.settings.reducedMotion;

  const pulse = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const landPop = useRef(new Animated.Value(0)).current;

  const isBite = s.phase === 'bite';
  const isFight = s.phase === 'fight';
  const isLanded = s.phase === 'landed';
  const isSnap = s.phase === 'snap';

  useEffect(() => {
    if (!isBite || reduced) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 210, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 210, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isBite, pulse, reduced]);

  useEffect(() => {
    if (!isLanded && !isSnap) {
      flash.setValue(0);
      landPop.setValue(0);
      return undefined;
    }
    flash.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]);
    const pop = Animated.spring(landPop, {
      toValue: 1,
      useNativeDriver: true,
      ...theme.springs.pop,
    });
    seq.start();
    pop.start();
    return () => {
      seq.stop();
      pop.stop();
    };
  }, [isLanded, isSnap, flash, landPop]);

  const zone = useMemo(() => safeZone(level, s.lineWear), [level, s.lineWear]);
  const reelProgress = s.distanceMax > 0 ? 1 - s.distance / s.distanceMax : 0;
  const hooked = speciesById(s.hookedSpecies);
  const lastCatch = s.caught.length > 0 ? s.caught[s.caught.length - 1] : null;

  const onCtaPress = useCallback(() => {
    if (s.phase === 'bite') {
      engine.hook();
    } else if (s.phase === 'idle' || s.phase === 'sonar') {
      engine.drop();
    }
  }, [engine, s.phase]);

  const onCtaIn = useCallback(() => {
    if (s.phase === 'fight') {
      engine.setHeld(true);
    }
  }, [engine, s.phase]);

  const onCtaOut = useCallback(() => {
    engine.setHeld(false);
  }, [engine]);

  const ctaColors = isBite ? G.ctaHot : isFight ? G.ctaReel : G.cta;
  const label = ctaLabel(s);
  const enabled = ctaEnabled(s);

  const quota = clamp(s.caught.length / Math.max(1, level.fishNeeded), 0, 1);
  const lowTime = s.timeLeftMs <= 20000;

  const hint =
    s.phase === 'idle'
      ? 'TAP A HOLE TO DROP YOUR LINE'
      : s.phase === 'sonar'
      ? 'TAP DROP WHEN THE LURE MEETS THE ECHO'
      : s.phase === 'waiting'
      ? 'WAIT FOR THE ROD TO BEND'
      : s.phase === 'bite'
      ? 'TAP HOOK NOW'
      : 'HOLD TO REEL, RELEASE TO EASE THE LINE';

  const pauseBtn = (
    <HeaderPill
      onPress={engine.pause}
      icon={assets.iconPause}
      label="PAUSE"
      accessibilityLabel="PAUSE"
    />
  );

  const timerBadge = (
    <View style={[styles.timer, lowTime ? styles.timerLow : null]}>
      <Timer size={16} color={lowTime ? C.warn : C.textOnDark} strokeWidth={2.2} />
      <Text style={[styles.timerText, lowTime ? styles.timerTextLow : null]}>
        {formatClock(s.timeLeftMs)}
      </Text>
    </View>
  );

  return (
    <ScreenShell colors={G.game} overlay={1} animated={!reduced} seed={31}>
      <IceHeader
        title={'L' + level.number + ' ' + level.zoneName}
        subtitle={'HAUL ' + s.caught.length + '/' + level.fishNeeded}
        leftSlot={pauseBtn}
        rightSlot={timerBadge}
      />

      <View style={styles.quotaTrack}>
        <View style={[styles.quotaFill, { width: ((quota * 100).toFixed(0) + '%') as any }]} />
      </View>

      <View style={styles.area}>
        {s.phase === 'idle' ? (
          <IceFieldBoard
            holes={s.holes}
            activeId={s.activeHoleId}
            onSelect={engine.selectHole}
            enabled={!s.paused}
          />
        ) : (
          <SonarColumn
            depthLo={level.depthLo}
            depthHi={level.depthHi}
            bandCentre={(s.holes.find(h => h.id === s.activeHoleId) || s.holes[0]).bandCentre}
            tolerance={level.tolerance}
            decoys={(s.holes.find(h => h.id === s.activeHoleId) || s.holes[0]).decoys}
            markerDepth={s.markerDepth}
            lockedDepth={s.lockedDepth}
            assist={save.settings.sonarAssist}
            reducedMotion={reduced}
            locked={s.phase !== 'sonar'}
            fighting={isFight}
            biting={isBite}
            speciesId={s.hookedSpecies}
            reelProgress={reelProgress}
          />
        )}
      </View>

      <View style={styles.strip}>
        <Readout label="HAUL" value={s.caught.length + '/' + level.fishNeeded} />
        <Divider />
        <Readout label="LINE" value={Math.round(100 - s.lineWear) + '%'} />
        {s.phase !== 'idle' ? <Divider /> : null}
        {s.phase !== 'idle' ? (
          <Readout
            label="DEPTH"
            value={formatDepth(s.phase === 'sonar' ? s.markerDepth : s.lockedDepth)}
          />
        ) : null}
        {s.combo > 1 ? <Divider /> : null}
        {s.combo > 1 ? <Readout label="COMBO" value={'x' + s.combo} accent={C.accentAurora} /> : null}
      </View>

      <View style={styles.panel}>
        {s.toast ? (
          <View style={styles.toastSlot}>
            <Toast text={s.toast.text} tone={s.toast.tone} replayKey={s.toast.text} />
          </View>
        ) : null}

        {isFight ? (
          <TensionGauge
            tension={s.tension}
            zone={zone}
            highContrast={save.settings.highContrast}
          />
        ) : (
          <HintBanner text={hint} tone="light" Icon={s.phase === 'idle' ? Target : Crosshair} />
        )}

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{formatScore(s.score)}</Text>
          <Text style={styles.breaks}>
            {'LINES LEFT ' + Math.max(0, MAX_LINE_BREAKS - s.lineBreaks)}
          </Text>
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.ctaWrap,
            {
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
              ],
            },
          ]}>
          <PrimaryButton
            label={label}
            Icon={isFight ? Hand : isBite ? Anchor : Target}
            colors={ctaColors}
            onPress={onCtaPress}
            onPressIn={onCtaIn}
            onPressOut={onCtaOut}
            disabled={!enabled}
            height={64}
          />
        </Animated.View>

        <View
          style={[
            styles.secondaryRow,
            save.settings.leftHanded ? styles.secondaryLeft : styles.secondaryRight,
          ]}>
          <SecondaryButton
            label="HOLES"
            Icon={Map}
            tone="light"
            plate
            onPress={engine.toField}
            disabled={isFight}
            style={styles.holesBtn}
          />
        </View>
      </View>

      {isLanded || isSnap ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flash,
            { backgroundColor: isSnap ? C.danger : C.accentAurora, opacity: flash },
          ]}
        />
      ) : null}

      {isLanded && lastCatch ? (
        <View style={styles.landedWrap} pointerEvents="none">
          <Animated.View
            style={[
              styles.landedCard,
              {
                opacity: landPop,
                transform: [
                  { scale: landPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}>
            <Image
              source={SPRITES[clamp(lastCatch.speciesId, 0, SPRITES.length - 1)]}
              style={styles.landedSprite}
              resizeMode="contain"
            />
            <Text style={styles.landedName}>{lastCatch.name}</Text>
            <Text style={styles.landedKg}>{formatKg(lastCatch.kg)}</Text>
            <Text style={styles.landedPoints}>{'+' + formatScore(lastCatch.points)}</Text>
          </Animated.View>
        </View>
      ) : null}

      {isSnap ? (
        <View style={styles.landedWrap} pointerEvents="none">
          <View style={[styles.landedCard, styles.snapCard]}>
            <Text style={styles.snapTitle}>LINE SNAPPED</Text>
            <Text style={styles.snapHint}>{hooked.name + ' IS GONE'}</Text>
          </View>
        </View>
      ) : null}

      {s.paused ? (
        <PauseOverlay
          caught={s.caught.length}
          needed={level.fishNeeded}
          score={formatScore(s.score)}
          onResume={engine.resume}
          onRestart={engine.restart}
          onMenu={onMenu}
        />
      ) : null}
    </ScreenShell>
  );
}

function Readout({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.readoutValue, accent ? { color: accent } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  quotaTrack: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quotaFill: {
    height: 4,
    backgroundColor: C.accentAurora,
  },
  area: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  strip: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(4,30,46,0.5)',
    paddingHorizontal: 8,
  },
  readout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: C.line,
  },
  readoutValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: C.textOnDark,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  panel: {
    backgroundColor: 'rgba(232,244,248,0.93)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    ...theme.shadow.panel,
  },
  toastSlot: {
    marginBottom: 10,
  },
  scoreRow: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.textSecondary,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  breaks: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.danger,
  },
  ctaWrap: {
    width: '100%',
  },
  secondaryRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  secondaryLeft: {
    justifyContent: 'flex-start',
  },
  secondaryRight: {
    justifyContent: 'flex-end',
  },
  holesBtn: {
    width: 150,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
  },
  landedWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landedCard: {
    paddingHorizontal: 26,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(4,30,46,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(43,217,198,0.5)',
  },
  snapCard: {
    borderColor: 'rgba(232,67,58,0.6)',
  },
  landedSprite: {
    width: 120,
    height: 120,
  },
  landedName: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.textOnDark,
  },
  landedKg: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: C.accentAurora,
    fontVariant: ['tabular-nums'],
  },
  landedPoints: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: C.warn,
    fontVariant: ['tabular-nums'],
  },
  snapTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: C.danger,
  },
  snapHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.line,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(4,30,46,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  timerLow: {
    borderColor: 'rgba(255,138,61,0.6)',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textOnDark,
    fontVariant: ['tabular-nums'],
  },
  timerTextLow: {
    color: C.warn,
  },
});

export default GameScreen;
