#!/usr/bin/env node
/**
 * Autosetup (AES-256-GCM flow):
 *  - Jira: поля + вложения + Worker URL из комментариев
 *  - applyMeta: appName / packageName / version + LINK_HEX в Rumokuroh.java
 *  - applyAssets: keystore / google-services / game bundles
 *  - rotateEncryption: новый PASSWORD + SALT в native + worker, LINK_HEX перешифровка
 *  - path-check, clean-android, npm install, finishExtras (loader/helpers/git/github/fb)
 *
 * Usage:
 *   node scripts/autosetup/run.js
 *   node scripts/autosetup/run.js --only keystore,game
 *   node scripts/autosetup/run.js --checklist-only
 *   npm run cmds
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { detectProjectEncryptionMode } = require("./detectEncryption");
const { resolveTaskData } = require("./resolveTaskData");
const {
  syncMetaFromJira,
  downloadJiraAssets,
  fetchJiraCloudflareWorkerUrl,
  isJiraConfigured,
} = require("./fetchJiraTask");
const {
  applyKeystore,
  applyGoogleServices,
  applyGame,
} = require("./applyAssets");
const { checkProjectPaths } = require("./checkPaths");
const { rmrf, safeStat } = require("./fsUtils");
const {
  applyMetaFields,
  applyCloudflareWorkerLink,
  detectFragmentFromConstants,
} = require("./applyMeta");
const { rotateProjectEncryption } = require("./rotateEncryption");
const { rotateCfProtocol } = require("./rotateCfProtocol");
const { renameModules } = require("./renameModules");
const { padMethods } = require("./padMethods");
const { checkNativeV2 } = require("./checkNative");
const { repairImports } = require("./repairImports");
const { runFinishExtras, TAIL_STEPS } = require("./finishExtras");

const PARTIAL_STEPS = new Set([
  "meta",
  "keystore",
  "google-services",
  "game",
  "repair-imports",
  "paths",
  "native-check",
  "cf-protocol",
  "rename-modules",
  "pad-methods",
  "rotate",
  "npm",
  "clean-android",
  "checklist",
  "description",
  "git-remote",
  "github-aab",
  "fb-jira",
]);

function parseArgs(argv) {
  const args = {
    metaPath: null,
    assetsOnly: false,
    checklistOnly: false,
    skipNpm: false,
    skipAssets: false,
    skipTail: false,
    only: null,
    list: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--meta") args.metaPath = argv[++i];
    else if (a === "--assets-only") args.assetsOnly = true;
    else if (a === "--checklist-only") args.checklistOnly = true;
    else if (a === "--skip-npm") args.skipNpm = true;
    else if (a === "--skip-assets") args.skipAssets = true;
    else if (a === "--skip-tail") args.skipTail = true;
    else if (a === "--only") args.only = String(argv[++i] || "");
    else if (a === "--list" || a === "list") args.list = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function parseOnly(raw) {
  if (!raw) return null;
  const steps = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const step of steps) {
    if (step === "icons") {
      throw new Error(
        "Шаг «icons» отключён: в Jira иконка PNG, добавьте mipmaps вручную"
      );
    }
    if (!PARTIAL_STEPS.has(step)) {
      throw new Error(
        `Неизвестный шаг «${step}». Доступно: ${[...PARTIAL_STEPS].join(", ")}`
      );
    }
  }
  return new Set(steps);
}

function printHelp() {
  console.log(`Autosetup (Jira)

Options:
  --meta <path>       Path to meta.json (default: <project>/meta.json)
  --only <steps>      Частичный запуск, через запятую:
                      meta, keystore, google-services, game, paths,
                      native-check, cf-protocol, rotate,
                      npm, clean-android, checklist,
                      description, git-remote, github-aab, fb-jira
  --assets-only       keystore+google-services+game+paths
  --skip-assets       Пропустить keystore/google-services/game
  --checklist-only    Только итог / summary
  --skip-npm          Не делать npm install в полном прогоне
  --skip-tail         Не запускать хвост: path-check, описание в Jira,
                      .git из GitHub, GitHub AAB, FB hash / Class Name
  --list              То же, что npm run cmds

meta.json (Jira):
  jiraBaseUrl, jiraEmail, jiraToken, jiraIssue
  → appName / packageName + keystore / google-services / *_source.zip
  → комментарии задачи: Cloudflare Worker URL → LINK_HEX в Rumokuroh.java
    (шифруется AES-256-GCM тем же ключом, что держит native + worker)
  → rotate: PASSWORD + SALT переписываются в Rumokuroh.java, Qelujowofahuhe.kt
    и cloudflare-worker/index.js; LINK_HEX перешифровывается под новый ключ
  → game: @app-slot:game бандлы в Layouts/Game пересобираются из source zip,
    инфраструктурные @app-slot:service файлы и GameInit.tsx остаются как есть
  → cf-protocol: cookieName / headerName / path / bodyField / extraQuery /
    dummyBodyKeys рандомизируются на проект и пишутся в worker + native +
    обратно в meta.json (meta.cfProtocol = "auto" → перегенерить)
  → native-check: валидирует v2 native (BwCodec.kt, gemefuxolaru/jopuwikemavo
    в Qelujowofahuhe.kt, cf-intake:v2 маркер в Desujiwelopozi.kt)

Примеры:
  node scripts/autosetup/run.js --only keystore,game
  node scripts/autosetup/run.js --only rotate
  node scripts/autosetup/run.js --only meta,paths
  npm run cmds
`);
}

async function loadMeta(metaPath) {
  const raw = await fs.readFile(metaPath, "utf8");
  return JSON.parse(raw);
}

/** Keys resolved at runtime — never persist into meta.json (portable between projects). */
const RUNTIME_ONLY_META_KEYS = ["encryptionResolved", "fragmentTo"];

