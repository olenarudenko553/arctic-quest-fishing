/* @app-slot:game */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, ImageBackground, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, G, TICK_MS, theme } from './AppResources';
import { EngineState, Hole, RARITY_LABEL, RoundSummary, SafeZone, SaveBlob, Species, backToField, clamp, createEngine, defaultSave, drop as dropAction, formatDepth, formatKg, hook as hookAction, mergeSave, mulberry32, pause as pauseAction, restart as restartAction, resume as resumeAction, selectHole as selectHoleAction, summarise, tick } from './GameLogic';
import { ArrowLeft, Home, Lock, LucideIcon, Play, RotateCcw } from 'lucide-react-native';
import { SPRITES, assets } from './assets';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { load, savePatch, wipe } from './GameLogic';
import { styles_AuroraBackdrop, styles_EmptyState, styles_FishCard, styles_HintBanner, styles_HoleMarker, styles_IceFieldBoard, styles_IceHeader, styles_LevelTile, styles_LureChip, styles_PauseOverlay, styles_PrimaryButton, styles_ReelProgressBar, styles_ScreenShell, styles_SecondaryButton, styles_SonarColumn, styles_StarRow, styles_StatCard, styles_TensionGauge, styles_Toast, styles_ToggleRow } from './AppUI.styles';

// ------ AuroraBackdrop ------
interface Props_AuroraBackdrop {
  intensity?: number;
  animated?: boolean;
  /** Keeps the dust pattern stable per screen. */
  seed?: number;
}

const DUST_COUNT_AuroraBackdrop = 16;

/**
 * The AURORA / GRADIENT_MESH decor layer: soft drifting colour blobs plus static
 * ice dust. Transform + opacity only, native driver (rule 12.5).
 */
