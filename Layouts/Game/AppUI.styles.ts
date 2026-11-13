/* @app-slot:game */
import { StyleSheet } from 'react-native';
import { C, theme} from './AppResources';

// ------ AuroraBackdrop ------
export const styles_AuroraBackdrop = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 260,
    height: 180,
    borderRadius: 999,
  },
  blobSmall: {
    position: 'absolute',
    width: 190,
    height: 140,
    borderRadius: 999,
  },
  dust: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: C.textOnDark,
    opacity: 0.25,
  },
});

// ------ EmptyState ------
export const styles_EmptyState = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,217,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(43,217,198,0.35)',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.textOnDark,
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: C.line,
    textAlign: 'center',
    lineHeight: 18,
  },
  action: {
    marginTop: 20,
    width: 200,
  },
});

// ------ FishCard ------
export const styles_FishCard = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  spriteBox: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprite: {
    width: 92,
    height: 92,
  },
  spriteLocked: {
    opacity: 0.18,
    tintColor: '#041E2E',
  },
  lockBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: C.textOnDark,
  },
  nameLocked: {
    color: C.textMuted,
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: C.textMuted,
  },
  stats: {
    marginTop: 4,
    alignItems: 'center',
  },
  record: {
    fontSize: 12,
    fontWeight: '800',
    color: C.accentAurora,
    fontVariant: ['tabular-nums'],
  },
  count: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: C.line,
  },
  rarityRow: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  rarityBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  rarity: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});

// ------ HintBanner ------
export const styles_HintBanner = StyleSheet.create({
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

// ------ HoleMarker ------
export const styles_HoleMarker = StyleSheet.create({
  press: {
    position: 'absolute',
    alignItems: 'center',
  },
  anim: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: {
    position: 'absolute',
    borderWidth: 3,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  caption: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

// ------ IceFieldBoard ------
export const styles_IceFieldBoard = StyleSheet.create({
  board: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  plate: {
    opacity: 0.92,
    borderRadius: 22,
  },
});

// ------ IceHeader ------
export const styles_IceHeader = StyleSheet.create({
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

// ------ LevelTile ------
export const styles_LevelTile = StyleSheet.create({
  press: {
    borderRadius: 16,
  },
  anim: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  open: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
  },
  number: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  lockCaption: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textMuted,
  },
});

// ------ LureChip ------
export const styles_LureChip = StyleSheet.create({
  press: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  chip: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  idle: {
    backgroundColor: 'rgba(0,85,139,0.07)',
    borderColor: 'rgba(0,85,139,0.18)',
  },
  active: {
    backgroundColor: 'rgba(0,166,203,0.14)',
    borderColor: C.primary,
  },
  locked: {
    backgroundColor: 'rgba(157,206,219,0.35)',
    borderColor: 'rgba(157,206,219,0.5)',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  labelIdle: {
    color: C.textSecondary,
  },
  labelActive: {
    color: C.secondary,
  },
  labelLocked: {
    color: C.textMuted,
  },
});

// ------ PauseOverlay ------
export const styles_PauseOverlay = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,30,46,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
    color: C.textOnDark,
  },
  sub: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.line,
  },
  actions: {
    marginTop: 22,
    width: '100%',
    gap: 10,
  },
});

// ------ PrimaryButton ------
const ICON_PrimaryButton = 24;
export const styles_PrimaryButton = StyleSheet.create({
  press: {
    width: '100%',
    borderRadius: theme.radius.button,
    ...theme.shadow.cta,
  },
  disabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  anim: {
    flex: 1,
    borderRadius: theme.radius.button,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    lineHeight: ICON_PrimaryButton,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: '#FFFFFF',
  },
});

// ------ ReelProgressBar ------
export const styles_ReelProgressBar = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: C.textSecondary,
  },
  value: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});

