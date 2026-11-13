const fs = require("node:fs/promises");
const path = require("node:path");
const {
  safeStat,
  ensureDir,
  rmrf,
  emptyDir,
  copyFile,
  copyDir,
  extractArchive,
  withTempDir,
  findFirstFile,
} = require("./fsUtils");
const { bundleGameSources } = require("./bundleGame");

function parseKeystoreProperties(text) {
  const map = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return map;
}

async function patchGradleProperties(gradlePropertiesPath, { alias, storePassword, keyPassword }) {
  let content = await fs.readFile(gradlePropertiesPath, "utf8");
  const setProp = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, `${key}=${value}`);
    } else {
      content = `${content.replace(/\s*$/, "")}\n${key}=${value}\n`;
    }
  };
  setProp("MYAPP_RELEASE_STORE_FILE", "keystore.keystore");
  setProp("MYAPP_RELEASE_KEY_ALIAS", alias);
  setProp("MYAPP_RELEASE_STORE_PASSWORD", storePassword);
  setProp("MYAPP_RELEASE_KEY_PASSWORD", keyPassword || storePassword);
  await fs.writeFile(gradlePropertiesPath, content, "utf8");
}

async function applyIcons(rootPath, iconsZip) {
  const resDir = path.join(rootPath, "android", "app", "src", "main", "res");
  await withTempDir("autosetup-icons", async (tmp) => {
    extractArchive(iconsZip, tmp);
    const androidDir = path.join(tmp, "android");
    const source = (await safeStat(androidDir)) ? androidDir : tmp;
    await copyDir(source, resDir, { skipDirNames: ["values"] });
  });
  return { ok: true, details: `Icons → ${path.relative(rootPath, resDir)} (без values)` };
}

async function applyKeystore(rootPath, keystoreTar) {
  const appDir = path.join(rootPath, "android", "app");
  const destKeystore = path.join(appDir, "keystore.keystore");
  const gradleProperties = path.join(rootPath, "android", "gradle.properties");

  return withTempDir("autosetup-keystore", async (tmp) => {
    extractArchive(keystoreTar, tmp);
    const keystoreFile = await findFirstFile(tmp, (name) => /\.keystore$/i.test(name));
    const propsFile = await findFirstFile(tmp, (name) => /\.properties$/i.test(name));
    if (!keystoreFile) throw new Error("В tar.gz нет .keystore");
    if (!propsFile) throw new Error("В tar.gz нет .properties");

    const props = parseKeystoreProperties(await fs.readFile(propsFile, "utf8"));
    const alias = props.keyAlias || props.KEY_ALIAS;
    const storePassword = props.storePassword || props.STORE_PASSWORD;
    const keyPassword = props.keyPassword || props.KEY_PASSWORD || storePassword;
    if (!alias || !storePassword) {
      throw new Error("В .properties нет keyAlias/storePassword");
    }

    await copyFile(keystoreFile, destKeystore);
    await patchGradleProperties(gradleProperties, { alias, storePassword, keyPassword });
    return {
      ok: true,
      details: `keystore.keystore + gradle.properties (alias=${alias})`,
    };
  });
}

async function applyGoogleServices(rootPath, googleServicesPath) {
  const dest = path.join(rootPath, "android", "app", "google-services.json");
  await copyFile(googleServicesPath, dest);
  return { ok: true, details: `google-services.json → android/app/` };
}

/**
 * applyGame is marker-driven. Every file inside Layouts/Game carries a slot
 * marker on the first line:
 *   /* @app-slot:service * /  — platform/backend (aesgcm, CryptoService, …).
 *     Never touched; survives every applyGame.
 *   /* @app-slot:anchor  * /  — GameInit.tsx. Overwritten in place, body comes
 *     from the source archive's App.tsx.
 *   /* @app-slot:game    * /  — everything else (components, screens, hooks,
 *     game logic, assets registry). Deleted before copy, recreated from the
 *     source archive.
 * The marker never leaves the file (both existing and newly-imported files
 * carry it), so re-running applyGame on the same project is idempotent.
 */