async function saveMeta(metaPath, meta) {
  const toSave = { ...meta };
  for (const key of RUNTIME_ONLY_META_KEYS) {
    delete toSave[key];
  }
  await fs.writeFile(metaPath, `${JSON.stringify(toSave, null, 2)}\n`, "utf8");
}

function needsAutoFragment(value) {
  if (value == null) return true;
  const v = String(value).trim().toLowerCase();
  return v === "" || v === "auto" || v === "null" || v === "detect";
}

async function resolveEncryption(rootPath, _meta) {
  const mode = await detectProjectEncryptionMode(rootPath);
  return { mode, auto: true };
}

/** In-memory only — does not change meta.encryption on disk. */
function applyEncryptionToMeta(meta, enc) {
  meta.encryptionResolved = enc.mode;
}

function printWarningReport(warnings) {
  if (!warnings || warnings.length === 0) {
    console.log("Предупреждения: нет");
    return;
  }
  console.log(`Предупреждения (${warnings.length}):`);
  for (const item of warnings) {
    console.log(`  - ${item.title}: ${item.reason}`);
  }
}

function printDoneSummary(meta, { rootPath, encryptionMode, warnings = [] }) {
  console.log("\n========== Autosetup: готово ==========");
  console.log(`encryption: ${encryptionMode}`);
  console.log(`jiraIssue: ${meta.jiraIssue || "(n/a)"}`);
  console.log(`appName: ${meta.appName}`);
  console.log(`packageName: ${meta.packageName}`);
  console.log(`version: ${meta.versionCode} / ${meta.versionName}`);
  console.log(`project: ${rootPath}`);
  printWarningReport(warnings);
  console.log("=======================================\n");
}

async function cleanAndroidBuilds(rootPath) {
  const targets = [
    path.join(rootPath, "android", "build"),
    path.join(rootPath, "android", "app", "build"),
  ];
  const deleted = [];
  const missing = [];
  for (const target of targets) {
    if (await safeStat(target)) {
      await rmrf(target);
      deleted.push(path.relative(rootPath, target).replace(/\\/g, "/"));
    } else {
      missing.push(path.relative(rootPath, target).replace(/\\/g, "/"));
    }
  }
  return {
    ok: true,
    details:
      `удалено: ${deleted.join(", ") || "—"}` +
      (missing.length ? `; не было: ${missing.join(", ")}` : ""),
  };
}

