import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Home, Play, RotateCcw } from 'lucide-react-native';
import { C } from '../constants/theme';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

interface Props {
  caught: number;
  needed: number;
  score: string;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

/** While this is up the engine loop and the countdown are frozen (rule 5.6). */
function PauseOverlayBase({ caught, needed, score, onResume, onRestart, onMenu }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>PAUSED</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {'HAUL ' + caught + '/' + needed + '   SCORE ' + score}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton label="RESUME" Icon={Play} onPress={onResume} height={52} />
          <SecondaryButton label="RESTART" Icon={RotateCcw} onPress={onRestart} height={52} />
          <SecondaryButton label="MENU" Icon={Home} onPress={onMenu} height={52} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

export const PauseOverlay = React.memo(PauseOverlayBase);
export default PauseOverlay;
