/* @app-slot:game */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, FlatList, Image, ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import { Anchor, Award, BarChart3, Contrast, Crosshair, Eye, Fish, Hand, LayoutGrid, Map, Play, Radar, Scale, Settings as SettingsIcon, Sparkles, Star, Target, Timer, Trash2, Trophy, Waves, Zap } from 'lucide-react-native';
import { DangerRow, EmptyState, FishCard, HeaderPill, HintBanner, IceFieldBoard, IceHeader, LevelTile, LureChip, PauseOverlay, PrimaryButton, ScreenShell, SecondaryButton, SonarColumn, StarRow, StatCard, StatRow, TensionGauge, Toast, ToggleRow, useFishingEngine } from './AppUI';
import { C, G, LOADER_DURATION_MS, MAX_LINE_BREAKS, theme } from './AppResources';
import { LURES, RoundSummary, SPECIES, SaveBlob, Settings, Species, TOTAL_STARS, ZONES, accuracyPct, clamp, clearedInZone, ctaEnabled, ctaLabel, formatClock, formatDepth, formatKg, formatScore, isLevelUnlocked, levelAt, safeZone, speciesById, speciesFound, totalStars } from './GameLogic';
import { SPRITES, assets } from './assets';
import LinearGradient from 'react-native-linear-gradient';
import { styles_CollectionScreen, styles_GameScreen, styles_LevelSelectScreen, styles_LoaderScreen, styles_MenuScreen, styles_ProgressScreen, styles_ResultScreen, styles_SettingsScreen } from './AppScreens.styles';

// ------ CollectionScreen ------
const SCREEN_W_CollectionScreen = Dimensions.get('window').width;
const GAP_CollectionScreen = 12;
const TILE_W_CollectionScreen = Math.floor((Math.min(SCREEN_W_CollectionScreen, 420) - 32 - GAP_CollectionScreen) / 2);

interface Props_CollectionScreen {
  save: SaveBlob;
  onBack: () => void;
}

function CollectionScreen_CollectionScreen({ save, onBack }: Props_CollectionScreen) {
  const found = speciesFound(save);
  const records = save.species;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Species>) => {
      const rec = records[item.id] || { caught: 0, recordKg: 0 };
      return (
        <FishCard
          species={item}
          caught={rec.caught}
          recordKg={rec.recordKg}
          width={TILE_W_CollectionScreen}
        />
      );
    },
    [records],
  );

  const keyExtractor = useCallback((item: Species) => 'sp-' + item.id, []);

  const badge = (
    <View style={styles_CollectionScreen.badge}>
      <Fish size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles_CollectionScreen.badgeText}>{found + '/' + SPECIES.length}</Text>
    </View>
  );

  return (
    <ScreenShell
      colors={G.collection}
      overlay={theme.overlay.collection}
      animated={!save.settings.reducedMotion}
      seed={51}>
      <IceHeader title="COLLECTION" onBack={onBack} rightSlot={badge} />

      <View style={styles_CollectionScreen.body}>
        <Text style={styles_CollectionScreen.lead} numberOfLines={2}>
          EVERY SPECIES HOLDS AT ITS OWN DEPTH BAND. READ THE ECHO, MATCH THE BAND, FILL THE LOG.
        </Text>
        <FlatList
          data={SPECIES}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles_CollectionScreen.column}
          contentContainerStyle={styles_CollectionScreen.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
        />
      </View>
    </ScreenShell>
  );
}


export { CollectionScreen_CollectionScreen };

// ------ GameScreen ------
interface Props_GameScreen {
  levelIndex: number;
  save: SaveBlob;
  onGameOver: (summary: RoundSummary) => void;
  onMenu: () => void;
}

