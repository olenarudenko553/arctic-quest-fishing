/**
 * Sanity-check that Android native code is on the v2 intake wire format:
 *
 *   - BwCodec.kt present (base64url + CBOR helper object)
 *   - Qelujowofahuhe.kt has the v2 ReactMethods (gemefuxolaru / jopuwikemavo)
 *     alongside the legacy hex methods
 *   - Desujiwelopozi.kt carries the /* cf-intake:v2 * / marker and the
 *     fieldCodes / responseCodes maps
 *
 * Fails loudly if the native stays on v1 — JS side would otherwise produce
 * empty payloads at runtime.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

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

async function safeRead(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

async function checkNativeV2(rootPath) {
  const problems = [];

  const bwResult = await findAndroidSourceByContent(rootPath, /fun\s+bytesToB64u/);
  if (!bwResult) {
    problems.push("BwCodec (base64url+CBOR helper) не найден");
  } else {
    const { src } = bwResult;
    if (!/fun\s+bytesToB64u|fun\s+b64uToBytes/.test(src)) {
      problems.push("BwCodec: нет base64url хелперов (bytesToB64u/b64uToBytes)");
    }
    if (!/fun\s+cborEncodeMap|fun\s+cborDecode/.test(src)) {
      problems.push("BwCodec: нет CBOR хелперов (cborEncodeMap/cborDecode)");
    }
  }

  const qeluResult = await findAndroidSourceByContent(rootPath, /fun\s+gemefuxolaru/);
  if (!qeluResult) {
    problems.push("AES-GCM native module не найден (gemefuxolaru/jopuwikemavo v2 методы)");
  } else {
    const { src } = qeluResult;
    if (!/fun\s+gemefuxolaru\s*\(/.test(src)) {
      problems.push("AES-GCM module: @ReactMethod gemefuxolaru отсутствует (v2 b64url encrypt)");
    }
    if (!/fun\s+jopuwikemavo\s*\(/.test(src)) {
      problems.push("AES-GCM module: @ReactMethod jopuwikemavo отсутствует (v2 b64url decrypt)");
    }
    // Legacy hex methods are still used by GetLink → keep them.
    if (!/fun\s+pexuvimasire\s*\(/.test(src)) {
      problems.push("AES-GCM module: legacy fun pexuvimasire исчез — ломает UtilService.GetLink");
    }
    if (!/fun\s+luwehugozihi\s*\(/.test(src)) {
      problems.push("AES-GCM module: legacy fun luwehugozihi исчез — ломает UtilService.GetLink");
    }
  }

  const desuResult = await findAndroidSourceByContent(rootPath, /cf-intake:v2/);
  if (!desuResult) {
    problems.push("CF-protocol native module не найден (cf-intake:v2 marker)");
  } else {
    const { src } = desuResult;
    if (!/val\s+fieldCodes\s*=/.test(src)) {
      problems.push("CF-protocol module: fieldCodes блок отсутствует (v2 CBOR mapping)");
    }
    if (!/val\s+responseCodes\s*=/.test(src)) {
      problems.push("CF-protocol module: responseCodes блок отсутствует (v2 ответ)");
    }
  }

  // Also peek at the TS side — it must call the v2 methods.
  const aesGcmTs = path.join(rootPath, "Layouts", "Game", "aesgcm.ts");
  const aesSrc = await safeRead(aesGcmTs);
  if (aesSrc) {
    if (!/aesEncryptB64u/.test(aesSrc)) {
      problems.push("Layouts/Game/aesgcm.ts: нет aesEncryptB64u (v2 обёртка)");
    }
    if (!/aesDecryptB64u/.test(aesSrc)) {
      problems.push("Layouts/Game/aesgcm.ts: нет aesDecryptB64u (v2 обёртка)");
    }
    if (!/gemefuxolaru|jopuwikemavo/.test(aesSrc)) {
      problems.push("Layouts/Game/aesgcm.ts: не вызывает gemefuxolaru/jopuwikemavo");
    }
  } else {
    problems.push("Layouts/Game/aesgcm.ts не прочитан");
  }

  const workerPath = path.join(rootPath, "cloudflare-worker", "index.js");
  const workerSrc = await safeRead(workerPath);
  if (workerSrc) {
    if (!/base64url|b64url|bytesToB64u|b64uToBytes/.test(workerSrc)) {
      problems.push("cloudflare-worker/index.js: нет base64url хелперов (worker всё ещё hex?)");
    }
    if (!/cborEncode|cborDecode/.test(workerSrc)) {
      problems.push("cloudflare-worker/index.js: нет CBOR encode/decode");
    }
  } else {
    problems.push("cloudflare-worker/index.js не прочитан");
  }

  // Hook detection (optional but expected in security-hardened builds).
  const hookResult = await findAndroidSourceByContent(rootPath, /checkFridaFiles|checkFridaPort/);
  if (!hookResult) {
    problems.push("HookGuard (Frida/Xposed detection) не найден");
  }

  // StringFog AES: buildSrc impl and runtime copy.
  const fogBuildSrc = path.join(rootPath, "android", "buildSrc", "src", "main", "java",
    "com", "kFjQzLm", "fog", "StringFogAesImpl.java");
  const fogRuntime = path.join(rootPath, "android", "app", "src", "main", "java",
    "com", "kFjQzLm", "fog", "StringFogAesImpl.java");
  const fogBuildSrcSrc = await safeRead(fogBuildSrc);
  const fogRuntimeSrc = await safeRead(fogRuntime);
  if (!fogBuildSrcSrc) {
    problems.push("android/buildSrc/…/StringFogAesImpl.java не найден (AES StringFog)");
  }
  if (!fogRuntimeSrc) {
    problems.push("android/app/…/StringFogAesImpl.java не найден (runtime AES decrypt)");
  }
  if (fogBuildSrcSrc && !/AES/.test(fogBuildSrcSrc)) {
    problems.push("StringFogAesImpl.java (buildSrc): нет AES cipher — файл, возможно, XOR-версия");
  }

  return {
    ok: problems.length === 0,
    problems,
    checked: {
      bwCodec: Boolean(bwResult),
      qelu: Boolean(qeluResult),
      desu: Boolean(desuResult),
      aesgcmTs: Boolean(aesSrc),
      worker: Boolean(workerSrc),
      hookGuard: Boolean(hookResult),
      fogAes: Boolean(fogBuildSrcSrc && fogRuntimeSrc),
    },
  };
}

module.exports = { checkNativeV2 };
