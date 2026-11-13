const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function safeStat(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function rmrf(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function emptyDir(dir) {
  await rmrf(dir);
  await ensureDir(dir);
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDir(src, dest, { skipDirNames = [] } = {}) {
  const stat = await safeStat(src);
  if (!stat) throw new Error(`Source not found: ${src}`);
  if (!stat.isDirectory()) {
    await copyFile(src, dest);
    return;
  }

  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirNames.includes(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to, { skipDirNames });
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
  }
}

function extractArchive(archivePath, destDir) {
  const result = spawnSync(
    "tar",
    ["-xf", archivePath, "-C", destDir],
    { encoding: "utf8", shell: false }
  );
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`Failed to extract ${archivePath}: ${err || `exit ${result.status}`}`);
  }
}

async function withTempDir(prefix, fn) {
  const base = path.join(require("node:os").tmpdir(), `${prefix}-${Date.now()}`);
  await emptyDir(base);
  try {
    return await fn(base);
  } finally {
    await rmrf(base);
  }
}

async function findFirstFile(rootDir, predicate) {
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && predicate(entry.name, full)) return full;
    }
  }
  return null;
}

/** Split helpers keep this marker; hosts use autosetup-split-begin. Fragment may sit inside "Part01". */
function isAutosetupSplitPart(src) {
  return (
    String(src || "").includes("autosetup-split:v1") &&
    !String(src || "").includes("autosetup-split-begin")
  );
}

module.exports = {
  safeStat,
  ensureDir,
  rmrf,
  emptyDir,
  copyFile,
  copyDir,
  extractArchive,
  withTempDir,
  findFirstFile,
  isAutosetupSplitPart,
};