function AuroraBackdropBase_AuroraBackdrop({ intensity = 1, animated = true, seed = 7 }: Props_AuroraBackdrop) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      driftA.setValue(0);
      driftB.setValue(0);
      return undefined;
    }
    const make = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    const a = make(driftA, 5200);
    const b = make(driftB, 6400);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [animated, driftA, driftB]);

  const dust = useMemo(() => {
    const rng = mulberry32(seed * 104729);
    const out: Array<{ top: string; left: string; size: number }> = [];
    for (let i = 0; i < DUST_COUNT_AuroraBackdrop; i++) {
      out.push({
        top: Math.round(rng() * 92) + '%',
        left: Math.round(rng() * 94) + '%',
        size: rng() > 0.7 ? 3 : 2,
      });
    }
    return out;
  }, [seed]);

  const tx = (v: Animated.Value, range: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [-range, range] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles_AuroraBackdrop.blob,
          {
            top: '8%',
            left: '-12%',
            backgroundColor: C.accentAurora,
            opacity: 0.14 * intensity,
            transform: [{ translateX: tx(driftA, 14) }, { translateY: tx(driftB, 8) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles_AuroraBackdrop.blob,
          {
            top: '26%',
            right: '-14%',
            backgroundColor: C.primary,
            opacity: 0.1 * intensity,
            transform: [{ translateX: tx(driftB, 16) }, { translateY: tx(driftA, 10) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles_AuroraBackdrop.blobSmall,
          {
            bottom: '14%',
            left: '18%',
            backgroundColor: C.shallow,
            opacity: 0.12 * intensity,
            transform: [{ translateY: tx(driftA, 12) }],
          },
        ]}
      />
      {dust.map((d, i) => (
        <View
          key={'dust-' + i}
          pointerEvents="none"
          style={[
            styles_AuroraBackdrop.dust,
            { top: d.top as any, left: d.left as any, width: d.size, height: d.size },
          ]}
        />
      ))}
    </View>
  );
}


export const AuroraBackdrop = React.memo(AuroraBackdropBase_AuroraBackdrop);
// (bundled: AuroraBackdrop default was AuroraBackdrop)

// ------ EmptyState ------
interface Props_EmptyState {
  Icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** A themed message, never a blank area (rule 8.2). */
function EmptyStateBase_EmptyState({ Icon, title, hint, action }: Props_EmptyState) {
  return (
    <View style={styles_EmptyState.wrap}>
      <View style={styles_EmptyState.badge}>
        <Icon size={28} color={C.accentAurora} strokeWidth={2} />
      </View>
      <Text style={styles_EmptyState.title}>{title}</Text>
      {hint ? <Text style={styles_EmptyState.hint}>{hint}</Text> : null}
      {action ? <View style={styles_EmptyState.action}>{action}</View> : null}
    </View>
  );
}


export const EmptyState = React.memo(EmptyStateBase_EmptyState);
// (bundled: EmptyState default was EmptyState)

// ------ FishCard ------
interface Props_FishCard {
  species: Species;
  caught: number;
  recordKg: number;
  width: number;
}

/** Sprites are drawn with contain - never stretched, never masked (rule 13.3). */
function FishCardBase_FishCard({ species, caught, recordKg, width }: Props_FishCard) {
  const locked = caught <= 0;
  return (
    <View style={[styles_FishCard.card, { width }]}>
      <View style={styles_FishCard.spriteBox}>
        <Image
          source={SPRITES[species.id]}
          style={[styles_FishCard.sprite, locked ? styles_FishCard.spriteLocked : null]}
          resizeMode="contain"
        />
        {locked ? (
          <View style={styles_FishCard.lockBadge}>
            <Lock size={20} color={C.textMuted} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>

      <Text style={[styles_FishCard.name, locked ? styles_FishCard.nameLocked : null]} numberOfLines={1}>
        {locked ? 'UNIDENTIFIED' : species.name}
      </Text>

      {locked ? (
        <Text style={styles_FishCard.hint} numberOfLines={1}>
          {species.unlockHint}
        </Text>
      ) : (
        <View style={styles_FishCard.stats}>
          <Text style={styles_FishCard.record} numberOfLines={1}>
            {'RECORD ' + formatKg(recordKg)}
          </Text>
          <Text style={styles_FishCard.count} numberOfLines={1}>
            {'CAUGHT x' + caught}
          </Text>
        </View>
      )}

      <View style={styles_FishCard.rarityRow}>
        <View style={[styles_FishCard.rarityBar, { backgroundColor: species.color }]} />
        <Text style={[styles_FishCard.rarity, { color: species.color }]} numberOfLines={1}>
          {RARITY_LABEL[species.rarity]}
        </Text>
      </View>
    </View>
  );
}


export const FishCard = React.memo(FishCardBase_FishCard);
// (bundled: FishCard default was FishCard)

// ------ HintBanner ------
interface Props_HintBanner {
  text: string;
  Icon?: LucideIcon;
  tone?: 'dark' | 'light';
}

/**
 * Names the GESTURE and its RESULT on the game screen (rule 9.1):
 * "TAP A HOLE TO DROP YOUR LINE", "HOLD TO REEL, RELEASE TO EASE THE LINE".
 */
function HintBannerBase_HintBanner({ text, Icon, tone = 'dark' }: Props_HintBanner) {
  const light = tone === 'light';
  return (
    <View style={[styles_HintBanner.pill, light ? styles_HintBanner.light : styles_HintBanner.dark]}>
      {Icon ? <Icon size={16} color={light ? C.textSecondary : C.accentAurora} strokeWidth={2} /> : null}
      <Text style={[styles_HintBanner.text, light ? styles_HintBanner.textLight : styles_HintBanner.textDark]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}


export const HintBanner = React.memo(HintBannerBase_HintBanner);
// (bundled: HintBanner default was HintBanner)

// ------ HoleMarker ------
const HIT_HoleMarker = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props_HoleMarker {
  left: number;
  top: number;
  size: number;
  freshness: number;
  active: boolean;
  onPress: () => void;
}

/** A drilled hole: dark water disc, bright rim, and a freshness ring in SVG. */
function HoleMarkerBase_HoleMarker({ left, top, size, freshness, active, onPress }: Props_HoleMarker) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.spring(scale, {
      toValue: active ? 1.06 : 1,
      useNativeDriver: true,
      ...theme.springs.base,
    });
    a.start();
    return () => a.stop();
  }, [active, scale]);

  const f = clamp(freshness, 0, 100) / 100;
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const ringColor = f > 0.6 ? C.accentAurora : f > 0.3 ? C.primary : C.warn;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_HoleMarker}
      accessibilityRole="button"
      accessibilityLabel={'ICE HOLE, FRESHNESS ' + Math.round(f * 100) + ' PERCENT'}
      style={[styles_HoleMarker.press, { left, top, width: size, height: size + 20 }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles_HoleMarker.anim, { width: size, height: size, transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#063A5E', '#041E2E']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[
            styles_HoleMarker.water,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: active ? C.accentAurora : '#EAF6FA',
            },
          ]}
        />
        <View style={styles_HoleMarker.ring} pointerEvents="none">
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={ringColor}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${circ * f} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </View>
      </Animated.View>
      <Text style={[styles_HoleMarker.caption, { color: ringColor }]} numberOfLines={1}>
        {'FRESH ' + Math.round(f * 100) + '%'}
      </Text>
    </Pressable>
  );
}


export const HoleMarker = React.memo(HoleMarkerBase_HoleMarker);
// (bundled: HoleMarker default was HoleMarker)

// ------ IceFieldBoard ------
const SCREEN_W_IceFieldBoard = Dimensions.get('window').width;
export const BOARD_MAX_W = Math.min(SCREEN_W_IceFieldBoard - 32, 380);
/** padding 8 + border 2 */
export const BOARD_FRAME = 10;
export const HOLE_D = Math.max(56, Math.floor((BOARD_MAX_W - 2 * BOARD_FRAME) / 3) - 12);

/** Room reserved under each hole for its FRESH xx% caption. */
const CAPTION_H_IceFieldBoard = 20;

interface Props_IceFieldBoard {
  holes: Hole[];
  activeId: number;
  onSelect: (id: number) => void;
  enabled: boolean;
}

/** Top-down ice plate. Hole placement comes from the seeded generator, never from constants. */
function IceFieldBoardBase_IceFieldBoard({ holes, activeId, onSelect, enabled }: Props_IceFieldBoard) {
  const [box, setBox] = useState({ w: BOARD_MAX_W, h: 320 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBox({ w: width, h: height });
    }
  };

  const placed = useMemo(() => {
    const innerW = Math.max(HOLE_D, box.w - 2 * BOARD_FRAME);
    const innerH = Math.max(HOLE_D + CAPTION_H_IceFieldBoard, box.h - 2 * BOARD_FRAME);
    const spanX = Math.max(0, innerW - HOLE_D);
    const spanY = Math.max(0, innerH - HOLE_D - CAPTION_H_IceFieldBoard);
    return holes.map(h => ({
      hole: h,
      left: BOARD_FRAME + clamp(h.x, 0, 1) * spanX,
      top: BOARD_FRAME + clamp(h.y, 0, 1) * spanY,
    }));
  }, [holes, box.w, box.h]);

  const cracks = useMemo(() => {
    const w = box.w;
    const h = box.h;
    return [
      `${w * 0.06},${h * 0.2} ${w * 0.3},${h * 0.3} ${w * 0.52},${h * 0.22} ${w * 0.9},${h * 0.34}`,
      `${w * 0.12},${h * 0.72} ${w * 0.38},${h * 0.62} ${w * 0.66},${h * 0.76} ${w * 0.94},${h * 0.66}`,
      `${w * 0.5},${h * 0.04} ${w * 0.44},${h * 0.4} ${w * 0.58},${h * 0.7} ${w * 0.5},${h * 0.96}`,
    ];
  }, [box.w, box.h]);

  return (
    <View style={styles_IceFieldBoard.board} onLayout={onLayout}>
      <LinearGradient
        colors={['#E8F4F8', '#B8DBE5']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, styles_IceFieldBoard.plate]}
        pointerEvents="none"
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={box.w} height={box.h}>
          {cracks.map((pts, i) => (
            <Polyline
              key={'crack-' + i}
              points={pts}
              stroke={C.line}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              fill="none"
            />
          ))}
        </Svg>
      </View>
      {placed.map(p => (
        <HoleMarker
          key={'hole-' + p.hole.id}
          left={p.left}
          top={p.top}
          size={HOLE_D}
          freshness={p.hole.freshness}
          active={p.hole.id === activeId}
          onPress={enabled ? () => onSelect(p.hole.id) : () => {}}
        />
      ))}
    </View>
  );
}


export const IceFieldBoard = React.memo(IceFieldBoardBase_IceFieldBoard);
// (bundled: IceFieldBoard default was IceFieldBoard)

// ------ IceHeader ------
const HIT_IceHeader = { top: 8, bottom: 8, left: 8, right: 8 };

interface PillProps_IceHeader {
  onPress: () => void;
  icon?: ImageSourcePropType;
  label?: string;
  accessibilityLabel: string;
}

/** The 44x44 round-plate button used for BACK and PAUSE on every screen. */
export function HeaderPill({ onPress, icon, label, accessibilityLabel }: PillProps_IceHeader) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.92);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT_IceHeader}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles_IceHeader.pill}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles_IceHeader.pillInner, { transform: [{ scale }] }]}>
        <Image
          source={assets.buttonRound}
          style={styles_IceHeader.plate}
          resizeMode="contain"
        />
        {icon ? (
          <Image source={icon} style={styles_IceHeader.pillIcon} resizeMode="contain" />
        ) : (
          <ArrowLeft size={22} color={C.textOnDark} strokeWidth={2} />
        )}
      </Animated.View>
      {label ? <Text style={styles_IceHeader.pillLabel}>{label}</Text> : null}
    </Pressable>
  );
}

