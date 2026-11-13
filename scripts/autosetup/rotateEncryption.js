/**
 * Rotate the AES-256-GCM key used by the Cloudflare intake path and update
 * every place that holds a copy of the password / salt / encrypted
 * Cloudflare URL (LINK_HEX). On each call a fresh random password and salt
 * are generated and written in lockstep:
 *
 *   - android/.../modules/Qelujowofahuhe.kt (PASSWORD + SALT consts — native AES-GCM)
 *   - cloudflare-worker/index.js            (AES_PASSWORD + AES_SALT)
 *   - android/.../modules/Rumokuroh.java    (LINK_HEX — only the encrypted URL)
 *
 * The current LINK_HEX is decrypted with the OLD key, re-encrypted with the
 * NEW key and written back to Rumokuroh.java. If PASSWORD/SALT consts ever
 * move into Rumokuroh.java as well, patchJavaPasswordAndSalt updates them
 * too; until then it's a no-op there.
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { reencryptDexInWorker } = require("./encryptDex");

const PBKDF2_ITERATIONS = 100000;
const IV_LEN = 12;
const TAG_LEN = 16;

const PASSWORD_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomPassword(length = 28) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return out;
}

function randomSalt(length = 16) {
  return crypto.randomBytes(length);
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, PBKDF2_ITERATIONS, 32, "sha256");
}

function encryptHex(plain, password, salt) {
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("hex").toUpperCase();
}

function decryptHex(hex, password, salt) {
  const buf = Buffer.from(hex, "hex");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("payload too short");
  const iv = buf.subarray(0, IV_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const key = deriveKey(password, salt);
  const dec = crypto.createDecipheriv("aes-256-gcm", key, iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(ct), dec.final()]).toString("utf8");
}

function kotlinSaltLiteral(salt) {
  const parts = [];
  for (const b of salt) {
    const h = b.toString(16).padStart(2, "0");
    parts.push(b >= 0x80 ? `0x${h}.toByte()` : `0x${h}`);
  }
  // Format: 8 bytes per line.
  const rows = [];
  for (let i = 0; i < parts.length; i += 8) rows.push(parts.slice(i, i + 8).join(", "));
  return rows.join(",\n            ");
}

function jsSaltLiteral(salt) {
  const parts = [];
  for (const b of salt) parts.push(`0x${b.toString(16).padStart(2, "0")}`);
  const rows = [];
  for (let i = 0; i < parts.length; i += 8) rows.push(parts.slice(i, i + 8).join(", "));
  return rows.join(",\n  ");
}

function javaSaltLiteral(salt) {
  const parts = [];
  for (const b of salt) {
    const h = b.toString(16).padStart(2, "0");
    parts.push(b >= 0x80 ? `(byte) 0x${h}` : `0x${h}`);
  }
  const rows = [];
  for (let i = 0; i < parts.length; i += 8) rows.push(parts.slice(i, i + 8).join(", "));
  return rows.join(",\n        ");
}

async function safeRead(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

async function findAndroidSource(rootPath, filename) {
  const base = path.join(rootPath, "android", "app", "src", "main", "java");
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const hit = await walk(full);
        if (hit) return hit;
      } else if (e.name === filename) {
        return full;
      }
    }
    return null;
  }
  return walk(base);
}

/** Walk the modules dir and return the path of the first file whose source matches pattern. */
async function findAndroidSourceByContent(rootPath, pattern) {
  const base = path.join(rootPath, "android", "app", "src", "main", "java");
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const hit = await walk(full);
        if (hit) return hit;
      } else if (/\.(kt|java)$/.test(e.name)) {
        try {
          const src = await fs.readFile(full, "utf8");
          if (pattern.test(src)) return { filePath: full, src };
        } catch {}
      }
    }
    return null;
  }
  return walk(base);
}

function readCurrentPassword(content, kind) {
  // Kotlin: `private const val PASSWORD = "..."`
  // Java:   `public static final String PASSWORD = "...";`
  // Worker: `const AES_PASSWORD = "..."`
  const patterns = [
    /private\s+const\s+val\s+PASSWORD\s*=\s*"([^"]*)"/,
    /public\s+static\s+final\s+String\s+PASSWORD\s*=\s*"([^"]*)"/,
    /const\s+AES_PASSWORD\s*=\s*"([^"]*)"/,
  ];
  for (const re of patterns) {
    const m = re.exec(content);
    if (m) return m[1];
  }
  return null;
}