async function runNpmInstall(rootPath) {
  const result = spawnSync("npm install", {
    cwd: rootPath,
    stdio: "inherit",
    shell: true,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`npm install failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npm install failed with exit ${result.status}`);
  }
  return { ok: true, details: "npm install ok" };
}

async function prepareMeta(
  rootPath,
  metaPath,
  { requireMetaFields } = {}
) {
  const meta = await loadMeta(metaPath);
  if (requireMetaFields) {
    const required = ["appName", "packageName", "versionCode", "versionName"];
    for (const key of required) {
      if (meta[key] == null || meta[key] === "") {
        throw new Error(`meta.json: отсутствует поле «${key}»`);
      }
    }
  }

  const enc = await resolveEncryption(rootPath, meta);
  applyEncryptionToMeta(meta, enc);
  console.log(`[autosetup] encryption → ${enc.mode}`);

  if (needsAutoFragment(meta.fragmentTo)) {
    meta.fragmentTo = await detectFragmentFromConstants(rootPath);
    console.log(
      `[autosetup] fragmentTo from project → ${meta.fragmentTo || "(empty)"}`
    );
  } else {
    console.log(`[autosetup] fragmentTo from meta → ${meta.fragmentTo}`);
  }

  // Runtime fields stay in memory only — meta.json stays portable across projects.
  return { meta, enc };
}

async function ensureMetaFromJira(meta, metaPath) {
  if (!isJiraConfigured(meta)) return meta;
  await syncMetaFromJira(meta, metaPath, { saveMeta });
  return loadMeta(metaPath);
}

