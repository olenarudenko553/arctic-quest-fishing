/**
 * Encrypt/re-encrypt the DEX payload stored in cloudflare-worker/index.js.
 *
 * Wire format for the served bytes: IV(12) || ciphertext || GCM-tag(16),
 * stored in the worker as DEX_ENC_B64 (standard base64).
 *
 * First run (worker still has plain DEX_B64): reads raw DEX, encrypts it.
 * Subsequent runs (worker has DEX_ENC_B64): decrypts with oldPassword/oldSalt,
 * re-encrypts with newPassword/newSalt.
 */

const crypto = require("node:crypto");

const PBKDF2_ITERATIONS = 100_000;
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, PBKDF2_ITERATIONS, 32, "sha256");
}

function encryptBytes(plain, password, salt) {
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

function decryptBytes(wire, password, salt) {
  if (wire.length < IV_LEN + TAG_LEN) throw new Error("DEX_ENC_B64 payload too short");
  const key = deriveKey(password, salt);
  const iv = wire.subarray(0, IV_LEN);
  const ct = wire.subarray(IV_LEN, wire.length - TAG_LEN);
  const tag = wire.subarray(wire.length - TAG_LEN);
  const dec = crypto.createDecipheriv("aes-256-gcm", key, iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(ct), dec.final()]);
}

// --- Worker patching ---

const DEX_B64_RE = /const\s+DEX_B64\s*=\s*"([A-Za-z0-9+/=]*)"/;
const DEX_ENC_RE = /const\s+DEX_ENC_B64\s*=\s*"([A-Za-z0-9+/=]*)"/;
const DEX_SHA256_LINE_RE = /^const\s+DEX_SHA256\s*=\s*"[^"]*";\n?/m;

/**
 * Returns raw DEX bytes and whether the worker was using the plain (unencrypted) form.
 */
function readWorkerDex(workerSrc, oldPassword, oldSalt) {
  const plainMatch = DEX_B64_RE.exec(workerSrc);
  if (plainMatch) {
    return { plaintext: Buffer.from(plainMatch[1], "base64"), wasPlain: true };
  }
  const encMatch = DEX_ENC_RE.exec(workerSrc);
  if (!encMatch) return null;
  const wire = Buffer.from(encMatch[1], "base64");
  const plaintext = decryptBytes(wire, oldPassword, oldSalt);
  return { plaintext, wasPlain: false };
}

/**
 * Patch the worker source to store DEX_ENC_B64. Removes DEX_SHA256 and DEX_B64
 * on the initial conversion; replaces DEX_ENC_B64 on subsequent rotations.
 */
function patchWorkerDex(workerSrc, encB64) {
  let next = workerSrc;

  if (DEX_B64_RE.test(next)) {
    // Initial conversion: remove DEX_SHA256 line, replace DEX_B64 with DEX_ENC_B64
    next = next.replace(DEX_SHA256_LINE_RE, "");
    next = next.replace(DEX_B64_RE, `const DEX_ENC_B64 = "${encB64}"`);
    next = next.replace("base64ToUint8Array(DEX_B64)", "base64ToUint8Array(DEX_ENC_B64)");
  } else {
    next = next.replace(DEX_ENC_RE, `const DEX_ENC_B64 = "${encB64}"`);
  }

  return next;
}

/**
 * Re-encrypt the DEX in the worker.
 * Pass the same password/salt for both old and new on the initial run.
 */
function reencryptDexInWorker(workerSrc, { oldPassword, oldSalt, newPassword, newSalt }) {
  const result = readWorkerDex(workerSrc, oldPassword, oldSalt);
  if (!result) return { ok: false, details: "DEX_B64 / DEX_ENC_B64 не найден в воркере" };

  const encBuf = encryptBytes(result.plaintext, newPassword, newSalt);
  const encB64 = encBuf.toString("base64");
  const patched = patchWorkerDex(workerSrc, encB64);
  return { ok: true, patched, wasPlain: result.wasPlain };
}

module.exports = { reencryptDexInWorker, encryptBytes, decryptBytes, deriveKey };