function readCurrentSalt(content, kind) {
  // Kotlin: `private val SALT = byteArrayOf(0x.., 0x.., …)`
  // Java:   `public static final byte[] SALT = new byte[] { 0x.., 0x.., … };`
  // Worker: `const AES_SALT = new Uint8Array([0x.., …])`
  const re = kind === "kotlin"
    // Use greedy [\s\S]* + \n\s*\) so we match to the closing ) on its own
    // line, not the first ) inside a .toByte() call.
    ? /private\s+val\s+SALT\s*=\s*byteArrayOf\(([\s\S]*)\n\s*\)/
    : kind === "java"
      ? /public\s+static\s+final\s+byte\[\]\s+SALT\s*=\s*new\s+byte\[\]\s*\{([\s\S]*?)\}/
      : /const\s+AES_SALT\s*=\s*new\s+Uint8Array\(\[([\s\S]*?)\]\)/;
  const m = re.exec(content);
  if (!m) return null;
  const bytes = [];
  for (const num of m[1].matchAll(/0x([0-9a-fA-F]{1,2})/g)) {
    bytes.push(parseInt(num[1], 16));
  }
  return Buffer.from(bytes);
}

function readLinkHex(content) {
  const m = /(?:public\s+static\s+final\s+String|const\s+val)\s+LINK_HEX\s*=\s*"([^"]*)"/.exec(content);
  return m ? m[1] : null;
}

function patchKotlinPasswordAndSalt(content, newPassword, newSalt) {
  let next = content;
  next = next.replace(
    /(private\s+const\s+val\s+PASSWORD\s*=\s*)"[^"]*"/,
    `$1"${newPassword}"`
  );
  // Greedy [\s\S]* + \n\s*(\)) matches the closing ) on its own line,
  // not the first ) inside a .toByte() call.
  next = next.replace(
    /(private\s+val\s+SALT\s*=\s*byteArrayOf\()[\s\S]*\n\s*(\))/,
    `$1\n            ${kotlinSaltLiteral(newSalt)},\n        $2`
  );
  return next;
}

function patchJavaPasswordAndSalt(content, newPassword, newSalt) {
  let next = content;
  next = next.replace(
    /(public\s+static\s+final\s+String\s+PASSWORD\s*=\s*)"[^"]*"/,
    `$1"${newPassword}"`
  );
  next = next.replace(
    /(public\s+static\s+final\s+byte\[\]\s+SALT\s*=\s*new\s+byte\[\]\s*\{)[\s\S]*?(\};)/,
    `$1\n        ${javaSaltLiteral(newSalt)}\n    $2`
  );
  return next;
}

function patchJavaLinkHex(content, newHex) {
  return content.replace(
    /(public\s+static\s+final\s+String\s+LINK_HEX\s*=\s*)"[^"]*"/,
    `$1"${newHex}"`
  );
}

function patchKotlinLinkHex(content, newHex) {
  return content.replace(
    /(const\s+val\s+LINK_HEX\s*=\s*)"[^"]*"/,
    `$1"${newHex}"`
  );
}

function patchWorkerPasswordAndSalt(content, newPassword, newSalt) {
  let next = content;
  next = next.replace(
    /(const\s+AES_PASSWORD\s*=\s*)"[^"]*"/,
    `$1"${newPassword}"`
  );
  next = next.replace(
    /(const\s+AES_SALT\s*=\s*new\s+Uint8Array\(\[)[\s\S]*?(\]\))/,
    `$1\n  ${jsSaltLiteral(newSalt)},\n$2`
  );
  return next;
}

/** Patch PASSWORD and SALT in the DEX loader Kotlin module (companion object). */
function patchDexLoaderPasswordAndSalt(content, newPassword, newSalt) {
  let next = content;
  next = next.replace(
    /(private\s+const\s+val\s+DEX_PASSWORD\s*=\s*)"[^"]*"/,
    `$1"${newPassword}"`
  );
  next = next.replace(
    /(private\s+val\s+DEX_SALT\s*=\s*byteArrayOf\()[\s\S]*\n\s*(\))/,
    `$1\n            ${kotlinSaltLiteral(newSalt)},\n        $2`
  );
  return next;
}

