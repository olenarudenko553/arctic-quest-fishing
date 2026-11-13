const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  loadGitCredentials,
  parseGithubOwnerRepo,
  redactSecrets,
  restoreGitHubDesktopCredentialHelper,
} = require("./jiraExtras");
const { toolEnv, gitBasicAuthEnv } = require("./exeEnv");

const CLONE_TIMEOUT_MS = 15 * 60 * 1000;

function runGit(args, cwd, { extraEnv, timeout } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout,
    env: toolEnv({ GIT_TERMINAL_PROMPT: "0", ...(extraEnv || {}) }),
  });
  const output = redactSecrets(`${result.stdout || ""}\n${result.stderr || ""}`).trim();
  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(`git ${args[0]}: таймаут после ${Math.round((timeout || 0) / 1000)} с`);
    }
    throw new Error(`git ${args[0]}: ${redactSecrets(result.error.message)}`);
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} (${result.status}): ${output || "нет вывода"}`);
  }
  return output;
}

async function readOrigin(rootPath) {
  try {
    return runGit(["remote", "get-url", "origin"], rootPath).trim();
  } catch {
    return "";
  }
}

function sameRepo(a, b) {
  const left = parseGithubOwnerRepo(a);
  const right = parseGithubOwnerRepo(b);
  if (!left || !right) return false;
  return (
    left.owner.toLowerCase() === right.owner.toLowerCase() &&
    left.repo.toLowerCase() === right.repo.toLowerCase()
  );
}

/**
 * Token is persisted in `remote.origin.url` on purpose: `git push/pull` and
 * GitHub Desktop then work without an interactive GitHub sign-in.
 * Opt out with `"autosetupGitTokenInRemote": false` in meta.json.
 */
function buildAuthUrl(owner, repo, token) {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${owner}/${repo}.git`;
}

function urlHasCredentials(url) {
  return /^https?:\/\/[^@/\s]+@/i.test(String(url || ""));
}

function sanitizeRepoName(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\.git$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return cleaned || "app";
}

async function preferredRepoName(rootPath) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(rootPath, "package.json"), "utf8"));
    const name = String(pkg?.name || "").trim();
    if (name && /^[A-Za-z0-9._-]+$/.test(name)) return sanitizeRepoName(name);
  } catch {
    // package.json может отсутствовать
  }
  return sanitizeRepoName(path.basename(rootPath));
}

function backupStamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\.(\d+)Z$/, "-$1");
}

/** Keeps the previous .git outside the project tree so it never pollutes `git status`. */
async function moveGitDirAside(rootPath) {
  const gitDir = path.join(rootPath, ".git");
  const backupDir = path.join(
    path.dirname(rootPath),
    `${path.basename(rootPath)}.git.bak-${backupStamp()}`
  );
  try {
    await fs.rename(gitDir, backupDir);
  } catch {
    await fs.cp(gitDir, backupDir, { recursive: true });
    await fs.rm(gitDir, { recursive: true, force: true });
  }
  return backupDir;
}

