import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { C, theme } from '../constants/theme';

interface Props {
  earned: number;
  total?: number;
  size?: number;
  animated?: boolean;
  gap?: number;
}

/** Star glyph is on the allowed list; no arrows or tofu-prone marks anywhere. */
const STAR = '★';

function StarRowBase({ earned, total = 3, size = 14, animated = false, gap = 4 }: Props) {
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
    <View style={[styles.row, { gap }]}>
      {values.current.map((v, i) => (
        <Animated.View key={'star-' + i} pointerEvents="none" style={{ transform: [{ scale: v }] }}>
          <Text
            style={[
              styles.star,
              { fontSize: size, lineHeight: size + 3 },
              i < earned ? styles.on : styles.off,
            ]}>
            {STAR}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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

export const StarRow = React.memo(StarRowBase);
export default StarRow;
