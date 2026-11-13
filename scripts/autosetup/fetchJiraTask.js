const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { ensureDir, rmrf } = require("./fsUtils");

const PACKAGE_FIELD = "customfield_10074";
const ADJUST_TOKEN_FIELD = "customfield_10356";
const DEFAULT_BASE_URL = "https://bandadev.atlassian.net";
const DEFAULT_PROJECT = "ANDROID";

function trimStr(value) {
  if (value == null) return "";
  return String(value).trim();
}

function appNameFromSummary(summary) {
  const raw = trimStr(summary);
  if (!raw) return "";
  return raw.replace(/\s*\([^)]*\)\s*$/, "").trim() || raw;
}

function normalizeIssueKey(raw, projectKey = DEFAULT_PROJECT) {
  const value = trimStr(raw);
  if (!value) {
    throw new Error("meta.json: укажите jiraIssue (например 3358 или ANDROID-3358)");
  }
  if (/^[A-Z][A-Z0-9]+-\d+$/i.test(value)) {
    return value.toUpperCase();
  }
  if (/^\d+$/.test(value)) {
    return `${projectKey}-${value}`;
  }
  throw new Error(
    `meta.json: непонятный jiraIssue «${value}» (ожидается 3358 или ANDROID-3358)`
  );
}

function jiraAuthHeader(email, token) {
  const basic = Buffer.from(`${email}:${token}`, "utf8").toString("base64");
  return `Basic ${basic}`;
}

