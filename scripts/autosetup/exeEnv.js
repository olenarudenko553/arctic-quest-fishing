/**
 * Makes `gh` and `git` resolvable for spawnSync even when their install dirs
 * are not on the PATH that Node sees (the Cursor/VS Code helper launches
 * autosetup in a terminal whose PATH may differ from Git Bash).
 *
 * `toolEnv()` returns a copy of the environment with the standard GitHub CLI
 * and Git install directories prepended to PATH when they exist on disk.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Buffer } = require("node:buffer");

const LOCALAPPDATA = process.env.LOCALAPPDATA || "";
const PROGRAMFILES = process.env.ProgramFiles || "C:\\Program Files";
const PROGRAMFILES_X86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

const CANDIDATE_DIRS = [
  path.join(PROGRAMFILES, "GitHub CLI"),
  path.join(PROGRAMFILES_X86, "GitHub CLI"),
  LOCALAPPDATA && path.join(LOCALAPPDATA, "Programs", "GitHub CLI"),
  path.join(PROGRAMFILES, "Git", "cmd"),
  path.join(PROGRAMFILES, "Git", "bin"),
  path.join(PROGRAMFILES_X86, "Git", "cmd"),
  LOCALAPPDATA && path.join(LOCALAPPDATA, "Programs", "Git", "cmd"),
  LOCALAPPDATA &&
    path.join(LOCALAPPDATA, "GitHubDesktop", "app", "resources", "app", "git", "cmd"),
].filter(Boolean);

function augmentedPath() {
  const sep = path.delimiter;
  const current = process.env.PATH || process.env.Path || "";
  const have = new Set(
    current
      .split(sep)
      .filter(Boolean)
      .map((p) => p.replace(/[\\/]+$/, "").toLowerCase())
  );
  const extra = [];
  for (const dir of CANDIDATE_DIRS) {
    const key = dir.replace(/[\\/]+$/, "").toLowerCase();
    if (have.has(key)) continue;
    try {
      if (fs.existsSync(dir)) {
        extra.push(dir);
        have.add(key);
      }
    } catch {
      // ignore unreadable candidate
    }
  }
  return extra.length ? `${extra.join(sep)}${sep}${current}` : current;
}

/**
 * @param {Record<string, string>} [extra] extra env vars to merge in
 */
function toolEnv(extra = {}) {
  return { ...process.env, PATH: augmentedPath(), ...extra };
}

/**
 * Git auth for HTTPS without leaking the token into argv or `.git/config`.
 * Git >= 2.31 merges GIT_CONFIG_COUNT/KEY_n/VALUE_n as extra config entries,
 * so the Authorization header never shows up in the process command line.
 * @param {string} username token owner for GitHub (`x-access-token`)
 * @param {string} token PAT / fine-grained token
 */
function gitBasicAuthEnv(username, token) {
  const encoded = Buffer.from(`${username}:${token}`, "utf8").toString("base64");
  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${encoded}`,
  };
}

module.exports = { toolEnv, augmentedPath, gitBasicAuthEnv };