const SLOT_HEADER_RE = /^\/\*\s*@app-slot\s*:\s*(service|game|anchor)\s*\*\//m;
const SLOT_HEADER_HEAD_RE = /^\/\*\s*@app-slot\s*:\s*(service|game|anchor)\s*\*\/\s*\r?\n/;
const SUBFOLDER_IMPORT_RE =
  /(from\s+|require\(\s*)(['"])(\.{1,2}\/)(?:components|screens|game|hooks|constants|utils)\/([^'"]+)\2/g;
// Match `../assets`, `../../assets`, `../../../assets`, … (one or more `../`).
const ASSETS_UP_IMPORT_RE =
  /(from\s+|require\(\s*)(['"])(?:\.\.\/)+assets(\/[^'"]*)?\2/g;
const SRC_PREFIX_IMPORT_RE = /(from\s+|require\(\s*)(['"])\.\/src\/([^'"]+)\2/g;

async function readSlot(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const match = SLOT_HEADER_RE.exec(content);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function stripExistingMarker(content) {
  return String(content).replace(SLOT_HEADER_HEAD_RE, "");
}

function withMarker(slot, content) {
  return `/* @app-slot:${slot} */\n${stripExistingMarker(content)}`;
}

/** Rewrite subfolder-relative imports to flat siblings, drop `./src/` prefix,
 *  and collapse `../assets` / `../../assets` to the local `./assets`. Order
 *  matters: strip `./src/` first (otherwise `./src/screens/X` would survive
 *  the subfolder pass and only the prefix would get removed, leaving
 *  `./screens/X`). */
function flattenImports(content) {
  let next = String(content);
  next = next.replace(SRC_PREFIX_IMPORT_RE, (_m, kw, q, name) =>
    `${kw}${q}./${name}${q}`
  );
  next = next.replace(SUBFOLDER_IMPORT_RE, (_m, kw, q, _dots, name) =>
    `${kw}${q}./${name}${q}`
  );
  next = next.replace(ASSETS_UP_IMPORT_RE, (_m, kw, q, rest) =>
    `${kw}${q}./assets${rest || ""}${q}`
  );
  return next;
}

async function deleteGameSlots(gameDir) {
  const removed = [];
  for (const entry of await fs.readdir(gameDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "assets") {
        // Drop all @app-slot:game files inside assets/ (typically index.ts +
        // PNGs). PNGs carry no marker, but they belong to the previous game.
        const assetsDir = path.join(gameDir, "assets");
        for (const asset of await fs.readdir(assetsDir)) {
          await rmrf(path.join(assetsDir, asset));
          removed.push(`assets/${asset}`);
        }
      }
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const full = path.join(gameDir, entry.name);
    const slot = await readSlot(full);
    if (slot === "game") {
      await rmrf(full);
      removed.push(entry.name);
    }
  }
  return removed;
}

function listSourceTsFiles(srcDir) {
  const out = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return walk(srcDir).then(() => out);
}

async function applyGame(rootPath, sourceZip) {
  const gameDir = path.join(rootPath, "Layouts", "Game");
  await ensureDir(gameDir);
  const assetsDir = path.join(gameDir, "assets");
  await ensureDir(assetsDir);

  return withTempDir("autosetup-source", async (tmp) => {
    extractArchive(sourceZip, tmp);

    const archiveAssets = path.join(tmp, "assets");
    const archiveSrc = path.join(tmp, "src");
    const archiveApp = path.join(tmp, "App.tsx");

    if (!(await safeStat(archiveAssets))) {
      throw new Error("В *_source нет папки assets/");
    }
    if (!(await safeStat(archiveSrc))) {
      throw new Error("В *_source нет папки src/");
    }
    if (!(await safeStat(archiveApp))) {
      throw new Error("В *_source нет App.tsx");
    }

    // 1. Wipe all @app-slot:game files. Services + anchor + unmarked files
    //    (none in a clean project) survive.
    const removed = await deleteGameSlots(gameDir);

    // 2. Replace assets/ wholesale — PNGs from archive + a tagged index.
    await emptyDir(assetsDir);
    await copyDir(archiveAssets, assetsDir);
    const archiveAssetsIndex = path.join(archiveAssets, "index.ts");
    const targetAssetsIndex = path.join(assetsDir, "index.ts");
    if (await safeStat(targetAssetsIndex)) {
      const raw = await fs.readFile(targetAssetsIndex, "utf8");
      await fs.writeFile(targetAssetsIndex, withMarker("game", flattenImports(raw)));
    } else if (await safeStat(archiveAssetsIndex)) {
      const raw = await fs.readFile(archiveAssetsIndex, "utf8");
      await fs.writeFile(targetAssetsIndex, withMarker("game", flattenImports(raw)));
    } else {
      // No index.ts in the archive — auto-generate one from the image files that
      // were just copied into assetsDir so the game bundles can import them.
      const imgs = (await fs.readdir(assetsDir))
        .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f))
        .sort();
      if (imgs.length > 0) {
        const lines = imgs.map((f) => {
          const stem = path.basename(f, path.extname(f));
          const camel = stem.replace(/[_-]([a-z0-9])/g, (_, c) => c.toUpperCase());
          return `export const ${camel} = require('./${f}');`;
        });
        await fs.writeFile(targetAssetsIndex, withMarker("game", lines.join("\n") + "\n"));
      }
    }

    // 3. Bundle every TS/TSX from src/* into 4 Layouts/Game bundles (+ styles
    //    sidecars) and rewrite the archive's App.tsx into GameInit.tsx. The
    //    bundler (bundleGame.js) handles suffix-renaming for colliding local
    //    identifiers, default→named export conversion, cross-bundle import
    //    rewiring and style-block extraction.
    const srcFiles = await listSourceTsFiles(archiveSrc);
    const fileMap = {};
    for (const abs of srcFiles) {
      const rel = path.relative(archiveSrc, abs).replace(/\\/g, "/");
      fileMap[rel] = abs;
    }
    const bundleReport = await bundleGameSources({
      files: fileMap,
      archiveApp,
      outDir: gameDir,
    });

    return {
      ok: true,
      details:
        `game-slot: удалено ${removed.length}, bundles: ${bundleReport.bundles.join(", ")}, ` +
        `files: ${bundleReport.written.length}; assets/ перезалиты.`,
    };
  });
}

module.exports = {
  applyIcons,
  applyKeystore,
  applyGoogleServices,
  applyGame,
};