async function rotateProjectEncryption(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  // Find files by content so they still work after renameModules renames them.
  const rumoResult = await findAndroidSourceByContent(projectRoot, /LINK_HEX\s*=\s*"/);
  const qeluResult = await findAndroidSourceByContent(projectRoot, /private\s+const\s+val\s+PASSWORD\s*=\s*"/);
  const dexResult  = await findAndroidSourceByContent(projectRoot, /private\s+const\s+val\s+DEX_SHA256\s*=\s*"/);
  const workerPath = path.join(projectRoot, "cloudflare-worker", "index.js");

  if (!rumoResult) return { ok: false, title: "LINK_HEX модуль не найден", details: "" };
  if (!qeluResult) return { ok: false, title: "AES-GCM PASSWORD модуль не найден", details: "" };
  const workerRaw = await safeRead(workerPath);
  if (workerRaw == null) return { ok: false, title: "cloudflare-worker/index.js не найден", details: workerPath };

  const rumokurohPath = rumoResult.filePath;
  const qelujoPath   = qeluResult.filePath;
  const rumoRaw = rumoResult.src;
  const qeluRaw = qeluResult.src;

  // Read OLD creds from any of the three — they must already be in sync.
  const oldPassword = readCurrentPassword(rumoRaw, "java")
    || readCurrentPassword(qeluRaw, "kotlin")
    || readCurrentPassword(workerRaw, "worker");
  const oldSaltFromKotlin = readCurrentSalt(qeluRaw, "kotlin");
  const oldSaltFromJava = readCurrentSalt(rumoRaw, "java");
  const oldSaltFromWorker = readCurrentSalt(workerRaw, "worker");
  const oldSalt = oldSaltFromKotlin || oldSaltFromJava || oldSaltFromWorker;

  if (!oldPassword || !oldSalt) {
    return {
      ok: false,
      title: "Не удалось прочитать текущие PASSWORD/SALT",
      details: `password=${oldPassword ? "ok" : "MISSING"}, salt=${oldSalt ? "ok" : "MISSING"}`,
    };
  }

  // Decrypt current CF URL.
  const oldLinkHex = readLinkHex(rumoRaw);
  if (!oldLinkHex) return { ok: false, title: "LINK_HEX не найден в модуле", details: "" };
  let plainUrl;
  try {
    plainUrl = decryptHex(oldLinkHex, oldPassword, oldSalt);
  } catch (err) {
    return { ok: false, title: "Не удалось расшифровать LINK_HEX старым ключом", details: String(err) };
  }

  // Generate new creds + re-encrypt URL.
  const newPassword = randomPassword(28);
  const newSalt = randomSalt(16);
  const newLinkHex = encryptHex(plainUrl, newPassword, newSalt);

  // Patch native modules and worker credentials.
  const patchedRumo = patchJavaLinkHex(patchJavaPasswordAndSalt(rumoRaw, newPassword, newSalt), newLinkHex);
  const patchedQelu = patchKotlinLinkHex(patchKotlinPasswordAndSalt(qeluRaw, newPassword, newSalt), newLinkHex);
  let patchedWorker = patchWorkerPasswordAndSalt(workerRaw, newPassword, newSalt);

  // Patch DEX loader module PASSWORD/SALT (if it exists and has DEX_PASSWORD/DEX_SALT consts).
  let patchedDex = dexResult ? dexResult.src : null;
  if (patchedDex) {
    patchedDex = patchDexLoaderPasswordAndSalt(patchedDex, newPassword, newSalt);
  }

  // Re-encrypt the DEX payload in the worker under the new key.
  const dexReenc = reencryptDexInWorker(patchedWorker, {
    oldPassword, oldSalt,
    newPassword, newSalt,
  });
  if (!dexReenc.ok) {
    return { ok: false, title: "DEX re-encryption failed", details: dexReenc.details };
  }
  patchedWorker = dexReenc.patched;

  const writes = [];
  if (patchedRumo !== rumoRaw) { await fs.writeFile(rumokurohPath, patchedRumo); writes.push(path.relative(projectRoot, rumokurohPath)); }
  if (patchedQelu !== qeluRaw) { await fs.writeFile(qelujoPath, patchedQelu); writes.push(path.relative(projectRoot, qelujoPath)); }
  if (patchedDex && dexResult && patchedDex !== dexResult.src) { await fs.writeFile(dexResult.filePath, patchedDex); writes.push(path.relative(projectRoot, dexResult.filePath)); }
  if (patchedWorker !== workerRaw) { await fs.writeFile(workerPath, patchedWorker); writes.push(path.relative(projectRoot, workerPath)); }

  return {
    ok: true,
    title: `AES-GCM ключ ротирован`,
    details:
      `password: ${oldPassword.slice(0, 4)}… → ${newPassword.slice(0, 4)}…\n` +
      `salt:     ${oldSalt.toString("hex").slice(0, 8)}… → ${newSalt.toString("hex").slice(0, 8)}…\n` +
      `LINK_HEX: ${oldLinkHex.slice(0, 12)}… → ${newLinkHex.slice(0, 12)}…\n` +
      `files:    ${writes.join(", ")}`,
  };
}

module.exports = {
  rotateProjectEncryption,
  // kept for compatibility with older callers; load-crypto-from-helper no longer applies.
  loadProjectCrypto: () => ({ ok: false, details: "legacy helper lookup — not used after AES-GCM migration" }),
  DEFAULT_HELPER_ROOT: null,
};
