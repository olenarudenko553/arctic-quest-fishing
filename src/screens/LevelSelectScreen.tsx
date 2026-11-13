import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import LevelTile from '../components/LevelTile';
import Toast from '../components/Toast';
import { C, G, theme } from '../constants/theme';
import { levelAt, TOTAL_STARS, ZONES } from '../game/levels';
import { isLevelUnlocked, SaveBlob, totalStars } from '../game/persistence';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.min(SCREEN_W - 32, 380);
/** card padding 14 + border 1 */
const CARD_FRAME = 15;
const GAP = 10;
const TILE = Math.max(64, Math.min(88, Math.floor((CARD_W - 2 * CARD_FRAME - 2 * GAP) / 3)));

interface Props {
  save: SaveBlob;
  onBack: () => void;
  onStart: (levelIndex: number) => void;
}

function LevelSelectScreen({ save, onBack, onStart }: Props) {
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
    <View style={styles.badge}>
      <Star size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles.badgeText}>{stars + '/' + TOTAL_STARS}</Text>
    </View>
  );

  return (
    <ScreenShell
      colors={G.levels}
      overlay={theme.overlay.levels}
      animated={!save.settings.reducedMotion}
      seed={21}>
      <IceHeader title="EXPEDITIONS" onBack={onBack} rightSlot={badge} />

      <View style={styles.body}>
        {ZONES.map(zone => (
          <View key={'zone-' + zone.id} style={styles.card}>
            <View style={styles.zoneHead}>
              <Text style={styles.zoneName} numberOfLines={1}>
                {zone.name}
              </Text>
              <Text style={styles.zoneHint} numberOfLines={1}>
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
            <View style={styles.tiles}>
              {zone.levels.map(idx => {
                const locked = !isLevelUnlocked(save, idx);
                return (
                  <LevelTile
                    key={'lvl-' + idx}
                    number={levelAt(idx).number}
                    stars={save.stars[idx] || 0}
                    locked={locked}
                    size={TILE}
                    onPress={locked ? warn : () => onStart(idx)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {toast > 0 ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <Toast text="COMPLETE THE PREVIOUS EXPEDITION" tone="bad" replayKey={toast} />
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
    gap: GAP,
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

export default LevelSelectScreen;