interface Props_IceHeader {
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
function IceHeaderBase_IceHeader({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  onBack,
  backLabel = 'BACK',
  bordered = true,
}: Props_IceHeader) {
  return (
    <View style={[styles_IceHeader.header, bordered ? styles_IceHeader.bordered : null]}>
      <View style={styles_IceHeader.side}>
        {leftSlot
          ? leftSlot
          : onBack
          ? <HeaderPill onPress={onBack} accessibilityLabel={backLabel} label={backLabel} />
          : null}
      </View>
      <View style={styles_IceHeader.centre}>
        <Text style={styles_IceHeader.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles_IceHeader.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles_IceHeader.side, styles_IceHeader.sideRight]}>{rightSlot}</View>
    </View>
  );
}


export const IceHeader = React.memo(IceHeaderBase_IceHeader);
// (bundled: IceHeader default was IceHeader)

// ------ LevelTile ------
const HIT_LevelTile = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props_LevelTile {
  number: number;
  stars: number;
  locked: boolean;
  size: number;
  onPress: () => void;
}

function LevelTileBase_LevelTile({ number, stars, locked, size, onPress }: Props_LevelTile) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT_LevelTile}
      accessibilityRole="button"
      accessibilityLabel={locked ? 'LEVEL ' + number + ' LOCKED' : 'LEVEL ' + number}
      style={[styles_LevelTile.press, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles_LevelTile.anim, { transform: [{ scale }] }]}>
        {locked ? (
          <View style={styles_LevelTile.locked}>
            <Lock size={20} color={C.textMuted} strokeWidth={2.2} />
            <Text style={styles_LevelTile.lockCaption} numberOfLines={1}>
              {'CLEAR L' + Math.max(1, number - 1)}
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={G.cta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles_LevelTile.open}>
            <Text style={styles_LevelTile.number}>{String(number)}</Text>
            <StarRow earned={stars} total={3} size={11} gap={3} />
          </LinearGradient>
        )}
      </Animated.View>
    </Pressable>
  );
}


