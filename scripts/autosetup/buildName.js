const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Same naming as RN App Helper:
 * "Pulse Road (2999 v8 rmsBV)" + versionCode 1 → "Pulse Road - 2999 (1залив)"
 * versionCode 2 → "Pulse Road - 2999 (2 апдейт)"
 */
function buildProjectReleaseName(folderName, versionCode) {
  const match = String(folderName || "").match(/^(.+?)\s*\((\d+)\b/);
  if (!match) {
    return {
      ok: false,
      title: "Не удалось разобрать имя папки",
      details: "Ожидается формат вроде: Pulse Road (2999 v8 rmsBV)",
    };
  }
  const appName = match[1].trim();
  const projectId = match[2];
  const version = Number.parseInt(String(versionCode ?? "").trim(), 10);
  if (!Number.isFinite(version) || version < 1) {
    return {
      ok: false,
      title: "Неверный versionCode",
      details: "Нужен целый versionCode >= 1 из android/app/build.gradle.",
    };
  }
  const suffix = version === 1 ? "1залив" : `${version} апдейт`;
  return {
    ok: true,
    buildName: `${appName} - ${projectId} (${suffix})`,
    appName,
    projectId,
    versionCode: version,
  };
}

async function readVersionCode(rootPath) {
  const gradlePath = path.join(rootPath, "android", "app", "build.gradle");
  const gradle = await fs.readFile(gradlePath, "utf8");
  const m = gradle.match(/versionCode\s+(\d+)/);
  return m ? m[1] : "";
}

async function resolveBuildName(rootPath, versionCodeOverride, meta = {}) {
  const versionCode =
    versionCodeOverride != null && String(versionCodeOverride).trim() !== ""
      ? versionCodeOverride
      : await readVersionCode(rootPath);
  const fromFolder = buildProjectReleaseName(path.basename(rootPath), versionCode);
  if (fromFolder.ok) return fromFolder;

  const appName = String(meta.appName || "").trim();
  const projectId = String(meta.jiraIssue || "").replace(/\D/g, "");
  if (appName && projectId) {
    return buildProjectReleaseName(`${appName} (${projectId})`, versionCode);
  }
  return fromFolder;
}

module.exports = {
  buildProjectReleaseName,
  readVersionCode,
  resolveBuildName,
};
