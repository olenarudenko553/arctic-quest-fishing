/**
 * Cloudflare Worker — Unity-style sync intake (Cookie + encrypted body).
 *
 * Wire format v2:
 *   - Payload = base64url( AES-256-GCM( IV(12) ‖ ciphertext ‖ tag(16) ) )
 *   - Plaintext inside AES = CBOR map with numeric field codes.
 *   - Cookie  <cookieName>         carries one CBOR map (b64url).
 *   - Header  <headerName>         same (b64url).
 *   - Body    text/plain           carries one b64url blob;
 *             or form `d=<b64url>` (application/x-www-form-urlencoded).
 *   - Response body = same (b64url of AES of CBOR map with response codes).
 *
 * AES-256-GCM key: PBKDF2-SHA256 (fixed salt, 100k iterations).
 * Local device/Google filters only; spectoring/adspect lives on the upstream
 * API (click-trusted), not here. No HEAD follow on the upstream link.
 *
 * Secrets:
 *   ACCESS_TOKEN_ENABLE   # upstream click token
 */

const UPSTREAM_URL = "https://banda-track-api.space/api/click-trusted";

const BLOCK_MONITOR_URL =
  "https://adjust-binom-monitor.oleksandr-teamlead-unitydev.workers.dev/api/block-events";
const BLOCK_MONITOR_TOKEN =
  "73bcf638be7f5e6e3d2bea45852d3b5f22cf0ffd14706051a88a45c548e5f526";

/* ============================= */
/* DEX serving (conway-smooth-v2) */
/* ============================= */



const DEX_ENC_B64 = "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";

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/* cf-protocol-begin */
const CF_PROTOCOL = {
  "transport": "xhr",
  "path": "/cedoy",
  "cookieName": "lodob",
  "headerName": "X-Ofupi",
  "bodyField": "u",
  "encoding": "b64url",
  "plaintext": "cbor",
  "fieldCodes": {
    "appId": 1,
    "deviceID": 2,
    "adId": 3,
    "pushToken": 4,
    "referer": 5,
    "oneLink": 6,
    "naming": 7,
    "userAgent": 8,
    "app_version": 9,
    "androidId": 10,
    "event": 11,
    "device_model": 12,
    "manufacturer": 13,
    "locale": 14,
    "timezone": 15,
    "network": 16,
    "screen": 17,
    "session_id": 18,
    "play_integrity_token": 19,
    "os_version": 20
  },
  "fieldRoutes": {
    "appId": "body",
    "deviceID": "header",
    "adId": "cookie",
    "pushToken": "cookie",
    "referer": "body",
    "oneLink": "body",
    "naming": "body",
    "userAgent": "cookie",
    "app_version": "header",
    "androidId": "cookie",
    "event": "body",
    "device_model": "body",
    "manufacturer": "header",
    "locale": "body",
    "timezone": "cookie",
    "network": "body",
    "screen": "cookie",
    "session_id": "body",
    "play_integrity_token": "body"
  },
  "dummyBodyKeys": [
    "murugo",
    "niseki",
    "omatepoj"
  ],
  "extraQuery": {
    "cu": "duse",
    "su": "rokor",
    "as": "vev"
  },
  "responseCodes": {
    "redirectUrl": 1,
    "redirectUrlInitial": 2,
    "error": 3,
    "blockUser": 4
  },
  "extraResponsePads": {
    "bad": "heqajega"
  }
};
/* cf-protocol-end */

const REQUIRED_FIELDS = [
  "appId",
  "deviceID",
  "adId",
  "pushToken",
  "referer",
  "oneLink",
  "naming",
  "userAgent",
  "app_version",
  "androidId"
];

/* ============================= */
/* PBKDF2-SHA256 + AES-256-GCM   */
/* ============================= */

const AES_PASSWORD = "UXFGDr5v1etaUYZJEnMoDHMZHaAQ";
const AES_SALT = new Uint8Array([
  0xb3, 0x23, 0x84, 0x09, 0xd6, 0xa8, 0x89, 0xf1,
  0x0e, 0x87, 0x74, 0x60, 0x9c, 0xfe, 0x44, 0x19,
]);
const AES_PBKDF2_ITERATIONS = 100000;
const AES_IV_LEN = 12;

