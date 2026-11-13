#!/usr/bin/env node
/**
 * Release build → C:\Users\EvoReD\Desktop\ReadyBuilds
 * Имя файла как в RN App Helper: "Pulse Road - 2999 (1залив).apk|.aab"
 *
 * Usage:
 *   node scripts/autosetup/buildRelease.js
 *   node scripts/autosetup/buildRelease.js --apk
 *   node scripts/autosetup/buildRelease.js --aab
 *   node scripts/autosetup/buildRelease.js --meta meta.json
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveBuildName } = require("./buildName");
const { ensureDir, safeStat, copyFile } = require("./fsUtils");

const DEFAULT_READY_BUILDS = "C:\\Users\\EvoReD\\Desktop\\ReadyBuilds";

function parseArgs(argv) {
  const args = {
    metaPath: null,
    apk: false,
    aab: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--meta") args.metaPath = argv[++i];
    else if (a === "--apk") args.apk = true;
    else if (a === "--aab") args.aab = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  if (!args.apk && !args.aab) {
    args.apk = true;
    args.aab = true;
  }
  return args;
}

async function loadMeta(metaPath) {
  try {
    return JSON.parse(await fs.readFile(metaPath, "utf8"));
  } catch {
    return {};
  }
}

function runGradle(androidDir, task) {
  const isWin = process.platform === "win32";
  const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");
  console.log(`[release] gradlew ${task}`);
  // Одна командная строка + shell: .bat на Windows и без DEP0190
  const command = isWin ? `"${gradlew}" ${task}` : `"${gradlew}" ${task}`;
  const result = spawnSync(command, {
    cwd: androidDir,
    stdio: "inherit",
    shell: true,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`Gradle task failed: ${task} (${result.error.message})`);
  }
  if (result.status !== 0) {
    throw new Error(`Gradle task failed: ${task} (exit ${result.status})`);
  }
}

async function findNewestFile(dir, ext) {
  const stat = await safeStat(dir);
  if (!stat?.isDirectory()) return null;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let best = null;
  let bestMtime = -1;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(ext)) continue;
    const full = path.join(dir, entry.name);
    const st = await fs.stat(full);
    if (st.mtimeMs > bestMtime) {
      bestMtime = st.mtimeMs;
      best = full;
    }
  }
  return best;
}

async function copyNamed(srcFile, readyBuildsDir, buildName, ext) {
  await ensureDir(readyBuildsDir);
  const dest = path.join(readyBuildsDir, `${buildName}.${ext}`);
  await copyFile(srcFile, dest);
  return dest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Release build

  --apk              only assembleRelease
  --aab              only bundleRelease
  (default)          both
  --meta <path>      read readyBuildsDir from meta.json
`);
    return;
  }

  const rootPath = path.resolve(__dirname, "..", "..");
  const metaPath = path.resolve(rootPath, args.metaPath || "meta.json");
  const meta = await loadMeta(metaPath);
  const readyBuildsDir = path.resolve(
    meta.readyBuildsDir || DEFAULT_READY_BUILDS
  );

  // versionCode берём из build.gradle — как кнопка «Создать название» в Helper
  const named = await resolveBuildName(rootPath);
  if (!named.ok) {
    throw new Error(`${named.title}: ${named.details}`);
  }

  console.log(`[release] project: ${rootPath}`);
  console.log(`[release] buildName: ${named.buildName}`);
  console.log(`[release] out: ${readyBuildsDir}`);

  const androidDir = path.join(rootPath, "android");
  const copied = [];

  if (args.apk) {
    runGradle(androidDir, "assembleRelease");
    const apkDir = path.join(
      rootPath,
      "android",
      "app",
      "build",
      "outputs",
      "apk",
      "release"
    );
    const apk = await findNewestFile(apkDir, ".apk");
    if (!apk) throw new Error(`APK не найден в ${apkDir}`);
    const dest = await copyNamed(apk, readyBuildsDir, named.buildName, "apk");
    console.log(`[release] APK → ${dest}`);
    copied.push(dest);
  }

  if (args.aab) {
    runGradle(androidDir, "bundleRelease");
    const aabDir = path.join(
      rootPath,
      "android",
      "app",
      "build",
      "outputs",
      "bundle",
      "release"
    );
    const aab = await findNewestFile(aabDir, ".aab");
    if (!aab) throw new Error(`AAB не найден в ${aabDir}`);
    const dest = await copyNamed(aab, readyBuildsDir, named.buildName, "aab");
    console.log(`[release] AAB → ${dest}`);
    copied.push(dest);
  }

  console.log("[release] done:");
  for (const file of copied) console.log(`  ${file}`);
}

main().catch((err) => {
  console.error(`[release] ERROR: ${err.message || err}`);
  process.exit(1);
});
