import React, { useCallback } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import { Fish } from 'lucide-react-native';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import FishCard from '../components/FishCard';
import { C, G, theme } from '../constants/theme';
import { SaveBlob, speciesFound } from '../game/persistence';
import { Species, SPECIES } from '../game/species';

const SCREEN_W = Dimensions.get('window').width;
const GAP = 12;
const TILE_W = Math.floor((Math.min(SCREEN_W, 420) - 32 - GAP) / 2);

interface Props {
  save: SaveBlob;
  onBack: () => void;
}

function CollectionScreen({ save, onBack }: Props) {
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
          width={TILE_W}
        />
      );
    },
    [records],
  );

  const keyExtractor = useCallback((item: Species) => 'sp-' + item.id, []);

  const badge = (
    <View style={styles.badge}>
      <Fish size={16} color={C.accentAurora} strokeWidth={2.2} />
      <Text style={styles.badgeText}>{found + '/' + SPECIES.length}</Text>
    </View>
  );

  return (
    <ScreenShell
      colors={G.collection}
      overlay={theme.overlay.collection}
      animated={!save.settings.reducedMotion}
      seed={51}>
      <IceHeader title="COLLECTION" onBack={onBack} rightSlot={badge} />

      <View style={styles.body}>
        <Text style={styles.lead} numberOfLines={2}>
          EVERY SPECIES HOLDS AT ITS OWN DEPTH BAND. READ THE ECHO, MATCH THE BAND, FILL THE LOG.
        </Text>
        <FlatList
          data={SPECIES}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
    gap: GAP,
  },
  column: {
    gap: GAP,
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

export default CollectionScreen;