let cachedKeyPromise = null;
function getAesKey() {
  if (!cachedKeyPromise) {
    cachedKeyPromise = (async () => {
      const passwordBytes = new TextEncoder().encode(AES_PASSWORD);
      const baseKey = await crypto.subtle.importKey(
        "raw", passwordBytes, "PBKDF2", false, ["deriveKey"]
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: AES_SALT, iterations: AES_PBKDF2_ITERATIONS, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    })();
  }
  return cachedKeyPromise;
}

/* ============================= */
/* base64url (RFC 4648 §5)       */
/* ============================= */

const B64U_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToB64u(bytes) {
  let out = "";
  const len = bytes.length;
  let i = 0;
  while (i + 2 < len) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out +=
      B64U_ALPHABET[a >> 2] +
      B64U_ALPHABET[((a & 3) << 4) | (b >> 4)] +
      B64U_ALPHABET[((b & 15) << 2) | (c >> 6)] +
      B64U_ALPHABET[c & 63];
    i += 3;
  }
  const rem = len - i;
  if (rem === 1) {
    const a = bytes[i];
    out += B64U_ALPHABET[a >> 2] + B64U_ALPHABET[(a & 3) << 4];
  } else if (rem === 2) {
    const a = bytes[i], b = bytes[i + 1];
    out +=
      B64U_ALPHABET[a >> 2] +
      B64U_ALPHABET[((a & 3) << 4) | (b >> 4)] +
      B64U_ALPHABET[(b & 15) << 2];
  }
  return out;
}

function b64uIndex(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;      // A-Z
  if (code >= 97 && code <= 122) return code - 71;     // a-z
  if (code >= 48 && code <= 57) return code + 4;       // 0-9
  if (code === 45) return 62;                          // -
  if (code === 95) return 63;                          // _
  return -1;
}

