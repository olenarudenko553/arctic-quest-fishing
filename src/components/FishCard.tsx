import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { SPRITES } from '../assets';
import { C } from '../constants/theme';
import { RARITY_LABEL, Species } from '../game/species';
import { formatKg } from '../game/scoring';

interface Props {
  species: Species;
  caught: number;
  recordKg: number;
  width: number;
}

/** Sprites are drawn with contain - never stretched, never masked (rule 13.3). */
function FishCardBase({ species, caught, recordKg, width }: Props) {
  const locked = caught <= 0;
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.spriteBox}>
        <Image
          source={SPRITES[species.id]}
          style={[styles.sprite, locked ? styles.spriteLocked : null]}
          resizeMode="contain"
        />
        {locked ? (
          <View style={styles.lockBadge}>
            <Lock size={20} color={C.textMuted} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.name, locked ? styles.nameLocked : null]} numberOfLines={1}>
        {locked ? 'UNIDENTIFIED' : species.name}
      </Text>

      {locked ? (
        <Text style={styles.hint} numberOfLines={1}>
          {species.unlockHint}
        </Text>
      ) : (
        <View style={styles.stats}>
          <Text style={styles.record} numberOfLines={1}>
            {'RECORD ' + formatKg(recordKg)}
          </Text>
          <Text style={styles.count} numberOfLines={1}>
            {'CAUGHT x' + caught}
          </Text>
        </View>
      )}

      <View style={styles.rarityRow}>
        <View style={[styles.rarityBar, { backgroundColor: species.color }]} />
        <Text style={[styles.rarity, { color: species.color }]} numberOfLines={1}>
          {RARITY_LABEL[species.rarity]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

export const FishCard = React.memo(FishCardBase);
export default FishCard;
