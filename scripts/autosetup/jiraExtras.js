const { spawnSync } = require("node:child_process");
const { jiraAdfToPlainText, resolveJiraConfig } = require("./fetchJiraTask");
const { toolEnv } = require("./exeEnv");

const FB_HASH_FIELD = "customfield_10067";
const FB_CLASS_FIELD = "customfield_10069";
const GIT_URL_FIELD = "customfield_10056";
const DETAILS_FIELD = "customfield_10321";

function authHeader(cfg) {
  return `Basic ${Buffer.from(`${cfg.email}:${cfg.token}`, "utf8").toString("base64")}`;
}

function redactSecrets(text) {
  return String(text || "")
    .replace(/ghp_[A-Za-z0-9]+/g, "ghp_***")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_***")
    .replace(/x-access-token:[^@\s]+/gi, "x-access-token:***")
    .replace(/:\/\/[^/\s:@]+:[^@\s/]+@/g, "://***@");
}

async function jiraRequest(cfg, method, urlPath, body) {
  const url = `${cfg.baseUrl}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(cfg),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(
      `Jira API ${res.status} ${method} ${urlPath}: ${redactSecrets(raw).slice(0, 400)}`
    );
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

function fieldToText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    if (typeof value.value === "string") return value.value.trim();
    if (typeof value.url === "string") return value.url.trim();
    return jiraAdfToPlainText(value).join("\n").trim();
  }
  return String(value).trim();
}

function extractGitToken(text) {
  const source = String(text || "");
  const github =
    source.match(/\[\s*github\s*\]\s*:\s*([^\s\]\r\n]+)/i) ||
    source.match(/\[\s*github\s*\]\s+([^\s\]\r\n]+)/i);
  if (github?.[1]) return { platform: "github", token: github[1].trim() };
  const gitlab =
    source.match(/\[\s*gitlab\s*\]\s*:\s*([^\s\]\r\n]+)/i) ||
    source.match(/\[\s*gitlab\s*\]\s+([^\s\]\r\n]+)/i);
  if (gitlab?.[1]) return { platform: "gitlab", token: gitlab[1].trim() };
  return null;
}

function parseGithubOwnerRepo(gitUrl) {
  const raw = String(gitUrl || "").trim();
  const ssh = raw.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2].replace(/\.git$/i, "") };
  }
  let url = raw;
  if (/^[^/]+\/[^/]+$/.test(url)) url = `https://github.com/${url}`;
  try {
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const parsed = new URL(url);
    if (!/github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.replace(/^\/|\/$/g, "").replace(/\.git$/i, "").split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function loadIssueFields(meta, fieldIds) {
  const cfg = resolveJiraConfig(meta);
  const fields = fieldIds.filter(Boolean).join(",");
  const issue = await jiraRequest(
    cfg,
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(cfg.issueKey)}?fields=${encodeURIComponent(fields)}`
  );
  return { cfg, issue };
}

async function loadGitCredentials(meta) {
  const gitUrlField = String(meta.jiraGitUrlField || GIT_URL_FIELD).trim();
  const detailsField = String(meta.jiraDetailsField || DETAILS_FIELD).trim();
  const { cfg, issue } = await loadIssueFields(meta, [
    "description",
    "summary",
    detailsField,
    gitUrlField,
  ]);
  const description = fieldToText(issue?.fields?.description);
  const details = fieldToText(issue?.fields?.[detailsField]);
  const fromDescription = extractGitToken(description);
  const parsed = fromDescription?.token ? fromDescription : extractGitToken(details);
  const gitUrl = fieldToText(issue?.fields?.[gitUrlField]);
  return {
    cfg,
    issueKey: cfg.issueKey,
    token: parsed?.token || "",
    platform: parsed?.platform || (gitUrl.toLowerCase().includes("gitlab") ? "gitlab" : "github"),
    gitUrl,
    summary: fieldToText(issue?.fields?.summary),
  };
}

async function addIssueComment(meta, paragraph) {
  const cfg = resolveJiraConfig(meta);
  const text = String(paragraph || "").trim();
  if (!text) throw new Error("Пустой текст комментария Jira");
  await jiraRequest(cfg, "POST", `/rest/api/3/issue/${encodeURIComponent(cfg.issueKey)}/comment`, {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    },
  });
  return { issueKey: cfg.issueKey };
}

async function setFacebookFields(meta, keyHash, className) {
  const cfg = resolveJiraConfig(meta);
  const hashField = String(meta.jiraFbHashField || FB_HASH_FIELD).trim();
  const classField = String(meta.jiraFbClassField || FB_CLASS_FIELD).trim();
  await jiraRequest(cfg, "PUT", `/rest/api/3/issue/${encodeURIComponent(cfg.issueKey)}`, {
    fields: {
      [hashField]: keyHash,
      [classField]: className,
    },
  });
  return { issueKey: cfg.issueKey, hashField, classField };
}

function restoreGitHubDesktopCredentialHelper() {
  // `gh auth login --git-protocol https` sets a blank helper plus
  // `gh auth git-credential`, which hides Git Credential Manager.
  // GitHub Desktop then asks to sign in via the browser on Publish/Push.
  // gh API calls use ~/.config/gh and do not need this helper.
  for (const key of [
    "credential.https://github.com.helper",
    "credential.https://gist.github.com.helper",
  ]) {
    spawnSync("git", ["config", "--global", "--unset-all", key], {
      windowsHide: true,
      env: toolEnv(),
    });
  }
}

module.exports = {
  FB_HASH_FIELD,
  FB_CLASS_FIELD,
  GIT_URL_FIELD,
  DETAILS_FIELD,
  restoreGitHubDesktopCredentialHelper,
  redactSecrets,
  fieldToText,
  extractGitToken,
  parseGithubOwnerRepo,
  loadGitCredentials,
  addIssueComment,
  setFacebookFields,
};