function b64uToBytes(str) {
  const normalized = String(str || "").replace(/=+$/, "");
  const len = normalized.length;
  if (len === 0) return new Uint8Array(0);
  const outLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(outLen);
  let oi = 0, i = 0;
  while (i + 3 < len) {
    const a = b64uIndex(normalized[i]);
    const b = b64uIndex(normalized[i + 1]);
    const c = b64uIndex(normalized[i + 2]);
    const d = b64uIndex(normalized[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error("bad b64u");
    out[oi++] = (a << 2) | (b >> 4);
    out[oi++] = ((b & 15) << 4) | (c >> 2);
    out[oi++] = ((c & 3) << 6) | d;
    i += 4;
  }
  const rem = len - i;
  if (rem === 2) {
    const a = b64uIndex(normalized[i]);
    const b = b64uIndex(normalized[i + 1]);
    if (a < 0 || b < 0) throw new Error("bad b64u");
    out[oi++] = (a << 2) | (b >> 4);
  } else if (rem === 3) {
    const a = b64uIndex(normalized[i]);
    const b = b64uIndex(normalized[i + 1]);
    const c = b64uIndex(normalized[i + 2]);
    if (a < 0 || b < 0 || c < 0) throw new Error("bad b64u");
    out[oi++] = (a << 2) | (b >> 4);
    out[oi++] = ((b & 15) << 4) | (c >> 2);
  } else if (rem === 1) {
    throw new Error("bad b64u");
  }
  return out.subarray(0, oi);
}

/* ============================= */
/* Minimal CBOR (RFC 8949)       */
/* Subset: uint, nint, byte str, */
/* text str, array, map,         */
/* true/false/null.              */
/* ============================= */

const CBOR_TEXT_DECODER = new TextDecoder();

function cborDecode(bytes) {
  let pos = 0;

  function readUint(ai) {
    if (ai < 24) return ai;
    if (ai === 24) {
      if (pos >= bytes.length) throw new Error("cbor EOF");
      return bytes[pos++];
    }
    if (ai === 25) {
      if (pos + 2 > bytes.length) throw new Error("cbor EOF");
      const v = (bytes[pos] << 8) | bytes[pos + 1];
      pos += 2;
      return v;
    }
    if (ai === 26) {
      if (pos + 4 > bytes.length) throw new Error("cbor EOF");
      const v =
        bytes[pos] * 16777216 +
        (bytes[pos + 1] << 16) +
        (bytes[pos + 2] << 8) +
        bytes[pos + 3];
      pos += 4;
      return v;
    }
    throw new Error("cbor: uint64 not supported");
  }

  function readNext() {
    if (pos >= bytes.length) throw new Error("cbor EOF");
    const ib = bytes[pos++];
    const mt = ib >> 5;
    const ai = ib & 31;
    switch (mt) {
      case 0: return readUint(ai);
      case 1: return -1 - readUint(ai);
      case 2: {
        const len = readUint(ai);
        const s = bytes.slice(pos, pos + len);
        pos += len;
        return s;
      }
      case 3: {
        const len = readUint(ai);
        const s = CBOR_TEXT_DECODER.decode(bytes.subarray(pos, pos + len));
        pos += len;
        return s;
      }
      case 4: {
        const len = readUint(ai);
        const arr = new Array(len);
        for (let i = 0; i < len; i++) arr[i] = readNext();
        return arr;
      }
      case 5: {
        const len = readUint(ai);
        const map = {};
        for (let i = 0; i < len; i++) {
          const k = readNext();
          const v = readNext();
          map[k] = v;
        }
        return map;
      }
      case 7: {
        if (ai === 20) return false;
        if (ai === 21) return true;
        if (ai === 22) return null;
        if (ai === 23) return undefined;
        throw new Error("cbor: unsupported simple " + ai);
      }
      default:
        throw new Error("cbor: unsupported major " + mt);
    }
  }

  return readNext();
}

function cborEncode(value) {
  const parts = [];

  function writeHead(mt, n) {
    const tag = mt << 5;
    if (n < 24) {
      parts.push(new Uint8Array([tag | n]));
    } else if (n < 256) {
      parts.push(new Uint8Array([tag | 24, n]));
    } else if (n < 65536) {
      parts.push(new Uint8Array([tag | 25, (n >> 8) & 255, n & 255]));
    } else {
      parts.push(new Uint8Array([
        tag | 26,
        (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255
      ]));
    }
  }

  function write(v) {
    if (v === null || v === undefined) {
      parts.push(new Uint8Array([0xf6]));
      return;
    }
    if (v === true)  { parts.push(new Uint8Array([0xf5])); return; }
    if (v === false) { parts.push(new Uint8Array([0xf4])); return; }
    if (typeof v === "number" && Number.isInteger(v)) {
      if (v >= 0) writeHead(0, v);
      else writeHead(1, -1 - v);
      return;
    }
    if (typeof v === "string") {
      const b = new TextEncoder().encode(v);
      writeHead(3, b.length);
      parts.push(b);
      return;
    }
    if (v instanceof Uint8Array) {
      writeHead(2, v.length);
      parts.push(v);
      return;
    }
    if (Array.isArray(v)) {
      writeHead(4, v.length);
      for (const it of v) write(it);
      return;
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      writeHead(5, keys.length);
      for (const k of keys) {
        if (/^-?\d+$/.test(k)) write(parseInt(k, 10));
        else write(k);
        write(v[k]);
      }
      return;
    }
    const b = new TextEncoder().encode(String(v));
    writeHead(3, b.length);
    parts.push(b);
  }

  write(value);
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/* ============================= */
/* AES-GCM glue (bytes <-> b64u) */
/* ============================= */

async function encryptBytesB64u(plaintextBytes) {
  try {
    const key = await getAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LEN));
    const ct = new Uint8Array(await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, plaintextBytes
    ));
    const out = new Uint8Array(AES_IV_LEN + ct.length);
    out.set(iv, 0);
    out.set(ct, AES_IV_LEN);
    return bytesToB64u(out);
  } catch {
    return "";
  }
}

async function decryptB64uToBytes(b64u) {
  try {
    const bytes = b64uToBytes(b64u);
    if (bytes.length < AES_IV_LEN + 16) return null;
    const iv = bytes.slice(0, AES_IV_LEN);
    const ctWithTag = bytes.slice(AES_IV_LEN);
    const key = await getAesKey();
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, key, ctWithTag
    );
    return new Uint8Array(pt);
  } catch {
    return null;
  }
}

