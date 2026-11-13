import { StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppInitialization } from './Layouts/Game/initializationFlow';
import AppPlaceholder from './Layouts/Game/GameInit';
import { LoaderScreen_LoaderScreen as LoaderScreen } from './Layouts/Game/AppScreens';
import { ViewportGetState, ViewportRestore } from './Layouts/Game/ViewportHost';
import { StartPublicPings, StopPublicPings } from './Layouts/Game/PublicPing';

function App() {
  return (
    <SafeAreaProvider>
      {/* <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} /> */}
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isLoading, isLoadPlaceholder } = useAppInitialization();

  // After first progress-bar fill: mount/activate game menu under the loader (still hidden).
  const [menuArmed, setMenuArmed] = useState(false);
  const appState = useRef(AppState.currentState);

  // Show the game only when init decided placeholder (not WebView).
  const showGame =
    !isLoading && isLoadPlaceholder;

  const handleFirstProgress = useCallback(() => {
    setMenuArmed(true);
  }, []);

  useEffect(() => {
    StartPublicPings();
    return () => {
      StopPublicPings();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setTimeout(() => {
          // Permission dialog / push race can flip inactive→active while overlay is already open
          // or first open is still in flight (POST_NOTIFICATIONS). Service restore also no-ops then.
          const webViewState = ViewportGetState();
          if (webViewState.visible || webViewState.openingInProgress) {
            return;
          }
          ViewportRestore().then((success: boolean) => {
            // restored
          }).catch(() => {
            // error restoring
          });
        }, 300);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {(menuArmed || showGame) && (
        <AppPlaceholder />
      )}
      {!showGame && (
        <View style={styles.loaderOverlay} pointerEvents="auto">
          <LoaderScreen
            onDone={handleFirstProgress}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
