const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
}

/** google-services.json / google-services (2).json / google-services(3).json */
function isGoogleServicesFilename(name) {
  return /^google-services(?:\s*\(\d+\))?\.json$/i.test(name || "");
}

function pickOne(files, label, matcher) {
  const matched = files.filter((f) => matcher(path.basename(f)));
  if (matched.length === 0) {
    throw new Error(`NewTaskData: не найден файл для «${label}»`);
  }
  matched.sort((a, b) => {
    let ta = 0;
    let tb = 0;
    try {
      ta = fsSync.statSync(a).mtimeMs || 0;
    } catch {
      /* ignore */
    }
    try {
      tb = fsSync.statSync(b).mtimeMs || 0;
    } catch {
      /* ignore */
    }
    if (tb !== ta) return tb - ta;
    const num = (n) => {
      const m = String(n || "").match(/\((\d+)\)\s*\.\w+$/);
      return m ? Number(m[1]) : 0;
    };
    return num(path.basename(b)) - num(path.basename(a));
  });
  if (matched.length > 1) {
    const names = matched.map((f) => path.basename(f)).join(", ");
    console.warn(
      `[warn] NewTaskData: несколько файлов для «${label}», беру самый новый «${path.basename(matched[0])}»: ${names}`
    );
  }
  return matched[0];
}

/**
 * Legacy local-folder resolver (optional fallback when Jira is not configured).
 * Icons zip is no longer used — Jira ships a single PNG.
 */
async function resolveTaskData(newTaskDataDir) {
  const files = await listFiles(newTaskDataDir);

  return {
    dir: newTaskDataDir,
    iconsZip: null,
    keystoreTar: pickOne(files, "keystore tar.gz", (n) => /\.tar\.gz$/i.test(n)),
    googleServices: pickOne(files, "google-services.json", isGoogleServicesFilename),
    sourceZip: pickOne(files, "_source zip", (n) => /_source/i.test(n) && /\.zip$/i.test(n)),
  };
}

module.exports = { resolveTaskData };