function resolveJiraConfig(meta) {
  const email = trimStr(meta.jiraEmail);
  const token = trimStr(meta.jiraToken || meta.jiraApiToken);
  const baseUrl = trimStr(meta.jiraBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const projectKey = trimStr(meta.jiraProject || DEFAULT_PROJECT).toUpperCase() || DEFAULT_PROJECT;
  const issueKey = normalizeIssueKey(meta.jiraIssue || meta.jiraTask, projectKey);

  if (!email) {
    throw new Error("meta.json: укажите jiraEmail (email Atlassian-аккаунта для API token)");
  }
  if (!token) {
    throw new Error("meta.json: укажите jiraToken (API token из Atlassian)");
  }
  if (!baseUrl) {
    throw new Error("meta.json: укажите jiraBaseUrl");
  }

  return { email, token, baseUrl, issueKey, projectKey };
}

async function jiraFetchJson(url, authHeader) {
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Jira API ${res.status} ${res.statusText}: ${url}` +
        (body ? `\n${body.slice(0, 400)}` : "")
    );
  }
  return res.json();
}

async function downloadAttachment(contentUrl, destPath, authHeader) {
  const res = await fetch(contentUrl, {
    headers: { Authorization: authHeader },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(
      `Не удалось скачать вложение (${res.status}): ${path.basename(destPath)}`
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, buf);
  return destPath;
}

function attachmentCreatedMs(att) {
  return Date.parse(att?.created || att?.updated || "") || 0;
}

/** google-services.json / google-services (2).json / google-services(3).json */
function isGoogleServicesFilename(name) {
  return /^google-services(?:\s*\(\d+\))?\.json$/i.test(name || "");
}

function pickAttachment(attachments, label, matcher) {
  const matched = (attachments || []).filter((a) => matcher(a.filename || ""));
  if (matched.length === 0) {
    throw new Error(`Jira: не найден attachment для «${label}»`);
  }
  matched.sort((a, b) => {
    const byDate = attachmentCreatedMs(b) - attachmentCreatedMs(a);
    if (byDate !== 0) return byDate;
    // fallback: higher (N) in "name (N).ext" wins
    const num = (n) => {
      const m = String(n || "").match(/\((\d+)\)\s*\.\w+$/);
      return m ? Number(m[1]) : 0;
    };
    return num(b.filename) - num(a.filename);
  });
  if (matched.length > 1) {
    const names = matched.map((a) => a.filename).join(", ");
    console.warn(
      `[warn] Jira: несколько файлов для «${label}», беру самый новый «${matched[0].filename}»: ${names}`
    );
  }
  return matched[0];
}

async function loadJiraIssue(meta) {
  const cfg = resolveJiraConfig(meta);
  const auth = jiraAuthHeader(cfg.email, cfg.token);
  const fields = [
    "summary",
    "attachment",
    PACKAGE_FIELD,
    ADJUST_TOKEN_FIELD,
  ].join(",");
  const issueUrl =
    `${cfg.baseUrl}/rest/api/3/issue/${encodeURIComponent(cfg.issueKey)}` +
    `?fields=${encodeURIComponent(fields)}`;

  console.log(`[autosetup] Jira: ${cfg.baseUrl} → ${cfg.issueKey}`);
  const issue = await jiraFetchJson(issueUrl, auth);
  return { cfg, auth, issue };
}

function extractJiraFields(issue, issueKey) {
  const f = issue.fields || {};
  const appName = appNameFromSummary(f.summary);
  const packageName = trimStr(f[PACKAGE_FIELD]);
  const adjustToken = trimStr(f[ADJUST_TOKEN_FIELD]);

  if (!appName) throw new Error(`Jira ${issueKey}: пустой summary`);
  if (!packageName) {
    throw new Error(`Jira ${issueKey}: пустое поле Package name (${PACKAGE_FIELD})`);
  }
  // Adjust optional in this template (no client Adjust SDK).
  if (!adjustToken) {
    console.warn(
      `[warn] Jira ${issueKey}: Adjust Integration Token пуст (${ADJUST_TOKEN_FIELD}) — пропуск`
    );
  }

  return { appName, packageName, adjustToken };
}

/**
 * Fetch appName / packageName / adjustToken from Jira and write into meta.
 */
async function syncMetaFromJira(meta, metaPath, { saveMeta }) {
  const { cfg, issue } = await loadJiraIssue(meta);
  const fields = extractJiraFields(issue, cfg.issueKey);
  meta.appName = fields.appName;
  meta.packageName = fields.packageName;
  if (fields.adjustToken) {
    meta.adjustToken = fields.adjustToken;
  } else {
    delete meta.adjustToken;
  }
  if (meta.newTaskData) delete meta.newTaskData;
  await saveMeta(metaPath, meta);
  console.log(`[autosetup] from Jira: appName=${meta.appName}`);
  console.log(`[autosetup] from Jira: packageName=${meta.packageName}`);
  if (meta.adjustToken) {
    console.log(`[autosetup] from Jira: adjustToken=${meta.adjustToken} (не пишется в клиент)`);
  }
  return { cfg, issue, fields };
}

/**
 * Download keystore / google-services / *_source.zip into a temp dir.
 * Icon PNG is intentionally ignored (manual step).
 */
async function downloadJiraAssets(meta) {
  const { cfg, auth, issue } = await loadJiraIssue(meta);
  const attachments = issue.fields?.attachment || [];

  const iconPng = attachments.find(
    (a) => /icon/i.test(a.filename || "") && /\.png$/i.test(a.filename || "")
  );
  if (iconPng) {
    console.log(
      `[autosetup] Jira icon PNG «${iconPng.filename}» — пропускаю (добавьте вручную)`
    );
  }

  const keystoreAtt = pickAttachment(
    attachments,
    "keystore tar.gz",
    (n) => /\.tar\.gz$/i.test(n)
  );
  const gsAtt = pickAttachment(
    attachments,
    "google-services.json",
    isGoogleServicesFilename
  );
  const sourceAtt = pickAttachment(
    attachments,
    "_source zip",
    (n) => /_source/i.test(n) && /\.zip$/i.test(n)
  );

  const cacheDir = path.join(
    os.tmpdir(),
    `autosetup-jira-${cfg.issueKey.replace(/[^\w.-]+/g, "_")}-${Date.now()}`
  );
  await ensureDir(cacheDir);

  const keystoreTar = path.join(cacheDir, keystoreAtt.filename);
  const googleServices = path.join(cacheDir, "google-services.json");
  const sourceZip = path.join(cacheDir, sourceAtt.filename);

  await downloadAttachment(keystoreAtt.content, keystoreTar, auth);
  await downloadAttachment(gsAtt.content, googleServices, auth);
  await downloadAttachment(sourceAtt.content, sourceZip, auth);

  console.log(`[autosetup] keystore: ${path.basename(keystoreTar)}`);
  console.log(`[autosetup] google-services: ${path.basename(googleServices)}`);
  console.log(`[autosetup] source: ${path.basename(sourceZip)}`);

  return {
    issueKey: cfg.issueKey,
    cacheDir,
    task: {
      dir: cacheDir,
      keystoreTar,
      googleServices,
      sourceZip,
      iconsZip: null,
    },
    async cleanup() {
      await rmrf(cacheDir);
    },
  };
}

function isJiraConfigured(meta) {
  return Boolean(
    trimStr(meta?.jiraToken || meta?.jiraApiToken) &&
      trimStr(meta?.jiraIssue || meta?.jiraTask)
  );
}

function jiraAdfToPlainText(node, acc = []) {
  if (node == null) return acc;
  if (typeof node === "string") {
    acc.push(node);
    return acc;
  }
  if (Array.isArray(node)) {
    for (const item of node) jiraAdfToPlainText(item, acc);
    return acc;
  }
  if (typeof node === "object") {
    if (typeof node.text === "string") acc.push(node.text);
    if (Array.isArray(node.content)) jiraAdfToPlainText(node.content, acc);
  }
  return acc;
}

/** Same blocklist as RN App Helper «Из Jira» for Cloudflare Worker URL. */
const JIRA_CLOUDFLARE_HOST_BLOCKLIST = new Set([
  "atlassian.net",
  "atlassian.com",
  "jira.com",
  "github.com",
  "githubusercontent.com",
  "gitlab.com",
  "google.com",
  "googleapis.com",
  "gstatic.com",
  "facebook.com",
  "fb.com",
  "apple.com",
  "microsoft.com",
  "localhost",
  "workers.dev",
]);

/**
 * Only accept hosts with a plausible public TLD.
 * Stops junk like `source.zip` / `hikjhfj.ujmumf` from encrypted/random comment text.
 */
const JIRA_CLOUDFLARE_ALLOWED_TLD = new Set([
  "xyz",
  "com",
  "net",
  "org",
  "info",
  "online",
  "site",
  "store",
  "app",
  "io",
  "cc",
  "top",
  "pro",
  "club",
  "space",
  "fun",
  "live",
  "link",
  "click",
  "work",
  "website",
  "tech",
  "cloud",
  "page",
  "me",
  "co",
  "tv",
  "ws",
  "biz",
  "shop",
  "blog",
  "dev",
  "art",
  "icu",
  "vip",
  "world",
  "today",
  "digital",
  "agency",
  "network",
  "systems",
  "solutions",
  "services",
  "company",
  "global",
  "media",
  "zone",
  "one",
  "life",
  "run",
  "host",
  "pw",
  "to",
  "in",
  "us",
  "uk",
  "ru",
  "ua",
  "pl",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "eu",
  "cn",
  "jp",
  "kr",
  "br",
  "au",
  "ca",
  "mx",
  "tr",
  "id",
  "sg",
  "hk",
  "tw",
  "vn",
  "ph",
  "my",
  "th",
  "ae",
  "sa",
  "il",
  "za",
  "ng",
  "ke",
  "eg",
  "ar",
  "cl",
  "pe",
  "co.uk",
]);

function isBlockedCloudflareHost(host) {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "");
  if (!h || !h.includes(".")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  const parts = h.split(".");
  const tld = parts[parts.length - 1];
  const dual = parts.length >= 2 ? `${parts[parts.length - 2]}.${tld}` : "";
  if (!JIRA_CLOUDFLARE_ALLOWED_TLD.has(tld) && !JIRA_CLOUDFLARE_ALLOWED_TLD.has(dual)) {
    return true;
  }
  for (const blocked of JIRA_CLOUDFLARE_HOST_BLOCKLIST) {
    if (h === blocked || h.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

/**
 * Finds hostnames like `cipherijfjd.xyz` / `https://cipherijfjd.xyz/` in plain text.
 * Returns unique hosts; prefers https:// matches, then *.xyz.
 */
function extractWorkerHostsFromText(text) {
  const raw = String(text || "");
  if (!raw.trim()) return [];
  const re =
    /(?:(https?):\/\/)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,68})(?:\/[^\s"'<>]*)?/gi;
  const found = [];
  const seen = new Set();
  let match;
  while ((match = re.exec(raw)) !== null) {
    const hasScheme = Boolean(match[1]);
    const host = String(match[2] || "")
      .toLowerCase()
      .replace(/\.$/, "")
      .replace(/^www\./, "");
    if (!host || isBlockedCloudflareHost(host) || seen.has(host)) continue;
    // skip email local@domain when '@' immediately precedes the host
    const atPos = match.index > 0 ? raw[match.index - 1] : "";
    if (atPos === "@") continue;
    seen.add(host);
    found.push({ host, hasScheme });
  }
  found.sort((a, b) => {
    if (a.hasScheme !== b.hasScheme) return a.hasScheme ? -1 : 1;
    const aXyz = a.host.endsWith(".xyz") ? 1 : 0;
    const bXyz = b.host.endsWith(".xyz") ? 1 : 0;
    if (aXyz !== bXyz) return bXyz - aXyz;
    return 0;
  });
  return found.map((item) => item.host);
}

function normalizeWorkerUrlFromHost(host) {
  const h = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  if (!h) return "";
  return `https://${h}/`;
}

/**
 * Comments of jiraIssue (newest first): domain like cipherijfjd.xyz → https://cipherijfjd.xyz/
 * Soft-fail: returns { ok: false } when domain missing / API error — never throws for "not found".
 */
async function fetchJiraCloudflareWorkerUrl(meta) {
  let cfg;
  try {
    cfg = resolveJiraConfig(meta);
  } catch (err) {
    return {
      ok: false,
      details: err instanceof Error ? err.message : String(err),
    };
  }

  const auth = jiraAuthHeader(cfg.email, cfg.token);
  const commentsUrl =
    `${cfg.baseUrl}/rest/api/3/issue/${encodeURIComponent(cfg.issueKey)}/comment` +
    `?maxResults=100`;

  let comments = [];
  try {
    const payload = await jiraFetchJson(commentsUrl, auth);
    comments = Array.isArray(payload?.comments) ? payload.comments : [];
  } catch (err) {
    return {
      ok: false,
      details: err instanceof Error ? err.message : String(err),
    };
  }

  const sorted = [...comments].sort((a, b) => {
    const ta = Date.parse(a?.created || "") || 0;
    const tb = Date.parse(b?.created || "") || 0;
    return tb - ta;
  });

  for (const comment of sorted) {
    const body = comment?.body;
    const bodyText =
      Array.isArray(body) || (body && typeof body === "object")
        ? jiraAdfToPlainText(body).join("\n")
        : String(body || "");
    const hosts = extractWorkerHostsFromText(bodyText);
    if (hosts.length > 0) {
      const host = hosts[0];
      const url = normalizeWorkerUrlFromHost(host);
      return {
        ok: true,
        url,
        host,
        issueKey: cfg.issueKey,
        details: `Найдено: ${host} → ${url}`,
      };
    }
  }

  return {
    ok: false,
    issueKey: cfg.issueKey,
    details: `В ${cfg.issueKey} нет ссылки вида cipherijfjd.xyz (просмотрено комментариев: ${comments.length}).`,
  };
}

module.exports = {
  syncMetaFromJira,
  downloadJiraAssets,
  fetchJiraCloudflareWorkerUrl,
  extractWorkerHostsFromText,
  normalizeWorkerUrlFromHost,
  isBlockedCloudflareHost,
  jiraAdfToPlainText,
  isJiraConfigured,
  resolveJiraConfig,
  appNameFromSummary,
  normalizeIssueKey,
  PACKAGE_FIELD,
  ADJUST_TOKEN_FIELD,
};
