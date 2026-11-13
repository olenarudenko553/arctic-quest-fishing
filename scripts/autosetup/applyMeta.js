const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { safeStat } = require("./fsUtils");

function replaceOne(source, regex, replacement) {
  return regex.test(source) ? source.replace(regex, replacement) : source;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeSingleQuotedTs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getFileMap(rootPath) {
  return {
    gradle: path.join(rootPath, "android", "app", "build.gradle"),
    manifest: path.join(rootPath, "android", "app", "src", "main", "AndroidManifest.xml"),
    appJson: path.join(rootPath, "app.json"),
    stringsXml: path.join(
      rootPath,
      "android",
      "app",
      "src",
      "main",
      "res",
      "values",
      "strings.xml"
    ),
    constantsDir: path.join(rootPath, "services", "constants"),
  };
}

async function detectFragmentFromConstants(rootPath) {
  const dir = path.join(rootPath, "services", "constants");
  if (!(await safeStat(dir))) return "";
  const entries = await fs.readdir(dir);
  for (const name of entries) {
    const m = name.match(/^const([a-zA-Z0-9]+)ntsVariable\.ts$/);
    if (m) return m[1];
  }
  return "";
}

async function applyAppName(rootPath, appName) {
  const files = getFileMap(rootPath);
  const updated = [];

  const appJsonRaw = await fs.readFile(files.appJson, "utf8");
  let appJsonNext = appJsonRaw;
  try {
    const parsed = JSON.parse(appJsonRaw);
    parsed.displayName = appName;
    appJsonNext = `${JSON.stringify(parsed, null, 2)}\n`;
  } catch {
    appJsonNext = replaceOne(
      appJsonRaw,
      /"displayName"\s*:\s*"[^"]*"/,
      `"displayName": "${String(appName).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    );
  }
  if (appJsonNext !== appJsonRaw) {
    await fs.writeFile(files.appJson, appJsonNext, "utf8");
    updated.push("app.json");
  }

  const stringsRaw = await fs.readFile(files.stringsXml, "utf8");
  const stringsNext = replaceOne(
    stringsRaw,
    /<string\s+name="app_name">[\s\S]*?<\/string>/,
    `<string name="app_name">${escapeXml(appName)}</string>`
  );
  if (stringsNext !== stringsRaw) {
    await fs.writeFile(files.stringsXml, stringsNext, "utf8");
    updated.push("strings.xml");
  }

  return { ok: updated.length > 0, details: updated.join(", ") || "без изменений" };
}

async function applyPackageName(rootPath, packageName) {
  const files = getFileMap(rootPath);
  const updated = [];

  const gradleRaw = await fs.readFile(files.gradle, "utf8");
  const gradleNext = replaceOne(
    gradleRaw,
    /applicationId\s+"[^"]+"/,
    `applicationId "${packageName}"`
  );
  if (gradleNext !== gradleRaw) {
    await fs.writeFile(files.gradle, gradleNext, "utf8");
    updated.push("applicationId");
  }

  if (await safeStat(files.manifest)) {
    const manifestRaw = await fs.readFile(files.manifest, "utf8");
    if (/android:taskAffinity=/.test(manifestRaw)) {
      const manifestNext = replaceOne(
        manifestRaw,
        /android:taskAffinity="[^"]+"/,
        `android:taskAffinity="${packageName}"`
      );
      if (manifestNext !== manifestRaw) {
        await fs.writeFile(files.manifest, manifestNext, "utf8");
        updated.push("taskAffinity");
      }
    }
  }

  return { ok: updated.length > 0, details: updated.join(", ") || "без изменений" };
}

async function applyVersionCode(rootPath, versionCode) {
  const files = getFileMap(rootPath);
  const raw = await fs.readFile(files.gradle, "utf8");
  const next = replaceOne(raw, /versionCode\s+\d+/, `versionCode ${versionCode}`);
  if (next === raw) return { ok: true, details: "без изменений" };
  await fs.writeFile(files.gradle, next, "utf8");
  return { ok: true, details: `versionCode ${versionCode}` };
}

async function applyVersionName(rootPath, versionName) {
  const files = getFileMap(rootPath);
  const raw = await fs.readFile(files.gradle, "utf8");
  const next = replaceOne(raw, /versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  if (next === raw) return { ok: true, details: "без изменений" };
  await fs.writeFile(files.gradle, next, "utf8");
  return { ok: true, details: `versionName ${versionName}` };
}

/**
 * Encrypt Cloudflare Worker URL and write into li{fragment}nk
 * (same as RN App Helper «Из Jira» + «Применить»).
 */
/** Read current PASSWORD / SALT. Java keeps only LINK_HEX on this project;
 *  the actual AES-GCM key lives in the Kotlin native module. Try both so the
 *  encrypt step keeps working wherever rotateEncryption placed the creds. */
function readKey(content) {
  const pwdRe = [
    /public\s+static\s+final\s+String\s+PASSWORD\s*=\s*"([^"]*)"/,
    /private\s+const\s+val\s+PASSWORD\s*=\s*"([^"]*)"/,
  ];
  const saltRe = [
    /public\s+static\s+final\s+byte\[\]\s+SALT\s*=\s*new\s+byte\[\]\s*\{([\s\S]*?)\}/,
    // Greedy + \n\s*\) anchors to the closing ) on its own line, skipping
    // the ) inside each .toByte() call.
    /private\s+val\s+SALT\s*=\s*byteArrayOf\(([\s\S]*)\n\s*\)/,
  ];
  let password = null;
  for (const re of pwdRe) { const m = re.exec(content); if (m) { password = m[1]; break; } }
  let saltBlock = null;
  for (const re of saltRe) { const m = re.exec(content); if (m) { saltBlock = m[1]; break; } }
  if (!password || !saltBlock) return null;
  const bytes = [];
  for (const m of saltBlock.matchAll(/0x([0-9a-fA-F]{1,2})/g)) bytes.push(parseInt(m[1], 16));
  return { password, salt: Buffer.from(bytes) };
}

async function findNativeFile(rootPath, filename) {
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

/** Walk android source tree and return {filePath, src} for the first file matching pattern. */
async function findNativeFileByContent(rootPath, pattern) {
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

function aesGcmEncryptHex(plain, password, salt) {
  const key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("hex").toUpperCase();
}

/**
 * Encrypt the given Cloudflare Worker URL with AES-GCM using the key stored
 * in Rumokuroh.java, then write the resulting hex into `LINK_HEX` in the
 * same Rumokuroh.java. JS reads LINK_HEX through NativeModules at runtime,
 * so the single source of truth for the URL lives in native.
 */
async function applyCloudflareWorkerLink(rootPath, url) {
  const plainUrl = String(url || "").trim();
  if (!plainUrl) return { ok: true, details: "url пустой — пропуск" };

  // Find by content — file may have been renamed by rename-modules.
  const rumoResult = await findNativeFileByContent(rootPath, /LINK_HEX\s*=\s*"/);
  if (!rumoResult) return { ok: false, details: "LINK_HEX модуль не найден" };

  // Key may live in the AES-GCM Kotlin module (also possibly renamed).
  const qeluResult = await findNativeFileByContent(rootPath, /private\s+const\s+val\s+PASSWORD\s*=\s*"/);

  let key = readKey(rumoResult.src);
  if (!key && qeluResult) key = readKey(qeluResult.src);
  if (!key) {
    return { ok: false, details: "PASSWORD/SALT не прочитаны (пропусти rotate)" };
  }

  const encrypted = aesGcmEncryptHex(plainUrl, key.password, key.salt);
  const linkPattern = /(public\s+static\s+final\s+String\s+LINK_HEX\s*=\s*)"[^"]*"/;
  if (!linkPattern.test(rumoResult.src)) return { ok: false, details: "LINK_HEX не найден в модуле" };
  const next = rumoResult.src.replace(linkPattern, `$1"${encrypted}"`);
  if (next !== rumoResult.src) await fs.writeFile(rumoResult.filePath, next, "utf8");

  return {
    ok: true,
    details: `LINK_HEX ← ${plainUrl} (AES-GCM, ${encrypted.length / 2} байт)`,
  };
}

/**
 * Patch MainActivity.kt so getMainComponentName() returns the name from
 * app.json (the React Native component registration name). The base template
 * keeps this as an empty string "" which causes Fabric to silently render
 * nothing (white screen, no JS errors).
 */
async function applyMainComponentName(rootPath) {
  const appJsonPath = path.join(rootPath, "app.json");
  let componentName;
  try {
    componentName = JSON.parse(await fs.readFile(appJsonPath, "utf8")).name;
  } catch {
    return { ok: false, details: "app.json не прочитан" };
  }
  if (!componentName) return { ok: true, details: "app.json.name пустой — пропуск" };

  const kt = await findNativeFile(rootPath, "MainActivity.kt");
  if (!kt) return { ok: false, details: "MainActivity.kt не найден" };
  const raw = await fs.readFile(kt, "utf8");
  const next = raw.replace(
    /(override\s+fun\s+getMainComponentName\(\)[^{]*\{[^}]*return\s*)"[^"]*"/,
    `$1"${componentName}"`
  );
  if (next === raw) return { ok: true, details: "без изменений" };
  await fs.writeFile(kt, next, "utf8");
  return { ok: true, details: `getMainComponentName → "${componentName}"` };
}

/**
 * Apply appName / packageName / versions from meta.json.
 * Cloudflare Worker URL from Jira comments is encrypted into li{fragment}nk.
 */
async function applyMetaFields(rootPath, meta, options = {}) {
  const results = [];
  if (meta.appName != null && meta.appName !== "") {
    results.push(["appName", await applyAppName(rootPath, meta.appName)]);
  }
  if (meta.packageName) {
    results.push(["packageName", await applyPackageName(rootPath, meta.packageName)]);
  }
  if (meta.versionCode != null && meta.versionCode !== "") {
    results.push(["versionCode", await applyVersionCode(rootPath, meta.versionCode)]);
  }
  if (meta.versionName) {
    results.push(["versionName", await applyVersionName(rootPath, meta.versionName)]);
  }
  results.push(["mainComponentName", await applyMainComponentName(rootPath)]);
  if (options.cloudflareWorkerUrl) {
    results.push([
      "cloudflareWorkerUrl",
      await applyCloudflareWorkerLink(rootPath, options.cloudflareWorkerUrl),
    ]);
  }
  return results;
}

module.exports = {
  applyMetaFields,
  applyAppName,
  applyPackageName,
  applyVersionCode,
  applyVersionName,
  applyCloudflareWorkerLink,
  detectFragmentFromConstants,
};
