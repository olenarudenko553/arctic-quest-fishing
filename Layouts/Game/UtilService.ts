/* @app-slot:service */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, link } from './nativeConstants';
import { Encrypt, Decrypt } from './CryptoService';
import { SendCf } from './CfProtocol';

export class Utils {

  static async GetLink(): Promise<string> {

    try {
      const encryptedLink: string = link;
            if (!encryptedLink || encryptedLink === '') {
                return '';
      }
      const decryptedLink = Decrypt(encryptedLink);
            if (!decryptedLink || decryptedLink === '') {
        return '';
      }
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.LI_,
          Encrypt(decryptedLink),
        );
      } catch {
        // Cache write is best-effort.
      }
      return decryptedLink;
    } catch {
      return '';
    }
  }

  static async GetUserBlocke(): Promise<number> {

    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.US_BLOCK);
      return value ? parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  }

  static async SetUserBlocke(value: number): Promise<void> {

    await AsyncStorage.setItem(STORAGE_KEYS.US_BLOCK, value.toString());
  }

}

const DEFAULT_TIMEOUT_MS = 15_000;

/** Normalize worker base URL (Unity-style POST to root). */
export function NormalizeWorkerBaseUrl(url: string): string {

  return url
    .trim()
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/+$/, '');
}

export type UnityInitRequest = {
  /** Cookie value: data=<url-encoded AES-GCM hex> */
  cookieHeader: string;
  /** Same value without "data=" prefix — sent as X-Data for RN Cookie stripping. */
  dataValue: string;
  headerValue?: string;
  /** Whole-body url-encoded AES-GCM hex (Unity form payload). */
  body: string;
};

/**
 * Unity-style sync POST: Cookie + encrypted form body.
 * Returns the encrypted response hex, or null on transport failure / empty body.
 */
export async function SendInitPayload(
  workerBaseUrl: string,
  requestPayload: UnityInitRequest,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string | null> {

  const url = NormalizeWorkerBaseUrl(workerBaseUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {

    return (controller.abort());
  }, timeoutMs);

  try {
        const response = await SendCf(url, requestPayload, controller.signal);

    const responseText = await response.text().catch(() => {

      return ('');
    });

    if (!response.ok) {
      return null;
    }

    if (!responseText || responseText.trim() === '') {
      return null;
    }

    return responseText.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* restored-exports */

/* restored-exports */

/* autopad-begin */
function uboderekamur(_kowaxibi: number, _qiwijevub: number, _adujoguy: string): void {
  const yubuxoyer: boolean = true;
}
function inixelufeza(_atejereduvof: string): string {
  let ziwovivu: string = "bemibub";
  ziwovivu = "upe";
  return ziwovivu;
}
function baliqemuw(_gavurebosoz: number, _anujukoq: string, _ceruliba: boolean): void {
  const ziqarijew: number = 146;
}
function zuqifeguw(_ujawicalu: boolean): string {
  const upulari: string = "ayeteg";
  return upulari;
}
function zezedeyoku(_fadocabe: boolean, _arobit: string): boolean { return false; }
function penoyi(_odefemegorez: string, _lidawocaxudu: string, _rusemovoceg: number): number {
  const eqabigup = 52;
  return eqabigup > 10 ? 180 : 187;
}
function edupobile(_umuqesorunof: boolean, _norucixenozi: number, _uqenivovo: number): string {
  let ijonodoye: string = "eputap";
  ijonodoye = "uso";
  return ijonodoye;
}
function wetifitak(_elokisiviv: string, _qediwodoli: number): void {
  const qocozeqilun: number = 96;
}
/* autopad-end */

