const fs = require("node:fs/promises");
const path = require("node:path");
const { safeStat } = require("./fsUtils");

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

async function walkFiles(dir, out = []) {
  const stat = await safeStat(dir);
  if (!stat) return out;
  if (stat.isFile()) {
    out.push(dir);
    return out;
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, out);
    else if (entry.isFile() && CODE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function extractRelativeRefs(content) {
  const refs = [];
  const re =
    /(?:require\s*\(\s*|from\s+)(['"])(\.\.?\/[^'"]+)\1/g;
  let m;
  while ((m = re.exec(content))) {
    refs.push(m[2]);
  }
  return refs;
}

async function resolveRef(fromFile, ref) {
  const base = path.resolve(path.dirname(fromFile), ref);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    `${base}.gif`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (await safeStat(candidate)) return candidate;
  }
  return null;
}

/**
 * Check relative require/import paths in Layouts/Game, services/, and App.tsx.
 */
async function checkProjectPaths(rootPath) {
  const targets = [
    path.join(rootPath, "Layouts", "Game"),
    path.join(rootPath, "services"),
    path.join(rootPath, "App.tsx"),
  ];

  const files = [];
  for (const target of targets) {
    await walkFiles(target, files);
  }

  const problems = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const refs = extractRelativeRefs(content);
    for (const ref of refs) {
      if (!ref.startsWith(".")) continue;
      const resolved = await resolveRef(file, ref);
      if (!resolved) {
        problems.push({
          file: path.relative(rootPath, file).replace(/\\/g, "/"),
          ref,
        });
      }
    }
  }

  return {
    ok: problems.length === 0,
    checkedFiles: files.length,
    problems,
  };
}

module.exports = { checkProjectPaths };
