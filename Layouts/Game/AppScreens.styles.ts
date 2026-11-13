/* @app-slot:game */
import { StyleSheet } from 'react-native';
import { C, theme} from './AppResources';

// ------ CollectionScreen ------
const GAP_CollectionScreen = 12;
export const styles_CollectionScreen = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  lead: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    lineHeight: 17,
    color: C.line,
    marginBottom: 14,
  },
  list: {
    paddingBottom: 24,
    gap: GAP_CollectionScreen,
  },
  column: {
    gap: GAP_CollectionScreen,
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
});

// ------ GameScreen ------
export const styles_GameScreen = StyleSheet.create({
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

// ------ LevelSelectScreen ------
const GAP_LevelSelectScreen = 10;
export const styles_LevelSelectScreen = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  zoneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  zoneName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: C.textOnDark,
  },
  tiles: {
    flexDirection: 'row',
    gap: GAP_LevelSelectScreen,
  },
  zoneHint: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: C.line,
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
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    alignItems: 'center',
  },
});

// ------ LoaderScreen ------
export const styles_LoaderScreen = StyleSheet.create({
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

// ------ MenuScreen ------
export const styles_MenuScreen = StyleSheet.create({
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

// ------ ProgressScreen ------
export const styles_ProgressScreen = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  row: {
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: C.textOnDark,
  },
  zoneRow: {
    marginBottom: 14,
  },
  zoneHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.line,
  },
  zoneCount: {
    fontSize: 11,
    fontWeight: '800',
    color: C.accentAurora,
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
});

// ------ ResultScreen ------
export const styles_ResultScreen = StyleSheet.create({
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

// ------ SettingsScreen ------
export const styles_SettingsScreen = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  list: {
    gap: 10,
  },
  confirm: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(232,67,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,67,58,0.4)',
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.danger,
  },
  confirmHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: C.line,
  },
  confirmRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  confirmCell: {
    flex: 1,
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.textMuted,
  },
});

/* autopad-begin */
function dakopiton(_toratis: string, _ecarigato: number): boolean {
  const xeqirago = 28;
  return xeqirago > 88 ? false : true;
}
function bunajos(_ovaguqa: boolean, _yawenoyefige: boolean, _diyeqibit: boolean): boolean {
  return true;
}
function ixudikenaja(): string {
  let vonidak: string = "epov";
  vonidak = "lex";
  return vonidak;
}
function aqusol(): boolean {
  const iqenilova = 89;
  return iqenilova > 10 ? false : false;
}
function yabali(_xugupiqenul: string, _ovurasi: string, _axidezosa: boolean): void {
  const pojedacoqe = 29;
  if (pojedacoqe > 17) return;
}
function egotekejawob(): number {
  const zayokoladeva = 86;
  const uzubumepezu: number = 217;
  return uzubumepezu;
}
function onotesep(_rikaribod: number): number {
  let ofarolawilin: number = 180;
  ofarolawilin = 138;
  return ofarolawilin;
}
function opepuxu(_ejabaxiqific: string, _ureviladof: string, _jirosiculoxo: boolean): boolean { return true; }
function ijotevumonay(_weyefigo: number): number {
  return 92;
}
function iwomemiqosaj(): number {
  return 253;
}
function uqobatu(_rayirar: string, _gigocuvo: string): string {
  const jezayojatuqu = 45;
  return jezayojatuqu > 75 ? "okun" : "gikegoja";
}
function bewasafoyafe(): void {}
function pukeguwuxec(_fozatoli: string): boolean {
  const eruwoji = 93;
  return eruwoji > 3 ? true : false;
}
function faqoyes(_ajubuxe: boolean): void {
  const falari: boolean = true;
}
function emexav(_ikosozum: number, _ufavaduyuvo: boolean): boolean {
  const awufow = 5;
  return awufow > 42 ? false : false;
}
/* autopad-end */