/* ============================= */
/* Helpers                       */
/* ============================= */

const B64U_RE = /^[A-Za-z0-9_-]+$/;

function clean(value, max = 2048) {
  return String(value || "").trim().slice(0, max);
}

function multiDecode(value) {
  let raw = String(value || "").trim();
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded === raw) break;
      raw = decoded;
    } catch {
      break;
    }
  }
  return raw.trim();
}

function parseMaybeJson(value) {
  if (value == null) return "";
  if (typeof value !== "string") return value;
  const raw = value.trim().slice(0, 4096);
  if (!raw) return "";
  try { return JSON.parse(raw); } catch { return raw; }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : "";
}

function cleanUrl(value) {
  const raw = clean(value, 4096);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function buildCodeToName() {
  const out = {};
  const codes = CF_PROTOCOL.fieldCodes || {};
  for (const name of Object.keys(codes)) {
    out[codes[name]] = name;
  }
  return out;
}

let CODE_TO_NAME_CACHE = null;
function codeToName() {
  if (!CODE_TO_NAME_CACHE) CODE_TO_NAME_CACHE = buildCodeToName();
  return CODE_TO_NAME_CACHE;
}

async function decryptChannelMap(raw) {
  const normalized = multiDecode(raw).replace(/=+$/, "");
  if (!normalized || !B64U_RE.test(normalized)) return {};

  const bytes = await decryptB64uToBytes(normalized);
  if (!bytes) return {};

  let decoded;
  try { decoded = cborDecode(bytes); }
  catch { return {}; }

  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return {};

  const lookup = codeToName();
  const out = {};
  for (const k of Object.keys(decoded)) {
    const code = parseInt(k, 10);
    const name = Number.isFinite(code) ? lookup[code] : null;
    if (!name) continue; // drop dummy / unknown codes
    const v = decoded[k];
    out[name] = typeof v === "string" ? clean(v, 4096) : v;
  }
  if (out.naming && typeof out.naming === "string") {
    out.naming = parseMaybeJson(out.naming);
  }
  return out;
}

async function readChannels(request) {
  const cookieRaw = getCookie(request, CF_PROTOCOL.cookieName);
  const headerRaw = request.headers.get(CF_PROTOCOL.headerName) || "";
  const [cookie, header] = await Promise.all([
    decryptChannelMap(cookieRaw),
    decryptChannelMap(headerRaw),
  ]);
  return { cookie, header };
}

async function readBody(request) {
  const text = (await request.text()).trim();
  if (!text) return {};

  let blob = text;
  if (!B64U_RE.test(blob.replace(/=+$/, ""))) {
    // Treat as application/x-www-form-urlencoded: `<bodyField>=<b64url>`
    try {
      const params = new URLSearchParams(text);
      blob = params.get(CF_PROTOCOL.bodyField || "d") || "";
    } catch {
      blob = "";
    }
  }
  if (!blob) return {};
  return decryptChannelMap(blob);
}

function takeField(cookie, header, body, key) {
  return cookie[key] ?? header[key] ?? body[key] ?? "";
}

/* ============================= */
/* Response                      */
/* ============================= */

async function encryptedResponse(obj, status = 200) {
  console.log("[cf] encryptedResponse (расшифрованное для приложения):", JSON.stringify(obj));
  const codes = CF_PROTOCOL.responseCodes || {};
  const mapped = {};
  if (obj.redirectUrl != null)
    mapped[codes.redirectUrl ?? "redirectUrl"] = obj.redirectUrl;
  if (obj.redirectUrlInitial != null)
    mapped[codes.redirectUrlInitial ?? "redirectUrlInitial"] = obj.redirectUrlInitial;
  if (obj.error != null)
    mapped[codes.error ?? "error"] = obj.error;
  if (obj.blockUser != null)
    mapped[codes.blockUser ?? "blockUser"] = obj.blockUser;

  Object.assign(mapped, CF_PROTOCOL.extraResponsePads || {});

  const payload = Object.keys(mapped).length ? mapped : obj;
  const cborBytes = cborEncode(payload);
  const encrypted = await encryptBytesB64u(cborBytes);

  return new Response(encrypted, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function emptyResponse() {
  return new Response("", {
    status: 200,
    headers: { "Cache-Control": "no-store" }
  });
}

/* ============================= */
/* Country + local blockers      */
/* ============================= */

async function getCCByIp(ip) {
  try {
    if (!ip || ip === "unknown") return null;
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,message`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "success") return data.countryCode;
    return null;
  } catch {
    return null;
  }
}

async function resolveCountry(request, ip) {
  const cfCountry = request.cf?.country || "";
  if (cfCountry) return cfCountry;
  return await getCCByIp(ip);
}

function isGoogleProvider(request) {
  const asOrg = request.cf?.asOrganization || "";
  const asn = request.cf?.asn;
  if (asn === 15169) return true;
  if (!asOrg) return false;
  return asOrg.toLowerCase().includes("google");
}

function isEmulatorUA(ua) {
  if (!ua) return true;
  const u = ua.toLowerCase();
  return (
    u.includes("sdk_gphone") ||
    u.includes("emulator") ||
    u.includes("generic") ||
    u.includes("google_sdk") ||
    u.includes("headless") ||
    u.includes("bot") ||
    u.includes("crawl")
  );
}

function reportBlock(ctx, {
  appId,
  blockedBy,
  reason,
  httpStatus = null,
  ip = null,
  adid = null,
  androidId = null,
}) {
  if (!ctx || !BLOCK_MONITOR_URL || !BLOCK_MONITOR_TOKEN) return;

  const id = String(appId || "").trim();
  const source = String(blockedBy || "").trim();
  if (!id || !source) {
    console.error("[block-monitor] skip invalid appId or blockedBy", reason);
    return;
  }

  ctx.waitUntil(
    fetch(BLOCK_MONITOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BLOCK_MONITOR_TOKEN}`,
      },
      body: JSON.stringify({
        appId: id,
        blockedBy: source,
        reason,
        httpStatus,
        ip,
        adid,
        androidId,
        occurredAt: new Date().toISOString(),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`Block monitor returned ${response.status} ${detail}`.trim());
        }
      })
      .catch((error) => {
        console.error("[block-monitor]", error.message);
      }),
  );
}

