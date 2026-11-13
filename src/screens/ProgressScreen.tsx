import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award, Fish, Play, Scale, Star, Target, Trophy, Zap } from 'lucide-react-native';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import StatCard, { StatRow } from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { C, G, theme } from '../constants/theme';
import { TOTAL_STARS, ZONES } from '../game/levels';
import { clearedInZone, SaveBlob, speciesFound, totalStars } from '../game/persistence';
import { formatScore } from '../game/scoring';
import { SPECIES } from '../game/species';

interface Props {
  save: SaveBlob;
  onBack: () => void;
  onPlay: () => void;
}

function ProgressScreen({ save, onBack, onPlay }: Props) {
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
        <View style={styles.body}>
          <StatRow style={styles.row}>
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

          <StatRow style={styles.row}>
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

          <Text style={styles.sectionTitle}>EXPEDITION ZONES</Text>
          {ZONES.map(z => {
            const cleared = clearedInZone(save, z.levels);
            const pct = Math.round((cleared / z.levels.length) * 100);
            return (
              <View key={'zone-' + z.id} style={styles.zoneRow}>
                <View style={styles.zoneHead}>
                  <Text style={styles.zoneName} numberOfLines={1}>
                    {z.name}
                  </Text>
                  <Text style={styles.zoneCount} numberOfLines={1}>
                    {cleared + '/' + z.levels.length + ' CLEARED'}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: (pct + '%') as any }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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

export default ProgressScreen;