async function resolveAssets(meta) {
  if (isJiraConfigured(meta)) {
    const jira = await downloadJiraAssets(meta);
    return { task: jira.task, cleanup: jira.cleanup };
  }

  if (!meta.newTaskData) {
    throw new Error(
      "meta.json: укажите jiraToken + jiraIssue (+ jiraEmail), либо newTaskData как fallback"
    );
  }

  const newTaskData = path.resolve(meta.newTaskData);
  console.log(`[autosetup] NewTaskData (fallback): ${newTaskData}`);
  const task = await resolveTaskData(newTaskData);
  console.log(`[autosetup] keystore: ${path.basename(task.keystoreTar)}`);
  console.log(`[autosetup] google-services: ${path.basename(task.googleServices)}`);
  console.log(`[autosetup] source: ${path.basename(task.sourceZip)}`);
  return { task, cleanup: async () => {} };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) {
    require("./listCommands");
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }

  const only = parseOnly(args.only);
  const rootPath = path.resolve(__dirname, "..", "..");
  const metaPath = path.resolve(rootPath, args.metaPath || "meta.json");

  console.log(`[autosetup] project: ${rootPath}`);
  console.log(`[autosetup] meta: ${metaPath}`);

  const doMeta = only ? only.has("meta") : true;
  let doKeystore = only ? only.has("keystore") : true;
  let doGs = only ? only.has("google-services") : true;
  let doGame = only ? only.has("game") : true;
  const doPaths = only ? only.has("paths") : true;
  const doNativeCheck = only ? only.has("native-check") : true;
  const doCfProtocol = only ? only.has("cf-protocol") : !args.assetsOnly;
  const doRenameModules = only ? only.has("rename-modules") : !args.assetsOnly;
  const doPadMethods = only ? only.has("pad-methods") : !args.assetsOnly;
  const doRotate = only ? only.has("rotate") : !args.assetsOnly;
  const doClean = only ? only.has("clean-android") : !args.assetsOnly;
  const doNpm = only
    ? only.has("npm")
    : !args.assetsOnly && !args.skipNpm;
  const doSummary = only
    ? only.has("checklist")
    : args.checklistOnly || !args.assetsOnly;

  if (args.skipAssets) {
    doKeystore = false;
    doGs = false;
    doGame = false;
    console.log("[autosetup] --skip-assets: keystore/google-services/game skipped");
  }

  let cleanup = async () => {};

  try {
    if (args.checklistOnly) {
      let meta = await loadMeta(metaPath);
      if (isJiraConfigured(meta)) {
        meta = await ensureMetaFromJira(meta, metaPath);
      }
      const { enc } = await prepareMeta(rootPath, metaPath, {
        requireMetaFields: true,
      });
      meta = await loadMeta(metaPath);
      printDoneSummary(meta, { rootPath, encryptionMode: enc.mode });
      return;
    }

    const needAssets = doKeystore || doGs || doGame;
    const needJiraFields =
      doMeta || needAssets || doSummary || (!only && true);

    let meta = await loadMeta(metaPath).catch(() => ({}));
    let enc = null;
    let task = null;

    if (needJiraFields && isJiraConfigured(meta)) {
      meta = await ensureMetaFromJira(meta, metaPath);
    }

    const needPrepare =
      doMeta || doKeystore || doGs || doGame || doRotate || doSummary;

    if (needPrepare) {
      const prepared = await prepareMeta(rootPath, metaPath, {
        requireMetaFields: doMeta || doSummary || !only,
      });
      meta = prepared.meta;
      enc = prepared.enc;
    }

    if (only && only.size === 1 && only.has("checklist")) {
      printDoneSummary(meta, { rootPath, encryptionMode: enc.mode });
      return;
    }

    if (doMeta) {
      console.log("[autosetup] meta fields...");
      let cloudflareWorkerUrl = null;
      if (isJiraConfigured(meta)) {
        const cf = await fetchJiraCloudflareWorkerUrl(meta);
        if (cf.ok) {
          cloudflareWorkerUrl = cf.url;
          console.log(
            `[autosetup] from Jira comments: cloudflareWorkerUrl=${cf.url}`
          );
        } else {
          console.warn(`[warn] Cloudflare Worker URL: ${cf.details}`);
        }
      }
      const metaResults = await applyMetaFields(rootPath, meta, {
        cloudflareWorkerUrl,
      });
      for (const [name, result] of metaResults) {
        console.log(`  - ${name}: ${result.details}${result.ok ? "" : " (warn)"}`);
      }
    }

    if (needAssets) {
      const resolved = await resolveAssets(meta);
      task = resolved.task;
      cleanup = resolved.cleanup;
    }

    const earlySteps = [];
    if (doKeystore) {
      earlySteps.push(["keystore", () => applyKeystore(rootPath, task.keystoreTar)]);
    }
    if (doGs) {
      earlySteps.push([
        "google-services",
        () => applyGoogleServices(rootPath, task.googleServices),
      ]);
    }
    if (doGame) earlySteps.push(["game", () => applyGame(rootPath, task.sourceZip)]);

    for (const [name, fn] of earlySteps) {
      process.stdout.write(`[autosetup] ${name}... `);
      const result = await fn();
      console.log(result.details || "ok");
    }

    if (doGame) {
      process.stdout.write("[autosetup] repair-imports... ");
      const repairResult = await repairImports({ projectRoot: rootPath });
      console.log(repairResult.details || "ok");
    }

    let check = { ok: true, checkedFiles: 0, problems: [] };
    if (doPaths) {
      process.stdout.write("[autosetup] path-check... ");
      check = await checkProjectPaths(rootPath);
      if (check.ok) {
        console.log(`ok (${check.checkedFiles} files)`);
      } else {
        console.log(`FOUND ${check.problems.length} broken refs:`);
        for (const p of check.problems) {
          console.log(`  - ${p.file} → ${p.ref}`);
        }
      }
    }

    let nativeCheck = { ok: true, problems: [] };
    if (doNativeCheck) {
      process.stdout.write("[autosetup] native-v2-check... ");
      nativeCheck = await checkNativeV2(rootPath);
      if (nativeCheck.ok) {
        console.log("ok");
      } else {
        console.log(`FOUND ${nativeCheck.problems.length} issue(s):`);
        for (const p of nativeCheck.problems) {
          console.log(`  - ${p}`);
        }
      }
    }

    if (doCfProtocol) {
      process.stdout.write("[autosetup] cf-protocol (wire surface)... ");
      const result = await rotateCfProtocol({ projectRoot: rootPath, meta });
      console.log(result.ok ? (result.regenerated ? "сгенерирован новый" : "применён из meta") : "FAIL");
      if (result.details) {
        for (const line of String(result.details).split("\n")) {
          console.log(`  ${line}`);
        }
      }
      if (!result.ok) {
        throw new Error(result.details || "cf-protocol failed");
      }
      // Persist the resolved values back to meta.json if newly generated,
      // so future autosetup runs are deterministic (no accidental re-rolls).
      if (result.regenerated && result.surface) {
        meta.cfProtocol = result.surface;
        await saveMeta(metaPath, meta);
        console.log("  meta.cfProtocol сохранён в meta.json");
      }
    }

    if (doRenameModules) {
      process.stdout.write("[autosetup] rename-modules... ");
      const result = await renameModules({ projectRoot: rootPath });
      console.log(result.ok ? "ok" : "FAIL");
      if (result.details) {
        for (const line of String(result.details).split("\n")) {
          console.log(`  ${line}`);
        }
      }
      if (!result.ok) {
        throw new Error(result.details || "rename-modules failed");
      }
    }

    if (doPadMethods) {
      process.stdout.write("[autosetup] pad-methods... ");
      const result = await padMethods({ projectRoot: rootPath });
      console.log(result.ok ? "ok" : "FAIL");
      if (result.details) {
        for (const line of String(result.details).split("\n")) {
          console.log(`  ${line}`);
        }
      }
      if (!result.ok) {
        throw new Error(result.details || "pad-methods failed");
      }
    }

    if (doRotate) {
      process.stdout.write("[autosetup] rotate encryption (AES-256-GCM)... ");
      const result = await rotateProjectEncryption({ projectRoot: rootPath });
      console.log(result.details || "ok");
      if (!result.ok) {
        throw new Error(result.details);
      }

      // Rotation changed the key — re-encrypt the CF URL (if we have it in
      // Jira) under the new key so the worker and native stay in sync.
      if (isJiraConfigured(meta)) {
        process.stdout.write("[autosetup] worker url (re-encrypt)... ");
        const worker = await fetchJiraCloudflareWorkerUrl(meta);
        if (!worker.ok) {
          console.warn(worker.details || "не найден");
        } else {
          const relink = await applyCloudflareWorkerLink(rootPath, worker.url);
          console.log(relink.details || "ok");
          if (!relink.ok) {
            throw new Error(relink.details);
          }
        }
      }
    }

    if (doClean) {
      process.stdout.write("[autosetup] clean-android... ");
      const result = await cleanAndroidBuilds(rootPath);
      console.log(result.details || "ok");
    }

    if (doNpm && (only || (!args.assetsOnly && meta?.npmInstall !== false))) {
      if (
        only?.has("npm") ||
        (!only && !args.assetsOnly && !args.skipNpm && meta?.npmInstall !== false)
      ) {
        console.log("[autosetup] npm install...");
        await runNpmInstall(rootPath);
      }
    } else if (
      !only &&
      (args.assetsOnly || args.skipNpm || meta?.npmInstall === false)
    ) {
      console.log("[autosetup] npm install skipped");
    }

    const tailMeta = await loadMeta(metaPath).catch(() => meta);
    const doTail = only
      ? TAIL_STEPS.some((step) => only.has(step))
      : !args.assetsOnly && !args.checklistOnly && !args.skipTail && tailMeta?.skipTail !== true;
    let tailWarnings = [];
    if (doTail) {
      const tail = await runFinishExtras(rootPath, tailMeta || meta, { only: only || null });
      tailWarnings = tail.warnings || [];
    }

    if (doSummary && !args.assetsOnly) {
      if (!enc) {
        const prepared = await prepareMeta(rootPath, metaPath, {
          requireMetaFields: true,
        });
        meta = prepared.meta;
        enc = prepared.enc;
      }
      printDoneSummary(meta, {
        rootPath,
        encryptionMode: enc.mode,
        warnings: tailWarnings,
      });
    } else if (tailWarnings.length) {
      console.log("");
      printWarningReport(tailWarnings);
    }

    if (doPaths && !check.ok) {
      process.exitCode = 2;
    }
    if (doNativeCheck && !nativeCheck.ok) {
      process.exitCode = 2;
    }
  } finally {
    await cleanup().catch(() => {});
  }
}

main().catch((err) => {
  console.error(`[autosetup] ERROR: ${err.message || err}`);
  process.exit(1);
});