export const LevelTile = React.memo(LevelTileBase_LevelTile);
// (bundled: LevelTile default was LevelTile)

// ------ LureChip ------
const HIT_LureChip = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props_LureChip {
  label: string;
  active: boolean;
  locked: boolean;
  onPress: () => void;
}

function LureChipBase_LureChip({ label, active, locked, onPress }: Props_LureChip) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT_LureChip}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: locked }}
      accessibilityLabel={label}
      style={styles_LureChip.press}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles_LureChip.chip,
          active ? styles_LureChip.active : locked ? styles_LureChip.locked : styles_LureChip.idle,
          { transform: [{ scale }] },
        ]}>
        <View style={styles_LureChip.row}>
          {locked ? <Lock size={14} color={C.textMuted} strokeWidth={2.2} /> : null}
          <Text
            style={[
              styles_LureChip.label,
              active ? styles_LureChip.labelActive : locked ? styles_LureChip.labelLocked : styles_LureChip.labelIdle,
            ]}
            numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}


export const LureChip = React.memo(LureChipBase_LureChip);
// (bundled: LureChip default was LureChip)

// ------ PauseOverlay ------
interface Props_PauseOverlay {
  caught: number;
  needed: number;
  score: string;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

/** While this is up the engine loop and the countdown are frozen (rule 5.6). */
function PauseOverlayBase_PauseOverlay({ caught, needed, score, onResume, onRestart, onMenu }: Props_PauseOverlay) {
  return (
    <View style={styles_PauseOverlay.backdrop}>
      <View style={styles_PauseOverlay.card}>
        <Text style={styles_PauseOverlay.title}>PAUSED</Text>
        <Text style={styles_PauseOverlay.sub} numberOfLines={1}>
          {'HAUL ' + caught + '/' + needed + '   SCORE ' + score}
        </Text>
        <View style={styles_PauseOverlay.actions}>
          <PrimaryButton label="RESUME" Icon={Play} onPress={onResume} height={52} />
          <SecondaryButton label="RESTART" Icon={RotateCcw} onPress={onRestart} height={52} />
          <SecondaryButton label="MENU" Icon={Home} onPress={onMenu} height={52} />
        </View>
      </View>
    </View>
  );
}


export const PauseOverlay = React.memo(PauseOverlayBase_PauseOverlay);
// (bundled: PauseOverlay default was PauseOverlay)

// ------ PrimaryButton ------
const HIT_PrimaryButton = { top: 8, bottom: 8, left: 8, right: 8 };
/** Fixed across every button in the app (rule 14). */
const ICON_PrimaryButton = 24;

interface Props_PrimaryButton {
  label: string;
  Icon?: LucideIcon;
  colors?: string[];
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * The one big CTA. Pressable is the PARENT, the Animated.View lives inside it
 * (rule 4.6) and still carries pointerEvents="box-none" so nothing can swallow
 * the press on an Android release build.
 */
function PrimaryButtonBase_PrimaryButton({
  label,
  Icon,
  colors = G.cta,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  height = 60,
  style,
  testID,
}: Props_PrimaryButton) {
  const { scale, onPressIn: inScale, onPressOut: outScale } = usePressScale(0.96);

  const handleIn = () => {
    inScale();
    if (onPressIn) {
      onPressIn();
    }
  };
  const handleOut = () => {
    outScale();
    if (onPressOut) {
      onPressOut();
    }
  };

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handleIn}
      onPressOut={disabled ? undefined : handleOut}
      disabled={disabled}
      hitSlop={HIT_PrimaryButton}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles_PrimaryButton.press, { height }, disabled ? styles_PrimaryButton.disabled : null, style]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles_PrimaryButton.anim, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={disabled ? [C.surfaceAlt, C.line] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles_PrimaryButton.fill}>
          <View style={styles_PrimaryButton.row}>
            {Icon ? <Icon size={ICON_PrimaryButton} color={C.textOnDark} strokeWidth={2.2} /> : null}
            <Text style={styles_PrimaryButton.label} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}


export const PrimaryButton = React.memo(PrimaryButtonBase_PrimaryButton);
// (bundled: PrimaryButton default was PrimaryButton)

// ------ ReelProgressBar ------
interface Props_ReelProgressBar {
  /** 0..1 of the fish brought in. */
  progress: number;
  label?: string;
  height?: number;
  track?: string;
  colors?: string[];
}

function ReelProgressBarBase_ReelProgressBar({
  progress,
  label,
  height = 8,
  track = 'rgba(255,255,255,0.14)',
  colors = ['#2BD9C6', '#00A6CB'],
}: Props_ReelProgressBar) {
  const pct = Math.round(clamp(progress, 0, 1) * 100);
  return (
    <View style={styles_ReelProgressBar.wrap}>
      {label ? (
        <View style={styles_ReelProgressBar.row}>
          <Text style={styles_ReelProgressBar.label}>{label}</Text>
          <Text style={styles_ReelProgressBar.value}>{pct + '%'}</Text>
        </View>
      ) : null}
      <View style={[styles_ReelProgressBar.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: (pct + '%') as any, height, borderRadius: height / 2 }}
        />
      </View>
    </View>
  );
}


