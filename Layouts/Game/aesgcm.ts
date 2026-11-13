/* @app-slot:service */
import { NativeModules } from 'react-native';

const cipher = NativeModules.Wijagujo;
const guard = NativeModules.Qerepazef;

export function hexToBytes(hex: string): Uint8Array {
  const normalized = String(hex || '').trim();
  const out = new Uint8Array(Math.floor(normalized.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/** AES-256-GCM encrypt (UTF-8 string → hex of IV ‖ ciphertext ‖ tag). v1 compat. */
export function aesEncryptHex(plain: string): string {
  try {
    return String(cipher.pexuvimasire(String(plain ?? '')) ?? '');
  } catch {
    return '';
  }
}

/** AES-256-GCM decrypt (hex of IV ‖ ciphertext ‖ tag → UTF-8 string). v1 compat. */
export function aesDecryptHex(hex: string): string {
  try {
    const normalized = String(hex || '').trim();
    if (!normalized || normalized.length % 2 !== 0) return '';
    return String(cipher.luwehugozihi(normalized) ?? '');
  } catch {
    return '';
  }
}

/**
 * v2: AES-256-GCM encrypt raw bytes. Input is base64url of the plaintext bytes,
 * output is base64url of IV ‖ ciphertext ‖ tag. Used with CBOR plaintext.
 */
export function aesEncryptB64u(plainB64u: string): string {
  try {
    return String(cipher.gemefuxolaru(String(plainB64u ?? '')) ?? '');
  } catch {
    return '';
  }
}

/**
 * v2: AES-256-GCM decrypt. Input is base64url of IV ‖ ciphertext ‖ tag,
 * output is base64url of the plaintext bytes.
 */
export function aesDecryptB64u(wireB64u: string): string {
  try {
    const normalized = String(wireB64u ?? '').trim();
    if (!normalized) return '';
    return String(cipher.jopuwikemavo(normalized) ?? '');
  } catch {
    return '';
  }
}

/**
 * Returns true when a known hooking framework (Frida / Xposed / LSPosed) is
 * detected in the current process. Callers should degrade silently, not crash.
 */
export function isHooked(): boolean {
  try {
    return Boolean(guard?.palazuvoda?.() ?? false);
  } catch {
    return false;
  }
}

/* autopad-begin */
function wekeleq(_xosimufasaqi: string): string {
  const muburocegoga = 82;
  return muburocegoga > 70 ? "ejifej" : "yay";
}
function wavaquqa(_pimowepa: number, _mamayuro: number): number { return 75; }
function xusacil(_ayirikiyoze: number, _fudeparumawe: boolean): number {
  let qapugavuzeye: number = 44;
  qapugavuzeye = 235;
  return qapugavuzeye;
}
function rosopuqegano(_sakezif: string, _celiwoyidib: string): void {
  const efadizivi = 5;
  if (efadizivi > 76) return;
}
function focawuzef(_mevixisip: string, _ayerayof: string): string {
  let fofapif: string = "idewiqa";
  fofapif = "uxopu";
  return fofapif;
}
function jogitob(_kawifiyure: string): string {
  const xuvipazuxaba: string = "wucumol";
  return xuvipazuxaba;
}
function omozujumiluy(): number {
  return 104;
}
function qecekiwuba(_olamawe: string, _jawikoza: number): number {
  const ogojidaseta = 83;
  return ogojidaseta > 6 ? 225 : 51;
}
function koyoruxo(_mexetat: boolean, _boxeguf: boolean, _umilive: string): number {
  let ecelepezado: number = 125;
  ecelepezado = 19;
  return ecelepezado;
}
function xalijaborevu(_ikineqirec: string): boolean { return true; }
function ecufal(_umacilugajan: boolean, _wudijibok: number): string {
  const cegiteg = 12;
  return cegiteg > 1 ? "ufub" : "elugicok";
}
function royedubas(_dipikovo: string, _ecizaj: string, _roferidexud: string): boolean {
  const nofefulep: boolean = true;
  return nofefulep;
}
function bagale(): number {
  let uyogoju: number = 74;
  uyogoju = 255;
  return uyogoju;
}
/* autopad-end */

