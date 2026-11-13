/**
 * Rotate the "surface" of the CF intake wire format so two projects never look
 * alike to a passive observer. Randomizes:
 *
 *   - cookieName   (e.g. gugux → fuxar)      name of the Cookie key
 *   - headerName   (e.g. X-Loje → X-Nozi)    custom request header
 *   - path         (e.g. /zonu → /kemur)     POST path
 *   - bodyField    (e.g. d → q)              single body form field name
 *   - extraQuery   ({rel,wo,per}...)         random nonsense query keys/values
 *   - dummyBodyKeys                          decoy CBOR-string keys in body
 *
 * fieldCodes / responseCodes stay identical across projects — they live inside
 * AES ciphertext so there is nothing to see. Rotating them would also force a
 * strict lockstep update between worker + native with no observable gain.
 *
 * Persistence: resolved values are written back into meta.cfProtocol so the
 * next autosetup is deterministic. To re-roll, set meta.cfProtocol = "auto"
 * (or remove the key).
 *
 * Patches:
 *   - cloudflare-worker/index.js   (CF_PROTOCOL block between the markers)
 *   - android/.../Desujiwelopozi.kt (COOKIE_NAME/HEADER_NAME/PATH + extraQuery
 *                                    + dummyBodyKeys)
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const VOWELS = "aeiou";
const CONSONANTS = "bcdfgjklmnpqrstvwxyz";

function pickByte() {
  return crypto.randomBytes(1)[0];
}

function pickFrom(alphabet) {
  return alphabet[pickByte() % alphabet.length];
}

/** Pronounceable consonant/vowel word, length chars long. */
function randomWord(length) {
  let out = "";
  const startConsonant = (pickByte() & 1) === 0;
  for (let i = 0; i < length; i++) {
    const useConsonant = startConsonant ? i % 2 === 0 : i % 2 === 1;
    out += pickFrom(useConsonant ? CONSONANTS : VOWELS);
  }
  return out;
}

function randomInRange(min, max) {
  return min + (pickByte() % (max - min + 1));
}

function generateCfProtocol() {
  const cookieName = randomWord(randomInRange(4, 6));
  const headerCore = randomWord(randomInRange(3, 5));
  const headerName = "X-" + headerCore.charAt(0).toUpperCase() + headerCore.slice(1);
  const pathValue = "/" + randomWord(randomInRange(3, 6));
  const bodyField = randomWord(1);

  const extraQueryCount = randomInRange(2, 4);
  const extraQuery = {};
  const seenKeys = new Set();
  while (Object.keys(extraQuery).length < extraQueryCount) {
    const key = randomWord(randomInRange(2, 4));
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    extraQuery[key] = randomWord(randomInRange(3, 6));
  }

  const dummyCount = randomInRange(2, 3);
  const dummies = new Set();
  while (dummies.size < dummyCount) {
    dummies.add(randomWord(randomInRange(6, 8)));
  }

  return {
    cookieName,
    headerName,
    path: pathValue,
    bodyField,
    extraQuery,
    dummyBodyKeys: [...dummies],
  };
}

function isAuto(value) {
  if (value == null) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "" || v === "auto" || v === "detect";
  }
  return false;
}

function validateCfProtocol(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.cookieName !== "string" || !value.cookieName) return false;
  if (typeof value.headerName !== "string" || !value.headerName) return false;
  if (typeof value.path !== "string" || !value.path.startsWith("/")) return false;
  if (typeof value.bodyField !== "string" || !value.bodyField) return false;
  if (!value.extraQuery || typeof value.extraQuery !== "object") return false;
  if (!Array.isArray(value.dummyBodyKeys)) return false;
  return true;
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

// ---------- Worker patch ----------

const WORKER_PROTOCOL_RE =
  /\/\*\s*cf-protocol-begin\s*\*\/[\s\S]*?\/\*\s*cf-protocol-end\s*\*\//;