export const ReelProgressBar = React.memo(ReelProgressBarBase_ReelProgressBar);
// (bundled: ReelProgressBar default was ReelProgressBar)

// ------ ScreenShell ------
interface Props_ScreenShell {
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
function ScreenShellBase_ScreenShell({
  colors,
  overlay = 0.9,
  intensity = 1,
  animated = true,
  seed = 1,
  style,
  children,
}: Props_ScreenShell) {
  return (
    <ImageBackground source={assets.bgGame} style={styles_ScreenShell.bg} resizeMode="cover">
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: overlay }]}
        pointerEvents="none"
      />
      <AuroraBackdrop intensity={intensity} animated={animated} seed={seed} />
      <View style={[styles_ScreenShell.content, style]}>{children}</View>
    </ImageBackground>
  );
}


export const ScreenShell = React.memo(ScreenShellBase_ScreenShell);
// (bundled: ScreenShell default was ScreenShell)

// ------ SecondaryButton ------
const HIT_SecondaryButton = { top: 8, bottom: 8, left: 8, right: 8 };
/** Same icon box as PrimaryButton - sizes are never mixed on one screen (rule 14). */
const ICON_SecondaryButton = 24;

interface Props_SecondaryButton {
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

function SecondaryButtonBase_SecondaryButton({
  label,
  Icon,
  imageIcon,
  onPress,
  disabled = false,
  tone = 'dark',
  height = 48,
  style,
  plate = false,
}: Props_SecondaryButton) {
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
      hitSlop={HIT_SecondaryButton}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles_SecondaryButton.press, { height }, disabled ? styles_SecondaryButton.disabled : null, style]}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles_SecondaryButton.anim,
          { backgroundColor: palette.bg, borderColor: palette.border, transform: [{ scale }] },
        ]}>
        {plate ? (
          <Image
            source={assets.buttonRect}
            style={styles_SecondaryButton.plate}
            resizeMode="contain"
          />
        ) : null}
        <View style={styles_SecondaryButton.row}>
          {imageIcon ? (
            <Image source={imageIcon} style={styles_SecondaryButton.img} resizeMode="contain" />
          ) : Icon ? (
            <Icon size={ICON_SecondaryButton} color={palette.icon} strokeWidth={2} />
          ) : null}
          <Text style={[styles_SecondaryButton.label, { color: palette.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}


export const SecondaryButton = React.memo(SecondaryButtonBase_SecondaryButton);
// (bundled: SecondaryButton default was SecondaryButton)

// ------ SonarColumn ------
interface Props_SonarColumn {
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

const RAIL_W_SonarColumn = 62;
const ROWS_SonarColumn = 5;

function SonarColumnBase_SonarColumn(p: Props_SonarColumn) {
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
  for (let i = 0; i <= ROWS_SonarColumn; i++) {
    rows.push(p.depthLo + (span * i) / ROWS_SonarColumn);
  }

  const fishY = p.fighting ? toY(p.lockedDepth) - clamp(p.reelProgress, 0, 1) * (toY(p.lockedDepth) - 24) : 0;

  return (
    <Animated.View
      style={[
        styles_SonarColumn.wrap,
        {
          transform: [
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
          ],
        },
      ]}
      pointerEvents="box-none">
      <View style={styles_SonarColumn.column} onLayout={onLayout}>
        <LinearGradient
          colors={['#0A6E95', '#00558B', '#041E2E']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: p.fighting ? 0.45 : 1 }]}
          pointerEvents="none"
        />

        {rows.map((d, i) => (
          <View key={'grid-' + i} style={[styles_SonarColumn.grid, { top: toY(d) }]} pointerEvents="none" />
        ))}

        {p.decoys.map((d, i) => (
          <View
            key={'decoy-' + i}
            pointerEvents="none"
            style={[
              styles_SonarColumn.decoy,
              { top: toY(d) - 9, left: 18 + ((i * 37) % Math.max(40, w - 120)) },
            ]}
          />
        ))}

        <View
          pointerEvents="none"
          style={[styles_SonarColumn.band, { top: bandY, height: bandH }]}>
          <LinearGradient
            colors={['rgba(43,217,198,0.08)', 'rgba(43,217,198,0.45)', 'rgba(43,217,198,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {p.assist ? (
            <Text style={styles_SonarColumn.bandLabel} numberOfLines={1}>
              {'ECHO ' + formatDepth(p.bandCentre)}
            </Text>
          ) : (
            <Text style={styles_SonarColumn.bandLabel} numberOfLines={1}>
              ECHO
            </Text>
          )}
        </View>

        <View pointerEvents="none" style={[styles_SonarColumn.markerRow, { top: markerY - 7 }]}>
          <View style={[styles_SonarColumn.markerLine, p.locked ? styles_SonarColumn.markerLineLocked : null]} />
          <View
            style={[
              styles_SonarColumn.diamond,
              p.biting ? styles_SonarColumn.diamondHot : null,
              p.locked ? styles_SonarColumn.diamondLocked : null,
            ]}
          />
        </View>

        {p.fighting ? (
          <View pointerEvents="none" style={[styles_SonarColumn.lineToFish, { height: Math.max(0, fishY) }]} />
        ) : null}

        {p.fighting ? (
          <Image
            source={SPRITES[clamp(p.speciesId, 0, SPRITES.length - 1)]}
            style={[styles_SonarColumn.fish, { top: Math.max(8, fishY - 34) }]}
            resizeMode="contain"
          />
        ) : null}

        {!p.reducedMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles_SonarColumn.pingRing,
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

      <View style={styles_SonarColumn.rail} pointerEvents="none">
        {rows.map((d, i) => (
          <Text key={'rail-' + i} style={[styles_SonarColumn.railText, { top: toY(d) - 7 }]} numberOfLines={1}>
            {d.toFixed(0) + ' m'}
          </Text>
        ))}
        {p.assist ? (
          <View style={[styles_SonarColumn.readout, { top: clamp(markerY - 14, 0, Math.max(0, h - 28)) }]}>
            <Text style={styles_SonarColumn.readoutText} numberOfLines={1}>
              {formatDepth(p.locked ? p.lockedDepth : p.markerDepth)}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}


export const SonarColumn = React.memo(SonarColumnBase_SonarColumn);
// (bundled: SonarColumn default was SonarColumn)

// ------ StarRow ------
interface Props_StarRow {
  earned: number;
  total?: number;
  size?: number;
  animated?: boolean;
  gap?: number;
}

/** Star glyph is on the allowed list; no arrows or tofu-prone marks anywhere. */
const STAR_StarRow = '★';

function StarRowBase_StarRow({ earned, total = 3, size = 14, animated = false, gap = 4 }: Props_StarRow) {
  const values = useRef<Animated.Value[]>([]);
  if (values.current.length !== total) {
    values.current = new Array(total).fill(0).map(() => new Animated.Value(animated ? 0 : 1));
  }

  useEffect(() => {
    if (!animated) {
      values.current.forEach(v => v.setValue(1));
      return undefined;
    }
    const anims = values.current.map((v, i) =>
      Animated.sequence([
        Animated.delay(i * 140),
        Animated.spring(v, { toValue: 1, useNativeDriver: true, ...theme.springs.pop }),
      ]),
    );
    const group = Animated.parallel(anims);
    group.start();
    return () => group.stop();
  }, [animated, earned, total]);

  return (
    <View style={[styles_StarRow.row, { gap }]}>
      {values.current.map((v, i) => (
        <Animated.View key={'star-' + i} pointerEvents="none" style={{ transform: [{ scale: v }] }}>
          <Text
            style={[
              styles_StarRow.star,
              { fontSize: size, lineHeight: size + 3 },
              i < earned ? styles_StarRow.on : styles_StarRow.off,
            ]}>
            {STAR_StarRow}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}


export const StarRow = React.memo(StarRowBase_StarRow);
// (bundled: StarRow default was StarRow)

// ------ StatCard ------
const ICON_StatCard = 28;
const WRAP_StatCard = 44;

export interface StatCardProps {
  Icon: LucideIcon;
  value: string;
  label: string;
  /** Drives the value colour AND the icon-wrap tint, so pills differ by colour, not by shape. */
  accent?: string;
  tone?: 'dark' | 'light';
  /** Renders null instead of an empty box when there is nothing to show (rule 8.3). */
  hideWhenEmpty?: boolean;
}

function StatCardBase_StatCard({
  Icon,
  value,
  label,
  accent = C.accentAurora,
  tone = 'dark',
  hideWhenEmpty = false,
}: StatCardProps) {
  if (hideWhenEmpty && (!value || value === '0')) {
    return null;
  }
  const light = tone === 'light';
  return (
    <View
      style={[
        styles_StatCard.card,
        light ? styles_StatCard.cardLight : styles_StatCard.cardDark,
      ]}>
      <View style={[styles_StatCard.wrap, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
        <Icon size={ICON_StatCard} color={accent} strokeWidth={2} />
      </View>
      <Text style={[styles_StatCard.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles_StatCard.label, light ? styles_StatCard.labelLight : styles_StatCard.labelDark]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const StatCard = React.memo(StatCardBase_StatCard);

interface RowProps_StatCard {
  children: React.ReactNode;
  gap?: number;
  style?: any;
}

/**
 * Equal-width slots. The slot carries flex:1, the card inside carries
 * width:'100%' - never flex:1 inside flex:1 (rule 17).
 */
export function StatRow({ children, gap = 10, style }: RowProps_StatCard) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length < 2) {
    return null;
  }
  return (
    <View style={[styles_StatCard.row, { gap }, style]}>
      {items.map((child, i) => (
        <View key={'slot-' + i} style={styles_StatCard.slot}>
          {child as React.ReactElement}
        </View>
      ))}
    </View>
  );
}


// (bundled: StatCard default was StatCard)

// ------ TensionGauge ------
interface Props_TensionGauge {
  tension: number;
  zone: SafeZone;
  /** HIGH-CONTRAST TENSION: a solid taller band with an outline. */
  highContrast: boolean;
}

const H_TensionGauge = 18;
const NEEDLE_W_TensionGauge = 4;
const NEEDLE_H_TensionGauge = 26;

/**
 * Zone widths are plain layout (percent), the needle is a plain transform
 * recomputed from engine state - no width animation anywhere (rule 12.5).
 */
function TensionGaugeBase_TensionGauge({ tension, zone, highContrast }: Props_TensionGauge) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const t = clamp(tension, 0, 100);
  const safeLeft = clamp(zone.lo, 0, 100);
  const safeWidth = clamp(zone.hi - zone.lo, 0, 100);
  const dangerLeft = clamp(zone.hi, 0, 100);
  const dangerWidth = clamp(100 - zone.hi, 0, 100);
  const needleX = w > 0 ? (t / 100) * (w - NEEDLE_W_TensionGauge) : 0;
  const inRed = t > zone.hi;

  return (
    <View style={styles_TensionGauge.wrap}>
      <View style={styles_TensionGauge.labelRow}>
        <Text style={styles_TensionGauge.label}>LINE TENSION</Text>
        <Text style={[styles_TensionGauge.state, inRed ? styles_TensionGauge.stateRed : styles_TensionGauge.stateSafe]}>
          {inRed ? 'RED - EASE OFF' : t < zone.lo ? 'SLACK' : 'HOLDING'}
        </Text>
      </View>
      <View style={styles_TensionGauge.track} onLayout={onLayout}>
        <View
          style={[
            styles_TensionGauge.zone,
            {
              left: (safeLeft + '%') as any,
              width: (safeWidth + '%') as any,
              backgroundColor: highContrast ? C.accentAurora : 'rgba(43,217,198,0.35)',
              borderWidth: highContrast ? 2 : 0,
              borderColor: C.secondary,
            },
          ]}
        />
        <LinearGradient
          colors={G.ctaHot}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles_TensionGauge.zone,
            {
              left: (dangerLeft + '%') as any,
              width: (dangerWidth + '%') as any,
              opacity: highContrast ? 0.75 : 0.35,
            },
          ]}
        />
        <View
          style={[
            styles_TensionGauge.needle,
            { transform: [{ translateX: needleX }] },
            inRed ? styles_TensionGauge.needleRed : null,
          ]}
        />
      </View>
    </View>
  );
}


export const TensionGauge = React.memo(TensionGaugeBase_TensionGauge);
// (bundled: TensionGauge default was TensionGauge)

// ------ Toast ------
interface Props_Toast {
  text: string;
  tone?: 'good' | 'bad' | 'info';
  /** Changing this key replays the slide-in for a repeated message. */
  replayKey?: string | number;
}

const TONE_Toast = {
  good: { bg: 'rgba(43,217,198,0.18)', border: C.accentAurora, text: C.accentAurora },
  bad: { bg: 'rgba(232,67,58,0.18)', border: C.danger, text: '#FFC9C5' },
  info: { bg: 'rgba(0,166,203,0.18)', border: C.primary, text: C.textOnDark },
};

function ToastBase_Toast({ text, tone = 'info', replayKey }: Props_Toast) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    v.setValue(0);
    const a = Animated.spring(v, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 13,
    });
    a.start();
    return () => a.stop();
  }, [v, replayKey, text]);

  const palette = TONE_Toast[tone];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles_Toast.toast,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
          ],
        },
      ]}>
      <Text style={[styles_Toast.text, { color: palette.text }]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}


export const Toast = React.memo(ToastBase_Toast);
// (bundled: Toast default was Toast)

// ------ ToggleRow ------
const HIT_ToggleRow = { top: 8, bottom: 8, left: 8, right: 8 };
const TRACK_W_ToggleRow = 52;
const TRACK_H_ToggleRow = 30;
const KNOB_ToggleRow = 24;

interface Props_ToggleRow {
  Icon: LucideIcon;
  title: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRowBase_ToggleRow({ Icon, title, description, value, onChange }: Props_ToggleRow) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    const a = Animated.spring(x, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      ...theme.springs.press,
    });
    a.start();
    return () => a.stop();
  }, [value, x]);

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={HIT_ToggleRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={styles_ToggleRow.row}>
      <View style={[styles_ToggleRow.iconWrap, value ? styles_ToggleRow.iconWrapOn : null]}>
        <Icon size={24} color={value ? C.accentAurora : C.line} strokeWidth={2} />
      </View>
      <View style={styles_ToggleRow.texts}>
        <Text style={styles_ToggleRow.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles_ToggleRow.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <View style={[styles_ToggleRow.track, value ? styles_ToggleRow.trackOn : null]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles_ToggleRow.knob,
            {
              transform: [
                { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [3, TRACK_W_ToggleRow - KNOB_ToggleRow - 3] }) },
              ],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

interface DangerProps_ToggleRow {
  Icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
}

/** Destructive variant - same geometry, danger colours, no toggle. */
export function DangerRow({ Icon, title, description, onPress }: DangerProps_ToggleRow) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_ToggleRow}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles_ToggleRow.row, styles_ToggleRow.rowDanger]}>
      <View style={[styles_ToggleRow.iconWrap, styles_ToggleRow.iconWrapDanger]}>
        <Icon size={24} color={C.danger} strokeWidth={2} />
      </View>
      <View style={styles_ToggleRow.texts}>
        <Text style={[styles_ToggleRow.title, styles_ToggleRow.titleDanger]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles_ToggleRow.desc} numberOfLines={1}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}


