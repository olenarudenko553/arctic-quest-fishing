/* @app-slot:service */
import { NativeModules } from 'react-native';

/**
 * App-wide constants come from the native Rumokuroh module (see Rumokuroh.java
 * — `getConstants()`). The TS file deliberately keeps no string literals of
 * its own, so rotating the encrypted link or changing a storage key only
 * requires touching the Kotlin/Java side.
 */
const native = (NativeModules.Oqerujik && NativeModules.Oqerujik.getConstants
  ? NativeModules.Oqerujik.getConstants()
  : {}) as {
  finKey?: string;
  LAST_KEY?: string;
  link?: string;
  storageLi?: string;
  storageUsBlock?: string;
  storagePushMainAsked?: string;
};

export const finKey: string = native.finKey ?? '';
export const LAST_KEY: string = native.LAST_KEY ?? '';
export const link: string = native.link ?? '';

export const STORAGE_KEYS = {
  LI_: native.storageLi ?? '',
  US_BLOCK: native.storageUsBlock ?? '',
  PUSH_MAIN_ASKED: native.storagePushMainAsked ?? '',
} as const;

/* autopad-begin */
function emovoyu(_abofife: string, _asocini: string): boolean {
  return false;
}
function jaxodecu(_olurilileqit: number): string {
  let utuyuvayeyad: string = "viy";
  utuyuvayeyad = "iyiku";
  return utuyuvayeyad;
}
function ojiyojomemi(_cucexib: boolean, _ovuqepaf: number, _pusosojibey: boolean): void {
  const edecevuya: number = 140;
}
function evopuvegeq(_vajagopuj: number, _ocicok: number, _abofalas: number): number {
  const rinepudugi = 96;
  const ivugudusutaz: number = 32;
  return ivugudusutaz;
}
function mopuqigufa(_cibikupafut: number): void {}
/* autopad-end */