async function restoreGitDir(rootPath, backupDir, cause) {
  const gitDir = path.join(rootPath, ".git");
  await fs.rm(gitDir, { recursive: true, force: true }).catch(() => {});
  if (!backupDir) return;
  try {
    await fs.rename(backupDir, gitDir);
  } catch {
    try {
      await fs.cp(backupDir, gitDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `${cause instanceof Error ? cause.message : String(cause)}; вернуть .git из ${backupDir} не удалось: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

async function githubApi(token, method, apiPath, body) {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "autosetup",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

/**
 * Fail early with an actionable message instead of a raw "repository not found"
 * from `git clone`. `permissions` is absent for some tokens — then we only skip.
 */
async function checkRepoAccess(token, owner, repo, api = githubApi) {
  const res = await api(
    token,
    "GET",
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
  if (res.status === 404) {
    throw new Error(
      `Нет доступа к ${owner}/${repo} (HTTP 404): проверьте Git URL в задаче и права токена (Contents: Read and write или scope repo).`
    );
  }
  if (!res.ok) {
    throw new Error(
      `GitHub repo ${owner}/${repo}: HTTP ${res.status} ${res.json?.message || ""}`.trim()
    );
  }
  const permissions = res.json?.permissions || null;
  if (permissions && permissions.push === false) {
    throw new Error(
      `Токен только на чтение ${owner}/${repo}: нужен Contents: Read and write (fine-grained) или scope repo (classic).`
    );
  }
  return { defaultBranch: String(res.json?.default_branch || ""), permissions };
}

/** Folder / app / task-key hints used to recognise the task repo without creating a new one. */
function repoNameCandidates(rootPath, meta) {
  const issue = String(meta?.jiraIssue || meta?.jiraTask || "");
  const digits = (issue.match(/\d{3,}/) || [])[0] || "";
  const appName = sanitizeRepoName(meta?.appName || "");
  return [
    digits,
    appName === "app" ? "" : appName,
    sanitizeRepoName(path.basename(rootPath)),
  ]
    .filter((value) => value && value !== "app" && value.length >= 3)
    .map((value) => value.toLowerCase());
}

/**
 * Same as the helper Git tab «Ищем / создаём репозиторий по токену»:
 * package.json name → task key / app name / folder name → the only repo the token can see.
 * Creating a new repo is opt-in (`meta.autosetupCreateRepo === true`) so a random
 * package name can never silently bind an empty repo to an intake project.
 */
async function resolveRepoFromToken(token, rootPath, meta, api = githubApi) {
  const preferredName = await preferredRepoName(rootPath);
  const me = await api(token, "GET", "/user");
  if (!me.ok || !me.json?.login) {
    throw new Error(
      `GitHub /user ${me.status || ""}: ${me.json?.message || "токен не принят"}`.trim()
    );
  }
  const login = String(me.json.login);

  const direct = await api(
    token,
    "GET",
    `/repos/${encodeURIComponent(login)}/${encodeURIComponent(preferredName)}`
  );
  if (direct.ok && direct.json?.name) {
    return {
      owner: direct.json.owner?.login || login,
      repo: direct.json.name,
      created: false,
    };
  }

  const listed = [];
  for (let page = 1; page <= 5; page++) {
    const pageRes = await api(
      token,
      "GET",
      `/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator&sort=updated`
    );
    if (!pageRes.ok || !Array.isArray(pageRes.json)) break;
    listed.push(...pageRes.json);
    if (pageRes.json.length < 100) break;
  }

  const preferredLower = preferredName.toLowerCase();
  const exact = listed.find(
    (repo) => String(repo?.name || "").toLowerCase() === preferredLower
  );
  if (exact?.name) {
    return { owner: exact.owner?.login || login, repo: exact.name, created: false };
  }

  const needles = repoNameCandidates(rootPath, meta);
  const similar = listed.filter((repo) => {
    const name = String(repo?.name || "").toLowerCase();
    return name && needles.some((needle) => name.includes(needle));
  });
  if (similar.length === 1) {
    return {
      owner: similar[0].owner?.login || login,
      repo: similar[0].name,
      created: false,
    };
  }
  if (listed.length === 1) {
    return { owner: listed[0].owner?.login || login, repo: listed[0].name, created: false };
  }

  if (meta?.autosetupCreateRepo !== true) {
    const names = listed
      .slice(0, 8)
      .map((repo) => String(repo?.name || ""))
      .filter(Boolean);
    throw new Error(
      [
        `В задаче не заполнен Git URL, а репозиторий «${preferredName}» не найден автоматически${
          similar.length > 1 ? " (несколько похожих)" : ""
        }.`,
        names.length ? `Доступные репо: ${names.join(", ")}` : "У токена нет доступных репозиториев.",
        "Укажите Git URL в поле customfield_10056 задачи Jira (или meta.jiraGitUrlField).",
        'Создать репо автоматически можно с "autosetupCreateRepo": true в meta.json.',
      ].join("\n")
    );
  }

  const created = await api(token, "POST", "/user/repos", {
    name: preferredName,
    private: true,
    auto_init: false,
    description: path.basename(rootPath),
  });
  if (!created.ok || !created.json?.name) {
    throw new Error(
      `Не удалось создать ${login}/${preferredName}: ${
        created.json?.message || `HTTP ${created.status}`
      }`
    );
  }
  return {
    owner: created.json.owner?.login || login,
    repo: created.json.name,
    created: true,
  };
}


/**
 * Clones the task repo into %TEMP% with HTTPS auth from the environment
 * (token is not in argv and not written to the project config), then copies
 * only `.git` — project files stay untouched.
 */
async function cloneRepoToTemp({ repo, token, cleanUrl, gitDir }) {
  const tempDir = path.join(
    os.tmpdir(),
    `autosetup-git-${sanitizeRepoName(repo)}-${Date.now()}`
  );
  try {
    runGit(["clone", "--quiet", cleanUrl, tempDir], os.tmpdir(), {
      extraEnv: gitBasicAuthEnv("x-access-token", token),
      timeout: CLONE_TIMEOUT_MS,
    });
    await fs.cp(path.join(tempDir, ".git"), gitDir, { recursive: true });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function attachGitFromJira(rootPath, meta, deps = {}) {
  const api = deps.githubApi || githubApi;
  const cloneRepo = deps.cloneRepo || cloneRepoToTemp;
  const readCredentials = deps.loadGitCredentials || loadGitCredentials;
  const restoreCredentialHelper =
    deps.restoreCredentialHelper || restoreGitHubDesktopCredentialHelper;

  restoreCredentialHelper();
  const creds = await readCredentials(meta);
  if (!creds.token) {
    throw new Error(
      `В ${creds.issueKey} нет строки [github] : <token> в Description или Details`
    );
  }
  if (creds.platform !== "github") {
    throw new Error(`Ожидается GitHub token, в задаче платформа ${creds.platform}`);
  }

  let parsed = parseGithubOwnerRepo(creds.gitUrl);
  let viaToken = null;
  if (!parsed) {
    viaToken = await resolveRepoFromToken(creds.token, rootPath, meta, api);
    parsed = { owner: viaToken.owner, repo: viaToken.repo };
  }
  const cleanUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
  const authUrl = buildAuthUrl(parsed.owner, parsed.repo, creds.token);
  const storeToken = meta?.autosetupGitTokenInRemote !== false;
  const tokenNote = storeToken
    ? "токен записан в origin — push/pull без входа в GitHub Desktop"
    : "origin без токена (autosetupGitTokenInRemote: false)";
  const resolvedNote = viaToken
    ? viaToken.created
      ? `репо создан по токену ${parsed.owner}/${parsed.repo}`
      : `репо по токену ${parsed.owner}/${parsed.repo}`
    : "";

  const gitDir = path.join(rootPath, ".git");
  let hasGit = false;
  try {
    await fs.access(gitDir);
    hasGit = true;
  } catch {
    hasGit = false;
  }

  let backupDir = "";
  let previousOrigin = "";
  let warning = "";
  if (hasGit) {
    previousOrigin = await readOrigin(rootPath);
    if (sameRepo(previousOrigin, cleanUrl)) {
      // Already attached: no GitHub API call needed, works even when rate-limited.
      let originNote = `.git уже указывает на ${parsed.owner}/${parsed.repo}`;
      if (storeToken && !urlHasCredentials(previousOrigin)) {
        runGit(["remote", "set-url", "origin", authUrl], rootPath);
        originNote += ", токен добавлен в origin";
      }
      return {
        ok: true,
        skippedClone: true,
        details: [resolvedNote, originNote, tokenNote].filter(Boolean).join("; "),
        owner: parsed.owner,
        repo: parsed.repo,
        token: creds.token,
        cleanUrl,
        defaultBranch: "",
        tokenStoredInRemote: storeToken,
      };
    }
  }

  // Network check only when a clone is actually required (fails before `.git` is moved).
  const access = await checkRepoAccess(creds.token, parsed.owner, parsed.repo, api);

  if (hasGit) {
    // .git from another repo (or no origin): keep it aside, then attach the task repo.
    backupDir = await moveGitDirAside(rootPath);
    const safePrevious = redactSecrets(previousOrigin || "origin не задан");
    warning = previousOrigin
      ? `origin был ${safePrevious} — заменён на ${parsed.owner}/${parsed.repo}. Старый .git сохранён: ${backupDir}`
      : `.git без origin заменён на ${parsed.owner}/${parsed.repo}. Старый .git сохранён: ${backupDir}`;
  }

  try {
    await cloneRepo({
      rootPath,
      owner: parsed.owner,
      repo: parsed.repo,
      token: creds.token,
      cleanUrl,
      gitDir,
    });
    runGit(["remote", "set-url", "origin", storeToken ? authUrl : cleanUrl], rootPath);
  } catch (error) {
    await restoreGitDir(rootPath, backupDir, error);
    throw error;
  }

  return {
    ok: true,
    skippedClone: false,
    warning,
    backupDir,
    previousOrigin: redactSecrets(previousOrigin),
    tokenStoredInRemote: storeToken,
    details: [
      resolvedNote,
      `.git привязан к ${parsed.owner}/${parsed.repo}${
        access.defaultBranch ? ` (${access.defaultBranch})` : ""
      }`,
      tokenNote,
      backupDir ? `старый .git: ${backupDir}` : "",
      "файлы проекта не перезаписывались",
    ]
      .filter(Boolean)
      .join("; "),
    owner: parsed.owner,
    repo: parsed.repo,
    token: creds.token,
    cleanUrl,
    defaultBranch: access.defaultBranch,
  };
}

module.exports = { attachGitFromJira };