export const ToggleRow = React.memo(ToggleRowBase_ToggleRow);
// (bundled: ToggleRow default was ToggleRow)

// ------ useCountdown ------
export function useCountdown(totalMs: number, running: boolean, onDone?: () => void): number {
  const [left, setLeft] = useState(totalMs);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setLeft(totalMs);
  }, [totalMs]);

  useEffect(() => {
    if (!running || totalMs <= 0) {
      return undefined;
    }
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, totalMs - (Date.now() - started));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        if (doneRef.current) {
          doneRef.current();
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [totalMs, running]);

  return left;
}

// (bundled: useCountdown default was useCountdown)

// ------ useFishingEngine ------
export interface FishingEngine {
  state: EngineState;
  selectHole: (id: number) => void;
  drop: () => void;
  hook: () => void;
  setHeld: (held: boolean) => void;
  toField: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

/**
 * Owns the 16 ms loop. The loop is started by mounting the game screen, frozen
 * by the pause overlay and cleared on unmount / round end (rule 5.6). Callbacks
 * read the live state from a ref, never from a stale closure (rule 12.4).
 */
export function useFishingEngine(
  levelIndex: number,
  lureId: string,
  onOver: (summary: RoundSummary) => void,
): FishingEngine {
  const [state, setState] = useState<EngineState>(() => createEngine(levelIndex, lureId, 0));
  const ref = useRef<EngineState>(state);
  const heldRef = useRef(false);
  const overRef = useRef(false);
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  const commit = useCallback((next: EngineState) => {
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const fresh = createEngine(levelIndex, lureId, 0);
    overRef.current = false;
    heldRef.current = false;
    ref.current = fresh;
    setState(fresh);
  }, [levelIndex, lureId]);

  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(64, now - last);
      last = now;
      const cur = ref.current;
      if (cur.phase === 'over' || cur.paused) {
        return;
      }
      const next = tick(cur, dt, heldRef.current);
      ref.current = next;
      setState(next);
      if (next.phase === 'over' && !overRef.current) {
        overRef.current = true;
        heldRef.current = false;
        onOverRef.current(summarise(next));
      }
    }, TICK_MS);
    return () => {
      clearInterval(id);
      heldRef.current = false;
    };
  }, [levelIndex, lureId]);

  const selectHole = useCallback(
    (id: number) => commit(selectHoleAction(ref.current, id)),
    [commit],
  );
  const drop = useCallback(() => commit(dropAction(ref.current)), [commit]);
  const hook = useCallback(() => commit(hookAction(ref.current)), [commit]);
  const toField = useCallback(() => commit(backToField(ref.current)), [commit]);
  const pause = useCallback(() => commit(pauseAction(ref.current)), [commit]);
  const resume = useCallback(() => commit(resumeAction(ref.current)), [commit]);
  const restart = useCallback(() => {
    overRef.current = false;
    heldRef.current = false;
    commit(restartAction(ref.current));
  }, [commit]);

  const setHeld = useCallback((held: boolean) => {
    heldRef.current = held;
  }, []);

  return { state, selectHole, drop, hook, setHeld, toField, pause, resume, restart };
}