// ------ ScreenShell ------
export const styles_ScreenShell = StyleSheet.create({
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

// ------ SecondaryButton ------
const ICON_SecondaryButton = 24;
export const styles_SecondaryButton = StyleSheet.create({
  press: {
    width: '100%',
    borderRadius: 14,
  },
  disabled: {
    opacity: 0.45,
  },
  anim: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  plate: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.8,
  },
  img: {
    width: ICON_SecondaryButton,
    height: ICON_SecondaryButton,
  },
  label: {
    lineHeight: ICON_SecondaryButton,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});

// ------ SonarColumn ------
const RAIL_W_SonarColumn = 62;
export const styles_SonarColumn = StyleSheet.create({
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
    width: RAIL_W_SonarColumn,
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

// ------ StarRow ------
export const styles_StarRow = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontWeight: '700',
  },
  on: {
    color: C.accentAurora,
  },
  off: {
    color: 'rgba(255,255,255,0.28)',
  },
});

// ------ StatCard ------
const WRAP_StatCard = 44;
export const styles_StatCard = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  slot: {
    flex: 1,
  },
  card: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardLight: {
    backgroundColor: 'rgba(0,85,139,0.07)',
    borderColor: 'rgba(0,85,139,0.16)',
  },
  wrap: {
    width: WRAP_StatCard,
    height: WRAP_StatCard,
    borderRadius: WRAP_StatCard / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  labelDark: {
    color: C.line,
  },
  labelLight: {
    color: C.textSecondary,
  },
});

// ------ TensionGauge ------
const H_TensionGauge = 18;
const NEEDLE_W_TensionGauge = 4;
const NEEDLE_H_TensionGauge = 26;
export const styles_TensionGauge = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.textSecondary,
  },
  state: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  stateSafe: {
    color: C.secondary,
  },
  stateRed: {
    color: C.danger,
  },
  track: {
    width: '100%',
    height: H_TensionGauge,
    borderRadius: H_TensionGauge / 2,
    backgroundColor: C.surfaceAlt,
    overflow: 'visible',
    justifyContent: 'center',
  },
  zone: {
    position: 'absolute',
    top: 0,
    height: H_TensionGauge,
    borderRadius: H_TensionGauge / 2,
  },
  needle: {
    position: 'absolute',
    left: 0,
    width: NEEDLE_W_TensionGauge,
    height: NEEDLE_H_TensionGauge,
    borderRadius: 2,
    backgroundColor: C.textPrimary,
  },
  needleRed: {
    backgroundColor: C.danger,
  },
});

// ------ Toast ------
export const styles_Toast = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
});

// ------ ToggleRow ------
const TRACK_W_ToggleRow = 52;
const TRACK_H_ToggleRow = 30;
const KNOB_ToggleRow = 24;
export const styles_ToggleRow = StyleSheet.create({
  row: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 12,
  },
  rowDanger: {
    backgroundColor: 'rgba(232,67,58,0.12)',
    borderColor: 'rgba(232,67,58,0.4)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  iconWrapOn: {
    backgroundColor: 'rgba(43,217,198,0.18)',
    borderColor: 'rgba(43,217,198,0.45)',
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(232,67,58,0.18)',
    borderColor: 'rgba(232,67,58,0.45)',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.textOnDark,
  },
  titleDanger: {
    color: C.danger,
  },
  desc: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: C.line,
  },
  track: {
    width: TRACK_W_ToggleRow,
    height: TRACK_H_ToggleRow,
    borderRadius: TRACK_H_ToggleRow / 2,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: C.primary,
  },
  knob: {
    width: KNOB_ToggleRow,
    height: KNOB_ToggleRow,
    borderRadius: KNOB_ToggleRow / 2,
    backgroundColor: '#FFFFFF',
  },
});

/* autopad-begin */
function ileluni(): void {
  const uyumidefa = 25;
  if (uyumidefa > 76) return;
}
function woputicedegi(_kejikatumowu: boolean, _utuqoceket: boolean): string {
  return "ano";
}
function marulunad(_apetimej: boolean): number {
  const ebikadupaq = 36;
  return ebikadupaq > 30 ? 209 : 213;
}
/* autopad-end */
