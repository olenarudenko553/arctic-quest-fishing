/* @app-slot:service */
import { getInitialNotification, getMessaging, onMessage, onNotificationOpenedApp, onTokenRefresh } from '@react-native-firebase/messaging';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import { Linking, NativeModules, Platform } from 'react-native';
import { InitializationRuntime, WaitForPushToken, OnMessageRecieved, TryOpenPushExternalUrl } from './initializationShared';

/** Ensure the foreground FCM handler is registered exactly once. */
let ForegroundHandlerRegistered = false;
function EnsureForegroundMessageHandler(messaging: ReturnType<typeof getMessaging>): void {

  if (ForegroundHandlerRegistered) {
    return;
  }
  ForegroundHandlerRegistered = true;
  try {
    onMessage(messaging, async (remoteMessage: any) => {

      await OnMessageRecieved(remoteMessage);
    });
  } catch (error) {

    ForegroundHandlerRegistered = false;
      }
}

export async function GetAdvertisingId(): Promise<string> {

  try {
    if (Platform.OS !== 'android') {
      return '';
    }
    const { Oqerujik } = NativeModules;

    if (!Oqerujik) {
            return '';
    }
    const adId: string = await Oqerujik.ponixosip();
    return adId || '';
  } catch (error) {

        return '';
  }
}

export async function PushStep(): Promise<void> {

  try {
    const messaging = getMessaging();

    EnsureForegroundMessageHandler(messaging);

    onTokenRefresh(messaging, async (token: string) => {

            InitializationRuntime.pushToken = token;
    });

    const token = await WaitForPushToken(10);

    if (token) {
      InitializationRuntime.pushToken = token;
    }
  } catch (error) {

      }
}

export async function ReferrerStep(): Promise<void> {

  try {
    return new Promise((resolve) => {

      let resolved = false;
      try {
        PlayInstallReferrer.getInstallReferrerInfo((info, error) => {

          if (resolved) {
            return;
          }

          const isSuccess = !error && info && info.installReferrer;

          if (isSuccess) {
            InitializationRuntime.installRef = info.installReferrer;
                      } else {
            InitializationRuntime.installRef = '';
            if (error) {
                          } else {
                          }
          }
          resolved = true;
          resolve();
        });
      } catch (error) {

        if (!resolved) {

                    InitializationRuntime.installRef = '';
          resolved = true;
          resolve();
        }
      }
    });
  } catch (error) {

        InitializationRuntime.installRef = '';
  }
}

/** Cold-start / Linking deeplink only вЂ” FB/IG/gclid naming is resolved upstream (S2S API). */
function ProcessDirectDeepLink(url: string): void {

  if (!url || url.trim() === '') return;
  if (InitializationRuntime.firstParameterReceived) return;
  InitializationRuntime.firstParameterReceived = true;
  InitializationRuntime.FinlOneLink = url.trim();
  InitializationRuntime.FinlNaming = '';
}

export async function DataCollectStep(): Promise<void> {

  try {
    // No client-side gclid / facebook / instagram gates вЂ” installRef goes raw in cookie; API does S2S.
    InitializationRuntime.firstParameterReceived = false;
    InitializationRuntime.oranicWaiting = false;
    InitializationRuntime.orgnicWaitResolve = null;
    InitializationRuntime.DeviceId = '';
    InitializationRuntime.FinlOneLink = '';
    InitializationRuntime.FinlNaming = '';

    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      ProcessDirectDeepLink(initialUrl);
    }

    const linkingSubscription = Linking.addEventListener('url', (event: { url: string }) => {

      if (event?.url) {
        ProcessDirectDeepLink(event.url);
      }
    });

    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = 100;
    while (
      !InitializationRuntime.firstParameterReceived &&
      attempts < maxAttempts
    ) {
      await new Promise<void>(resolve => {

        return (setTimeout(() => {

        return (resolve());
      }, checkInterval));
      });
      attempts++;
    }

    linkingSubscription.remove();
    InitializationRuntime.FinlNaming = '';
  } catch (error) {

    InitializationRuntime.DeviceId = '';
    InitializationRuntime.FinlOneLink = '';
    InitializationRuntime.FinlNaming = '';
  }
}

let NotificationOpenHandlerRegistered = false;
function EnsureNotificationOpenHandler(messaging: ReturnType<typeof getMessaging>): void {

  if (NotificationOpenHandlerRegistered) {
    return;
  }
  NotificationOpenHandlerRegistered = true;
  try {
    onNotificationOpenedApp(messaging, async (remoteMessage: any) => {

      const pushUrl =
        typeof remoteMessage?.data?.url === 'string'
          ? remoteMessage.data.url
          : '';
      if (pushUrl) {
        await TryOpenPushExternalUrl(pushUrl);
      }
    });
  } catch (error) {

    NotificationOpenHandlerRegistered = false;
  }
}

/** Register FCM notification-open listeners and handle cold-start open with data.url. */
export async function SetupPushOpenHandlers(): Promise<void> {

  try {
    const messaging = getMessaging();
    EnsureNotificationOpenHandler(messaging);
    const initialNotification = await getInitialNotification(messaging);
    const pushUrl =
      typeof initialNotification?.data?.url === 'string'
        ? initialNotification.data.url
        : '';
    if (pushUrl) {
      await TryOpenPushExternalUrl(pushUrl);
    }
  } catch (error) {

  }
}

export interface ParallelCollectResult {
  advertisingId: string;
}

/** Wave1 referrer в†’ Wave2 push+GAID+deeplink. */
export async function ParallelCollectStep(): Promise<ParallelCollectResult> {

  await ReferrerStep();

  const [, advertisingId] = await Promise.all([
    PushStep(),
    GetAdvertisingId(),
    DataCollectStep(),
  ]);

  InitializationRuntime.adId = advertisingId ?? '';

  return {
    advertisingId: InitializationRuntime.adId,
  };
}

/* autopad-begin */
function laveqacu(): void {}
function coyerof(_bacuwerow: string, _xojiga: string, _omaceleq: number): number { return 243; }
function jebupojedutu(_kefuko: string): number {
  return 156;
}
function topeyifa(_yuziqecuz: boolean): boolean {
  const xafuxito = 64;
  return xafuxito > 96 ? false : true;
}
function juxocob(_faletik: string): number {
  const unovewowi = 66;
  return unovewowi > 85 ? 72 : 112;
}
function topeju(): void {}
function owayocikizug(): number {
  const anutasezid: number = 139;
  return anutasezid;
}
function adivubig(): number {
  const qavozipazob: number = 175;
  return qavozipazob;
}
function qupoyosupege(_egisena: string, _akejukutey: number): string {
  const fuxuxinoduso: string = "bere";
  return fuxuxinoduso;
}
function igujacapitir(): boolean {
  let ocojiq: boolean = true;
  ocojiq = true;
  return ocojiq;
}
function ififiw(_ebemefunepa: string): boolean {
  const iqikerurevi: boolean = true;
  return iqikerurevi;
}
function epoyufuyime(_jeqedovutipu: number, _wibotabenase: number, _ixujemi: boolean): void {
  const inoyeliq = 53;
  if (inoyeliq > 21) return;
}
function qunujutodob(_padeyuyu: string, _onumuze: boolean): number {
  let jijicu: number = 124;
  jijicu = 250;
  return jijicu;
}
function peqiqumipu(_oyuresipip: number): void {}
function remunodicuk(_mikirus: boolean, _axijotovi: string, _afixasi: number): boolean {
  let tapebidiki: boolean = false;
  tapebidiki = false;
  return tapebidiki;
}
/* autopad-end */

