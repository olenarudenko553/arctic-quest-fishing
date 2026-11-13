import React, { useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';
import { C } from '../constants/theme';
import { Hole } from '../game/generator';
import { clamp } from '../game/rng';
import HoleMarker from './HoleMarker';

const SCREEN_W = Dimensions.get('window').width;
export const BOARD_MAX_W = Math.min(SCREEN_W - 32, 380);
/** padding 8 + border 2 */
export const BOARD_FRAME = 10;
export const HOLE_D = Math.max(56, Math.floor((BOARD_MAX_W - 2 * BOARD_FRAME) / 3) - 12);

/** Room reserved under each hole for its FRESH xx% caption. */
const CAPTION_H = 20;

interface Props {
  holes: Hole[];
  activeId: number;
  onSelect: (id: number) => void;
  enabled: boolean;
}

/** Top-down ice plate. Hole placement comes from the seeded generator, never from constants. */
function IceFieldBoardBase({ holes, activeId, onSelect, enabled }: Props) {
  const [box, setBox] = useState({ w: BOARD_MAX_W, h: 320 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBox({ w: width, h: height });
    }
  };

  const placed = useMemo(() => {
    const innerW = Math.max(HOLE_D, box.w - 2 * BOARD_FRAME);
    const innerH = Math.max(HOLE_D + CAPTION_H, box.h - 2 * BOARD_FRAME);
    const spanX = Math.max(0, innerW - HOLE_D);
    const spanY = Math.max(0, innerH - HOLE_D - CAPTION_H);
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
    <View style={styles.board} onLayout={onLayout}>
      <LinearGradient
        colors={['#E8F4F8', '#B8DBE5']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.plate]}
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

const styles = StyleSheet.create({
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

export const IceFieldBoard = React.memo(IceFieldBoardBase);
export default IceFieldBoard;