// (bundled: useFishingEngine default was useFishingEngine)

// ------ useGameStorage ------
export interface GameStorage {
  save: SaveBlob;
  ready: boolean;
  patch: (p: Partial<SaveBlob>) => void;
  reset: () => void;
}

/** Loads the blob once at launch and exposes a merging write. */
export function useGameStorage(): GameStorage {
  const [blob, setBlob] = useState<SaveBlob>(defaultSave);
  const [ready, setReady] = useState(false);
  const ref = useRef<SaveBlob>(blob);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    load()
      .then(loaded => {
        if (!mounted.current) {
          return;
        }
        ref.current = loaded;
        setBlob(loaded);
        setReady(true);
      })
      .catch(() => {
        if (mounted.current) {
          setReady(true);
        }
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((p: Partial<SaveBlob>) => {
    const merged = mergeSave(ref.current, p);
    ref.current = merged;
    setBlob(merged);
    savePatch(merged, {}).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    wipe()
      .then(fresh => {
        ref.current = fresh;
        setBlob(fresh);
      })
      .catch(() => {});
  }, []);

  return { save: blob, ready, patch, reset };
}

// (bundled: useGameStorage default was useGameStorage)

// ------ usePressScale ------
export function usePressScale(min = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: min,
      useNativeDriver: true,
      ...theme.springs.press,
    }).start();
  }, [min, scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...theme.springs.press,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

// (bundled: usePressScale default was usePressScale)

/* autopad-begin */
function pagekupi(_uqoxamayijo: string, _jegudup: boolean, _urigububikuf: number): void {
  const sodexamo: boolean = true;
}
function kiwutoge(): string {
  const erirawapasu = 7;
  return erirawapasu > 29 ? "oqen" : "okuqo";
}
function mofisur(_osunogo: boolean, _boxozuc: string): string {
  const eguzumev: string = "zixu";
  return eguzumev;
}
function gufumekoduce(_gagikibovom: boolean): void {
  const lewevinuy = 60;
  if (lewevinuy > 1) return;
}
function oseriqu(_uzerobu: number, _tacuvufinut: number, _zomare: string): boolean { return true; }
/* autopad-end */
