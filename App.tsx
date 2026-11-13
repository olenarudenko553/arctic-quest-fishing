/**
 * ArcticQuestFishing - ARCTIC QUEST
 *
 * The screen state machine lives here and nowhere else: a plain union plus
 * conditional rendering, no navigation library (rule 1.2). Every screen gets
 * explicit callbacks and never reaches into another screen's state (rule 1.4).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, StatusBar, StyleSheet, View } from 'react-native';
import { COMBO_MAX, SCREEN_FADE_MS } from './src/constants/config';
import { RoundSummary } from './src/game/engine';
import { LureId } from './src/game/lures';
import { highestUnlocked, Settings, SpeciesRecord } from './src/game/persistence';
import { speciesById } from './src/game/species';
import useGameStorage from './src/hooks/useGameStorage';
import LoaderScreen from './src/screens/LoaderScreen';
import MenuScreen from './src/screens/MenuScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Screen =
  | 'loader'
  | 'menu'
  | 'levels'
  | 'game'
  | 'result'
  | 'gameover'
  | 'collection'
  | 'progress'
  | 'settings';

function App(): React.JSX.Element {
  const storage = useGameStorage();
  const [screen, setScreen] = useState<Screen>('loader');
  const [levelIndex, setLevelIndex] = useState(0);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [newSpecies, setNewSpecies] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const saveRef = useRef(storage.save);
  saveRef.current = storage.save;

  // 260 ms cross-fade + 12 px rise on every screen change (rule 1.7)
  useEffect(() => {
    fade.setValue(0);
    const a = Animated.timing(fade, {
      toValue: 1,
      duration: SCREEN_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [screen, fade]);

  // System Back: returns to the previous screen, closes the app on Menu (rule 1.3)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'loader') {
        return true;
      }
      if (screen === 'menu') {
        return false;
      }
      if (screen === 'result' || screen === 'gameover' || screen === 'game') {
        setScreen('menu');
        return true;
      }
      setScreen('menu');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const startLevel = useCallback((index: number) => {
    setLevelIndex(index);
    setSummary(null);
    setNewSpecies(null);
    setScreen('game');
  }, []);

  const playNext = useCallback(() => {
    startLevel(highestUnlocked(saveRef.current));
  }, [startLevel]);

  /** The only place lifetime progress is written. */
  const handleGameOver = useCallback(
    (result: RoundSummary) => {
      const save = saveRef.current;

      const species: SpeciesRecord[] = save.species.map(r => ({ ...r }));
      let firstNew: string | null = null;
      for (let i = 0; i < result.caught.length; i++) {
        const c = result.caught[i];
        const rec = species[c.speciesId] || { caught: 0, recordKg: 0 };
        if (rec.caught === 0 && !firstNew) {
          firstNew = speciesById(c.speciesId).name;
        }
        species[c.speciesId] = {
          caught: rec.caught + 1,
          recordKg: Math.max(rec.recordKg, c.kg),
        };
      }

      const stars = save.stars.slice();
      stars[result.levelIndex] = Math.max(stars[result.levelIndex] || 0, result.stars);

      storage.patch({
        stars,
        species,
        bestScore: Math.max(save.bestScore, result.score),
        fishLanded: save.fishLanded + result.caught.length,
        linesSnapped: save.linesSnapped + result.lineBreaks,
        bestCombo: Math.min(COMBO_MAX, Math.max(save.bestCombo, result.bestCombo)),
      });

      setNewSpecies(firstNew);
      setSummary(result);
      setScreen('result');
    },
    [storage],
  );

  const goMenu = useCallback(() => setScreen('menu'), []);
  const goLevels = useCallback(() => setScreen('levels'), []);
  const goCollection = useCallback(() => setScreen('collection'), []);
  const goProgress = useCallback(() => setScreen('progress'), []);
  const goSettings = useCallback(() => setScreen('settings'), []);

  const pickLure = useCallback(
    (id: string) => storage.patch({ lure: id as LureId }),
    [storage],
  );

  const changeSettings = useCallback(
    (patch: Partial<Settings>) =>
      storage.patch({ settings: { ...saveRef.current.settings, ...patch } }),
    [storage],
  );

  const resetProgress = useCallback(() => {
    storage.reset();
    setScreen('menu');
  }, [storage]);

  const againLevel = useCallback(() => {
    startLevel(summary ? summary.levelIndex : levelIndex);
  }, [startLevel, summary, levelIndex]);

  let body: React.ReactNode = null;
  if (screen === 'loader') {
    body = <LoaderScreen onDone={goMenu} />;
  } else if (screen === 'menu') {
    body = (
      <MenuScreen
        save={storage.save}
        onPlay={playNext}
        onLevels={goLevels}
        onCollection={goCollection}
        onProgress={goProgress}
        onSettings={goSettings}
        onPickLure={pickLure}
      />
    );
  } else if (screen === 'levels') {
    body = <LevelSelectScreen save={storage.save} onBack={goMenu} onStart={startLevel} />;
  } else if (screen === 'game') {
    body = (
      <GameScreen
        levelIndex={levelIndex}
        save={storage.save}
        onGameOver={handleGameOver}
        onMenu={goMenu}
      />
    );
  } else if ((screen === 'result' || screen === 'gameover') && summary) {
    body = (
      <ResultScreen
        summary={summary}
        save={storage.save}
        newSpecies={newSpecies}
        onAgain={againLevel}
        onMenu={goMenu}
        onCollection={goCollection}
        onLevels={goLevels}
      />
    );
  } else if (screen === 'collection') {
    body = <CollectionScreen save={storage.save} onBack={goMenu} />;
  } else if (screen === 'progress') {
    body = <ProgressScreen save={storage.save} onBack={goMenu} onPlay={playNext} />;
  } else if (screen === 'settings') {
    body = (
      <SettingsScreen
        save={storage.save}
        onBack={goMenu}
        onChange={changeSettings}
        onReset={resetProgress}
      />
    );
  } else {
    body = (
      <MenuScreen
        save={storage.save}
        onPlay={playNext}
        onLevels={goLevels}
        onCollection={goCollection}
        onProgress={goProgress}
        onSettings={goSettings}
        onPickLure={pickLure}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.root,
          {
            opacity: fade,
            transform: [
              { translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}>
        {body}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#041E2E',
  },
});

export default App;