function readCurrentWorkerProtocol(workerSrc) {
  const m = WORKER_PROTOCOL_RE.exec(workerSrc);
  if (!m) return null;
  const inside = m[0];
  const jsonStart = inside.indexOf("{");
  const jsonEnd = inside.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  const jsonText = inside.slice(jsonStart, jsonEnd + 1);
  try {
    // The literal is a JS object with "key": "value" style — valid JSON.
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function buildWorkerProtocol(current, surface) {
  // Keep the fixed internal mapping (fieldCodes, fieldRoutes, responseCodes,
  // extraResponsePads) and only overwrite the surface keys.
  return {
    transport: current.transport || "xhr",
    path: surface.path,
    cookieName: surface.cookieName,
    headerName: surface.headerName,
    bodyField: surface.bodyField,
    encoding: current.encoding || "b64url",
    plaintext: current.plaintext || "cbor",
    fieldCodes: current.fieldCodes,
    fieldRoutes: current.fieldRoutes,
    dummyBodyKeys: surface.dummyBodyKeys,
    extraQuery: surface.extraQuery,
    responseCodes: current.responseCodes,
    extraResponsePads: current.extraResponsePads,
  };
}

function patchWorker(workerSrc, protoObj) {
  const replacement =
    "/* cf-protocol-begin */\n" +
    "const CF_PROTOCOL = " +
    JSON.stringify(protoObj, null, 2) +
    ";\n" +
    "/* cf-protocol-end */";
  return workerSrc.replace(WORKER_PROTOCOL_RE, replacement);
}

// ---------- Native patch (Desujiwelopozi.kt) ----------

function kotlinStringLiteral(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function kotlinLinkedMapOfStringPairs(obj) {
  const entries = Object.entries(obj)
    .map(([k, v]) => `${kotlinStringLiteral(k)} to ${kotlinStringLiteral(v)}`)
    .join(", ");
  return `linkedMapOf(${entries})`;
}

function kotlinArrayOfStrings(arr) {
  const entries = arr.map(kotlinStringLiteral).join(", ");
  return `arrayOf(${entries})`;
}

function patchNative(nativeSrc, surface) {
  let next = nativeSrc;

  next = next.replace(
    /(private\s+const\s+val\s+COOKIE_NAME\s*=\s*)"[^"]*"/,
    `$1${kotlinStringLiteral(surface.cookieName)}`
  );
  next = next.replace(
    /(private\s+const\s+val\s+HEADER_NAME\s*=\s*)"[^"]*"/,
    `$1${kotlinStringLiteral(surface.headerName)}`
  );
  next = next.replace(
    /(private\s+const\s+val\s+PATH\s*=\s*)"[^"]*"/,
    `$1${kotlinStringLiteral(surface.path)}`
  );
  next = next.replace(
    /(private\s+const\s+val\s+BODY_FIELD\s*=\s*)"[^"]*"/,
    `$1${kotlinStringLiteral(surface.bodyField)}`
  );

  // dummyBodyKeys — one-line arrayOf(...)
  next = next.replace(
    /(private\s+val\s+dummyBodyKeys\s*=\s*)arrayOf\([^)]*\)/,
    `$1${kotlinArrayOfStrings(surface.dummyBodyKeys)}`
  );

  // extraQuery — one-line linkedMapOf(...)
  next = next.replace(
    /(private\s+val\s+extraQuery\s*=\s*)linkedMapOf\([^)]*\)/,
    `$1${kotlinLinkedMapOfStringPairs(surface.extraQuery)}`
  );

  return next;
}

// ---------- Entry ----------

async function rotateCfProtocol({ projectRoot, meta, generateIfMissing = true }) {
  const workerPath = path.join(projectRoot, "cloudflare-worker", "index.js");
  const nativeResult = await findAndroidSourceByContent(projectRoot, /cf-intake:v2/);

  const workerSrc = await safeRead(workerPath);
  if (workerSrc == null) {
    return { ok: false, details: `cloudflare-worker/index.js не найден (${workerPath})` };
  }
  if (!nativeResult) {
    return { ok: false, details: "CF-protocol native module не найден (cf-intake:v2 marker)" };
  }
  const nativePath = nativeResult.filePath;
  const nativeSrc = nativeResult.src;

  const current = readCurrentWorkerProtocol(workerSrc);
  if (!current) {
    return { ok: false, details: "cf-protocol блок в worker не разобран (markers cf-protocol-begin/end)" };
  }

  let surface;
  let regenerated = false;
  if (isAuto(meta.cfProtocol)) {
    if (!generateIfMissing) {
      return { ok: true, details: "cfProtocol=auto — пропуск (generateIfMissing=false)" };
    }
    surface = generateCfProtocol();
    regenerated = true;
  } else if (validateCfProtocol(meta.cfProtocol)) {
    surface = meta.cfProtocol;
  } else {
    return {
      ok: false,
      details: "meta.cfProtocol задан, но неполон — укажите cookieName/headerName/path/bodyField/extraQuery/dummyBodyKeys или 'auto'",
    };
  }

  const newProto = buildWorkerProtocol(current, surface);
  const patchedWorker = patchWorker(workerSrc, newProto);
  const patchedNative = patchNative(nativeSrc, surface);

  const writes = [];
  if (patchedWorker !== workerSrc) {
    await fs.writeFile(workerPath, patchedWorker, "utf8");
    writes.push(path.relative(projectRoot, workerPath).replace(/\\/g, "/"));
  }
  if (patchedNative !== nativeSrc) {
    await fs.writeFile(nativePath, patchedNative, "utf8");
    writes.push(path.relative(projectRoot, nativePath).replace(/\\/g, "/"));
  }

  return {
    ok: true,
    regenerated,
    surface,
    details:
      `cookie=${surface.cookieName}, header=${surface.headerName}, path=${surface.path}, bodyField=${surface.bodyField}\n` +
      `extraQuery=${JSON.stringify(surface.extraQuery)}\n` +
      `dummyBodyKeys=${JSON.stringify(surface.dummyBodyKeys)}\n` +
      `files: ${writes.join(", ") || "(unchanged)"}`,
  };
}

module.exports = {
  rotateCfProtocol,
  generateCfProtocol,
  validateCfProtocol,
  isAuto,
};