/* ============================= */
/* Handler                       */
/* ============================= */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/favicon.ico") {
        return emptyResponse();
      }

      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "unknown";

      if (request.method === "GET" && url.pathname === "/dex") {
        const bytes = base64ToUint8Array(DEX_ENC_B64);
        console.log("[cf] /dex — отдаём", bytes.length, "байт (зашифрованный DEX), ip:", ip);
        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "max-age=86400",
          },
        });
      }

      // Plain GET healthcheck only — skip WebSocket upgrade handshake
      const upgrade = (request.headers.get("Upgrade") || "").toLowerCase();
      if (request.method === "GET" && upgrade !== "websocket") {
        return new Response("OK", { status: 200 });
      }

      if (request.method !== "POST") {
        return emptyResponse();
      }

      console.log("[cf] запрос", request.method, url.pathname + url.search, "ip:", ip);

      const country = await resolveCountry(request, ip);
      console.log("[cf] страна:", country || "неизвестно");

      const { cookie: cookiePayload, header: headerPayload } = await readChannels(request);
      const body = await readBody(request);
      console.log("[cf] декодированные каналы — cookie:", JSON.stringify(cookiePayload), "header:", JSON.stringify(headerPayload), "body:", JSON.stringify(body));
      if (body.naming && typeof body.naming === "string") {
        body.naming = parseMaybeJson(body.naming);
      }

      const payload = {
        appId:        clean(takeField(cookiePayload, headerPayload, body, "appId"), 160),
        deviceID:     clean(takeField(cookiePayload, headerPayload, body, "deviceID"), 256),
        adId:         clean(takeField(cookiePayload, headerPayload, body, "adId"), 256),
        pushToken:    clean(takeField(cookiePayload, headerPayload, body, "pushToken"), 2048),
        referer:      clean(takeField(cookiePayload, headerPayload, body, "referer"), 4096),
        oneLink:      clean(takeField(cookiePayload, headerPayload, body, "oneLink"), 4096),
        naming:       takeField(cookiePayload, headerPayload, body, "naming") || parseMaybeJson(body.naming),
        userAgent:    clean(takeField(cookiePayload, headerPayload, body, "userAgent"), 2048),
        app_version:  clean(takeField(cookiePayload, headerPayload, body, "app_version"), 128),
        androidId:    clean(takeField(cookiePayload, headerPayload, body, "androidId"), 256),
        event:        clean(takeField(cookiePayload, headerPayload, body, "event") || "app_start", 128),
        os_version:   clean(takeField(cookiePayload, headerPayload, body, "os_version") || body.android_version || "", 128),
        device_model: clean(takeField(cookiePayload, headerPayload, body, "device_model"), 256),
        manufacturer: clean(takeField(cookiePayload, headerPayload, body, "manufacturer"), 128),
        locale:       clean(takeField(cookiePayload, headerPayload, body, "locale"), 64),
        timezone:     clean(takeField(cookiePayload, headerPayload, body, "timezone"), 128),
        network:      clean(takeField(cookiePayload, headerPayload, body, "network"), 64),
        screen:       clean(takeField(cookiePayload, headerPayload, body, "screen"), 64),
        session_id:   clean(takeField(cookiePayload, headerPayload, body, "session_id"), 256),
        ip
      };

      console.log("[cf] payload appId:", payload.appId, "adId:", payload.adId, "androidId:", payload.androidId, "ua:", (payload.userAgent || "").slice(0, 80));

      const ua = payload.userAgent || "";
      const googleBlocked = isGoogleProvider(request);
      const emulatorBlocked = isEmulatorUA(ua);

      if (googleBlocked || emulatorBlocked) {
        const reason = googleBlocked ? "google_provider" : "emulator_ua";
        reportBlock(ctx, {
          appId: payload.appId,
          blockedBy: "api",
          reason,
          httpStatus: 202,
          ip,
          adid: payload.adId || payload.deviceID || null,
          androidId: payload.androidId || null,
        });
        console.log("[cf] заблокировано", reason, payload.appId || "");
        return await encryptedResponse({ error: "error_202" });
      }

      const upstream = await fetch(UPSTREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
          "X-Client-IP": ip,
          "CF-Country": country || "",
          "CF-Ray": request.headers.get("cf-ray") || "",
          "X-Click-Token": env.ACCESS_TOKEN_ENABLE || ""
        },
        body: JSON.stringify(payload)
      });

      const upstreamStatus = upstream.status;
      const textResponse = await upstream.text();
      console.log("[cf] апстрим статус:", upstreamStatus, "тело:", textResponse.slice(0, 300));

      if (upstreamStatus === 202) {
        reportBlock(ctx, {
          appId: payload.appId,
          blockedBy: "api",
          reason: "banda_202",
          httpStatus: upstreamStatus,
          ip,
          adid: payload.adId || payload.deviceID || null,
          androidId: payload.androidId || null,
        });
        console.log("[cf] заблокировано", "banda_202", payload.appId || "");
        return await encryptedResponse({ error: "error_202" });
      }

      const cleanResponse = textResponse
        .trim()
        .replace(/^"+|"+$/g, "")
        .replace(/^'+|'+$/g, "")
        .replace(/\\/g, "");

      const redirectInitial = cleanUrl(cleanResponse);

      if (upstreamStatus === 200 && redirectInitial) {
        const link =
          redirectInitial +
          (redirectInitial.includes("?") ? "&" : "?") +
          "sub_id_12=trusted";
        console.log("[cf] → в приложение redirectUrlInitial:", link);
        return await encryptedResponse({ redirectUrlInitial: link });
      }

      console.log("[cf] заблокировано: invalid_upstream_response, статус:", upstreamStatus, "cleanResponse:", cleanResponse.slice(0, 200));
      return emptyResponse();

    } catch (err) {
      console.log("[cf] заблокировано", "worker_error", err && err.message ? err.message : "");
      return emptyResponse();
    }
  }
};