function GameScreen_GameScreen({ levelIndex, save, onGameOver, onMenu }: Props_GameScreen) {
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
    <View style={[styles_GameScreen.timer, lowTime ? styles_GameScreen.timerLow : null]}>
      <Timer size={16} color={lowTime ? C.warn : C.textOnDark} strokeWidth={2.2} />
      <Text style={[styles_GameScreen.timerText, lowTime ? styles_GameScreen.timerTextLow : null]}>
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

      <View style={styles_GameScreen.quotaTrack}>
        <View style={[styles_GameScreen.quotaFill, { width: ((quota * 100).toFixed(0) + '%') as any }]} />
      </View>

      <View style={styles_GameScreen.area}>
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

      <View style={styles_GameScreen.strip}>
        <Readout_GameScreen label="HAUL" value={s.caught.length + '/' + level.fishNeeded} />
        <Divider_GameScreen />
        <Readout_GameScreen label="LINE" value={Math.round(100 - s.lineWear) + '%'} />
        {s.phase !== 'idle' ? <Divider_GameScreen /> : null}
        {s.phase !== 'idle' ? (
          <Readout_GameScreen
            label="DEPTH"
            value={formatDepth(s.phase === 'sonar' ? s.markerDepth : s.lockedDepth)}
          />
        ) : null}
        {s.combo > 1 ? <Divider_GameScreen /> : null}
        {s.combo > 1 ? <Readout_GameScreen label="COMBO" value={'x' + s.combo} accent={C.accentAurora} /> : null}
      </View>

      <View style={styles_GameScreen.panel}>
        {s.toast_engine ? (
          <View style={styles_GameScreen.toastSlot}>
            <Toast text={s.toast_engine.text} tone={s.toast_engine.tone} replayKey={s.toast_engine.text} />
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

        <View style={styles_GameScreen.scoreRow}>
          <Text style={styles_GameScreen.scoreLabel}>SCORE</Text>
          <Text style={styles_GameScreen.scoreValue}>{formatScore(s.score)}</Text>
          <Text style={styles_GameScreen.breaks}>
            {'LINES LEFT ' + Math.max(0, MAX_LINE_BREAKS - s.lineBreaks)}
          </Text>
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles_GameScreen.ctaWrap,
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
            styles_GameScreen.secondaryRow,
            save.settings.leftHanded ? styles_GameScreen.secondaryLeft : styles_GameScreen.secondaryRight,
          ]}>
          <SecondaryButton
            label="HOLES"
            Icon={Map}
            tone="light"
            plate
            onPress={engine.toField}
            disabled={isFight}
            style={styles_GameScreen.holesBtn}
          />
        </View>
      </View>

      {isLanded || isSnap ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles_GameScreen.flash,
            { backgroundColor: isSnap ? C.danger : C.accentAurora, opacity: flash },
          ]}
        />
      ) : null}

      {isLanded && lastCatch ? (
        <View style={styles_GameScreen.landedWrap} pointerEvents="none">
          <Animated.View
            style={[
              styles_GameScreen.landedCard,
              {
                opacity: landPop,
                transform: [
                  { scale: landPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}>
            <Image
              source={SPRITES[clamp(lastCatch.speciesId, 0, SPRITES.length - 1)]}
              style={styles_GameScreen.landedSprite}
              resizeMode="contain"
            />
            <Text style={styles_GameScreen.landedName}>{lastCatch.name}</Text>
            <Text style={styles_GameScreen.landedKg}>{formatKg(lastCatch.kg)}</Text>
            <Text style={styles_GameScreen.landedPoints}>{'+' + formatScore(lastCatch.points)}</Text>
          </Animated.View>
        </View>
      ) : null}

      {isSnap ? (
        <View style={styles_GameScreen.landedWrap} pointerEvents="none">
          <View style={[styles_GameScreen.landedCard, styles_GameScreen.snapCard]}>
            <Text style={styles_GameScreen.snapTitle}>LINE SNAPPED</Text>
            <Text style={styles_GameScreen.snapHint}>{hooked.name + ' IS GONE'}</Text>
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

function Readout_GameScreen({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles_GameScreen.readout}>
      <Text style={styles_GameScreen.readoutLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles_GameScreen.readoutValue, accent ? { color: accent } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider_GameScreen() {
  return <View style={styles_GameScreen.divider} />;
}


export { GameScreen_GameScreen };

// ------ LevelSelectScreen ------
const SCREEN_W_LevelSelectScreen = Dimensions.get('window').width;
const CARD_W_LevelSelectScreen = Math.min(SCREEN_W_LevelSelectScreen - 32, 380);
/** card padding 14 + border 1 */
const CARD_FRAME_LevelSelectScreen = 15;
const GAP_LevelSelectScreen = 10;
const TILE_LevelSelectScreen = Math.max(64, Math.min(88, Math.floor((CARD_W_LevelSelectScreen - 2 * CARD_FRAME_LevelSelectScreen - 2 * GAP_LevelSelectScreen) / 3)));

interface Props_LevelSelectScreen {
  save: SaveBlob;
  onBack: () => void;
  onStart: (levelIndex: number) => void;
}

function LevelSelectScreen_LevelSelectScreen({ save, onBack, onStart }: Props_LevelSelectScreen) {
  const [toast, setToast] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const warn = useCallback(() => {
    setToast(n => n + 1);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setToast(0), 1200);
  }, []);

  const stars = totalStars(save);
  const badge = (
    <View style={styles_LevelSelectScreen.badge}>
      <Star size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles_LevelSelectScreen.badgeText}>{stars + '/' + TOTAL_STARS}</Text>
    </View>
  );

  return (
    <ScreenShell
      colors={G.levels}
      overlay={theme.overlay.levels}
      animated={!save.settings.reducedMotion}
      seed={21}>
      <IceHeader title="EXPEDITIONS" onBack={onBack} rightSlot={badge} />

      <View style={styles_LevelSelectScreen.body}>
        {ZONES.map(zone => (
          <View key={'zone-' + zone.id} style={styles_LevelSelectScreen.card}>
            <View style={styles_LevelSelectScreen.zoneHead}>
              <Text style={styles_LevelSelectScreen.zoneName} numberOfLines={1}>
                {zone.name}
              </Text>
              <Text style={styles_LevelSelectScreen.zoneHint} numberOfLines={1}>
                {'QUOTA ' +
                  levelAt(zone.levels[0]).fishNeeded +
                  '-' +
                  levelAt(zone.levels[zone.levels.length - 1]).fishNeeded +
                  '   ' +
                  levelAt(zone.levels[0]).depthLo +
                  '-' +
                  levelAt(zone.levels[zone.levels.length - 1]).depthHi +
                  ' M'}
              </Text>
            </View>
            <View style={styles_LevelSelectScreen.tiles}>
              {zone.levels.map(idx => {
                const locked = !isLevelUnlocked(save, idx);
                return (
                  <LevelTile
                    key={'lvl-' + idx}
                    number={levelAt(idx).number}
                    stars={save.stars[idx] || 0}
                    locked={locked}
                    size={TILE_LevelSelectScreen}
                    onPress={locked ? warn : () => onStart(idx)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {toast > 0 ? (
        <View style={styles_LevelSelectScreen.toastWrap} pointerEvents="none">
          <Toast text="COMPLETE THE PREVIOUS EXPEDITION" tone="bad" replayKey={toast} />
        </View>
      ) : null}
    </ScreenShell>
  );
}


export { LevelSelectScreen_LevelSelectScreen };

// ------ LoaderScreen ------
interface Props_LoaderScreen {
  onDone: () => void;
}

/**
 * Brand card only: no PLAY button, no stat chips, no tap-to-skip. It holds for
 * exactly LOADER_DURATION_MS and leaves on the timer (rule 2.1 / 2.2 / 2.3),
 * under the darkest overlay in the app so it never photographs like the Menu.
 */
function LoaderScreen_LoaderScreen({ onDone }: Props_LoaderScreen) {
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
      <View style={styles_LoaderScreen.centre}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles_LoaderScreen.medallion,
            {
              opacity: medallion,
              transform: [
                { scale: medallion.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
              ],
            },
          ]}>
          <Image source={assets.logo} style={styles_LoaderScreen.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles_LoaderScreen.titleBlock,
            {
              opacity: titleIn,
              transform: [
                { translateY: titleIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            },
          ]}>
          <Text style={styles_LoaderScreen.title}>ARCTIC QUEST</Text>
          <Text style={styles_LoaderScreen.subtitle}>ICE FISHING EXPEDITION</Text>
        </Animated.View>

        <View style={styles_LoaderScreen.barTrack}>
          <Animated.View style={[styles_LoaderScreen.barFill, { width: barWidth }]}>
            <LinearGradient
              colors={['#00A6CB', '#2BD9C6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles_LoaderScreen.loading}>LOADING</Text>
      </View>
    </ScreenShell>
  );
}


export { LoaderScreen_LoaderScreen };

// ------ MenuScreen ------
interface Props_MenuScreen {
  save: SaveBlob;
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onProgress: () => void;
  onSettings: () => void;
  onPickLure: (id: string) => void;
}

function MenuScreen_MenuScreen({
  save,
  onPlay,
  onLevels,
  onCollection,
  onProgress,
  onSettings,
  onPickLure,
}: Props_MenuScreen) {
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
    <View style={styles_MenuScreen.badge}>
      <Trophy size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles_MenuScreen.badgeText} numberOfLines={1}>
        {'BEST ' + formatScore(save.bestScore)}
      </Text>
    </View>
  );

  return (
    <ScreenShell colors={G.menu} overlay={theme.overlay.menu} intensity={1} animated={!reduced} seed={11}>
      <IceHeader title="EXPEDITION BASE" rightSlot={bestBadge} bordered={false} />

      <View style={styles_MenuScreen.art}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles_MenuScreen.ghostWrap,
            {
              transform: [
                { translateX: ghost.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
              ],
            },
          ]}>
          <Image source={assets.sprite5} style={styles_MenuScreen.ghost} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles_MenuScreen.sheet,
          {
            opacity: sheet,
            transform: [
              { translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
            ],
          },
        ]}>
        <Text style={styles_MenuScreen.title}>ARCTIC QUEST</Text>
        <Text style={styles_MenuScreen.tagline}>READ THE ICE, FEEL THE LINE</Text>

        <StatRow style={styles_MenuScreen.statRow}>
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

        <View style={styles_MenuScreen.chipRow}>
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

        <Text style={styles_MenuScreen.hint} numberOfLines={1}>
          {'LURE: ' + activeLure.blurb}
        </Text>

        <PrimaryButton label="PLAY NOW" Icon={Play} onPress={onPlay} height={60} />

        <View style={styles_MenuScreen.grid}>
          <View style={styles_MenuScreen.gridCell}>
            <SecondaryButton label="LEVELS" Icon={Map} tone="light" onPress={onLevels} />
          </View>
          <View style={styles_MenuScreen.gridCell}>
            <SecondaryButton label="COLLECTION" Icon={LayoutGrid} tone="light" onPress={onCollection} />
          </View>
          <View style={styles_MenuScreen.gridCell}>
            <SecondaryButton label="PROGRESS" Icon={BarChart3} tone="light" onPress={onProgress} />
          </View>
          <View style={styles_MenuScreen.gridCell}>
            <SecondaryButton label="SETTINGS" Icon={SettingsIcon} tone="light" onPress={onSettings} />
          </View>
        </View>
      </Animated.View>
    </ScreenShell>
  );
}


export { MenuScreen_MenuScreen };

// ------ ProgressScreen ------
interface Props_ProgressScreen {
  save: SaveBlob;
  onBack: () => void;
  onPlay: () => void;
}

function ProgressScreen_ProgressScreen({ save, onBack, onPlay }: Props_ProgressScreen) {
  const stars = totalStars(save);
  const found = speciesFound(save);
  const fresh =
    save.fishLanded === 0 && save.bestScore === 0 && stars === 0 && save.linesSnapped === 0;

  return (
    <ScreenShell
      colors={G.progress}
      overlay={theme.overlay.progress}
      animated={!save.settings.reducedMotion}
      seed={61}>
      <IceHeader title="PROGRESS" onBack={onBack} />

      {fresh ? (
        <EmptyState
          Icon={Award}
          title="NO EXPEDITIONS YET"
          hint="DRILL YOUR FIRST HOLE AND THE LOG WILL FILL ITSELF."
          action={<PrimaryButton label="PLAY NOW" Icon={Play} onPress={onPlay} height={52} />}
        />
      ) : (
        <View style={styles_ProgressScreen.body}>
          <StatRow style={styles_ProgressScreen.row}>
            <StatCard
              Icon={Fish}
              value={String(save.fishLanded)}
              label="FISH LANDED"
              accent={C.accentAurora}
            />
            <StatCard
              Icon={Trophy}
              value={formatScore(save.bestScore)}
              label="BEST SCORE"
              accent={C.warn}
            />
            <StatCard
              Icon={Star}
              value={stars + '/' + TOTAL_STARS}
              label="STARS"
              accent={C.primary}
            />
          </StatRow>

          <StatRow style={styles_ProgressScreen.row}>
            <StatCard
              Icon={Target}
              value={found + '/' + SPECIES.length}
              label="SPECIES"
              accent={C.accentAurora}
            />
            <StatCard
              Icon={Scale}
              value={String(save.linesSnapped)}
              label="SNAPPED"
              accent={C.danger}
            />
            <StatCard
              Icon={Zap}
              value={'x' + Math.max(1, save.bestCombo)}
              label="BEST COMBO"
              accent={C.primary}
            />
          </StatRow>

          <Text style={styles_ProgressScreen.sectionTitle}>EXPEDITION ZONES</Text>
          {ZONES.map(z => {
            const cleared = clearedInZone(save, z.levels);
            const pct = Math.round((cleared / z.levels.length) * 100);
            return (
              <View key={'zone-' + z.id} style={styles_ProgressScreen.zoneRow}>
                <View style={styles_ProgressScreen.zoneHead}>
                  <Text style={styles_ProgressScreen.zoneName} numberOfLines={1}>
                    {z.name}
                  </Text>
                  <Text style={styles_ProgressScreen.zoneCount} numberOfLines={1}>
                    {cleared + '/' + z.levels.length + ' CLEARED'}
                  </Text>
                </View>
                <View style={styles_ProgressScreen.track}>
                  <View style={[styles_ProgressScreen.fill, { width: (pct + '%') as any }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}


export { ProgressScreen_ProgressScreen };

// ------ ResultScreen ------
interface Props_ResultScreen {
  summary: RoundSummary;
  save: SaveBlob;
  newSpecies: string | null;
  onAgain: () => void;
  onMenu: () => void;
  onCollection: () => void;
  onLevels: () => void;
}

const HEADLINE_ResultScreen = {
  win: { text: 'HAUL SECURED', color: C.accentAurora },
  snapped: { text: 'LINE SNAPPED', color: C.danger },
  timeout: { text: 'ICE WENT QUIET', color: C.warn },
};

function ResultScreen_ResultScreen({
  summary,
  save,
  newSpecies,
  onAgain,
  onMenu,
  onCollection,
  onLevels,
}: Props_ResultScreen) {
  const banner = useRef(new Animated.Value(0)).current;
  const level = levelAt(summary.levelIndex);
  const win = summary.outcome === 'win';
  const head = HEADLINE_ResultScreen[summary.outcome] || HEADLINE_ResultScreen.timeout;

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

      <View style={styles_ResultScreen.body}>
        {newSpecies ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles_ResultScreen.newBanner,
              {
                opacity: banner,
                transform: [
                  { translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
                ],
              },
            ]}>
            <Sparkles size={16} color={C.accentAurora} strokeWidth={2.2} />
            <Text style={styles_ResultScreen.newBannerText} numberOfLines={1}>
              {'NEW SPECIES: ' + newSpecies}
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles_ResultScreen.headBlock}>
          <Text style={[styles_ResultScreen.headline, { color: head.color }]} numberOfLines={1}>
            {head.text}
          </Text>
          <View style={styles_ResultScreen.starWrap}>
            <StarRow earned={summary.stars} total={3} size={30} animated gap={10} />
          </View>
        </View>

        <View style={styles_ResultScreen.catchCard}>
          {rows.length > 0 ? (
            rows.map((c, i) => (
              <View key={'catch-' + i} style={styles_ResultScreen.catchRow}>
                <Image source={SPRITES[c.speciesId]} style={styles_ResultScreen.catchSprite} resizeMode="contain" />
                <View style={styles_ResultScreen.catchTexts}>
                  <Text style={styles_ResultScreen.catchName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles_ResultScreen.catchMeta} numberOfLines={1}>
                    {formatKg(c.kg) + '   COMBO x' + c.combo}
                  </Text>
                </View>
                <Text style={styles_ResultScreen.catchPoints} numberOfLines={1}>
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

        <StatRow style={styles_ResultScreen.stats}>
          <StatCard Icon={Target} value={formatScore(summary.score)} label="SCORE" accent={C.accentAurora} />
          <StatCard Icon={Trophy} value={formatScore(save.bestScore)} label="BEST" accent={C.warn} />
          {summary.bestCombo > 1 ? (
            <StatCard Icon={Zap} value={'x' + summary.bestCombo} label="COMBO" accent={C.primary} />
          ) : accuracy > 0 ? (
            <StatCard Icon={Zap} value={accuracy + '%'} label="PERFECT" accent={C.primary} />
          ) : null}
        </StatRow>

        <View style={styles_ResultScreen.actions}>
          <PrimaryButton label="FISH AGAIN" Icon={Fish} onPress={onAgain} height={60} />
          <View style={styles_ResultScreen.secondaryRow}>
            <View style={styles_ResultScreen.secondaryCell}>
              <SecondaryButton label="MENU" imageIcon={assets.iconHome} onPress={onMenu} />
            </View>
            <View style={styles_ResultScreen.secondaryCell}>
              <SecondaryButton label="LEVELS" Icon={Map} onPress={onLevels} />
            </View>
          </View>
          <SecondaryButton label="COLLECTION" Icon={LayoutGrid} onPress={onCollection} />
        </View>
      </View>
    </ScreenShell>
  );
}


export { ResultScreen_ResultScreen };

// ------ SettingsScreen ------
interface Props_SettingsScreen {
  save: SaveBlob;
  onBack: () => void;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

function SettingsScreen_SettingsScreen({ save, onBack, onChange, onReset }: Props_SettingsScreen) {
  const [confirming, setConfirming] = useState(false);
  const s = save.settings;

  return (
    <ScreenShell
      colors={G.settings}
      overlay={theme.overlay.settings}
      animated={!s.reducedMotion}
      seed={71}>
      <IceHeader title="SETTINGS" onBack={onBack} />

      <View style={styles_SettingsScreen.body}>
        <View style={styles_SettingsScreen.list}>
          <ToggleRow
            Icon={Radar}
            title="SONAR ASSIST"
            description="Show the depth readout and the echo metres"
            value={s.sonarAssist}
            onChange={v => onChange({ sonarAssist: v })}
          />
          <ToggleRow
            Icon={Hand}
            title="LEFT-HANDED CONTROLS"
            description="Mirror the action button and the HOLES pill"
            value={s.leftHanded}
            onChange={v => onChange({ leftHanded: v })}
          />
          <ToggleRow
            Icon={Waves}
            title="REDUCED MOTION"
            description="Stop the aurora drift, ping rings and ice dust"
            value={s.reducedMotion}
            onChange={v => onChange({ reducedMotion: v })}
          />
          <ToggleRow
            Icon={Contrast}
            title="HIGH-CONTRAST TENSION"
            description="Draw the safe zone as a solid outlined band"
            value={s.highContrast}
            onChange={v => onChange({ highContrast: v })}
          />

          {confirming ? (
            <View style={styles_SettingsScreen.confirm}>
              <Text style={styles_SettingsScreen.confirmTitle}>WIPE ALL PROGRESS?</Text>
              <Text style={styles_SettingsScreen.confirmHint}>
                Stars, species records and lifetime totals are all cleared.
              </Text>
              <View style={styles_SettingsScreen.confirmRow}>
                <View style={styles_SettingsScreen.confirmCell}>
                  <PrimaryButton
                    label="RESET"
                    Icon={Trash2}
                    colors={G.ctaHot}
                    height={52}
                    onPress={() => {
                      setConfirming(false);
                      onReset();
                    }}
                  />
                </View>
                <View style={styles_SettingsScreen.confirmCell}>
                  <SecondaryButton
                    label="CANCEL"
                    Icon={Eye}
                    height={52}
                    onPress={() => setConfirming(false)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <DangerRow
              Icon={Trash2}
              title="RESET PROGRESS"
              description="Clear stars, species and lifetime totals"
              onPress={() => setConfirming(true)}
            />
          )}
        </View>

        <Text style={styles_SettingsScreen.footer}>ARCTIC QUEST   OFFLINE   NO ADS</Text>
      </View>
    </ScreenShell>
  );
}


export { SettingsScreen_SettingsScreen };

/* autopad-begin */
function eyejec(_axijen: boolean, _ipodem: number): string { return "usuzet"; }
function goviye(_geqamo: boolean): boolean {
  let ojoditu: boolean = false;
  ojoditu = false;
  return ojoditu;
}
function agorodofuzu(_irumudopikey: boolean): void {
  const mefudi = 73;
  if (mefudi > 49) return;
}
function kuxiwocayo(_xakobul: boolean): boolean {
  const ijuyus = 21;
  return ijuyus > 21 ? false : true;
}
function akomajekem(): number {
  let cedaxegodil: number = 63;
  cedaxegodil = 30;
  return cedaxegodil;
}
function cuturapitoso(): boolean {
  const itabucetace = 50;
  return itabucetace > 44 ? true : false;
}
function udabenanidam(_samecijaqoqe: string): string {
  const uqiyavudi: string = "iqejuni";
  return uqiyavudi;
}
/* autopad-end */
