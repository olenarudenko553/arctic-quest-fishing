const fs = require("node:fs/promises");
const path = require("node:path");
const { safeStat, isAutosetupSplitPart } = require("./fsUtils");

async function listServiceTs(rootPath) {
  const dir = path.join(rootPath, "services");
  if (!(await safeStat(dir))) return [];
  const entries = await fs.readdir(dir);
  return entries
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .map((name) => path.join(dir, name));
}

async function findServiceByContent(rootPath, test) {
  for (const filePath of await listServiceTs(rootPath)) {
    let src = "";
    try {
      src = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    if (isAutosetupSplitPart(src)) continue;
    if (test(src, path.basename(filePath))) return filePath;
  }
  return null;
}

async function findUtilService(rootPath) {
  return (
    (await findServiceByContent(
      rootPath,
      (src) => /export\s+class\s+Utils\b/.test(src)
    )) || null
  );
}

async function findOfferResolve(rootPath) {
  return findServiceByContent(
    rootPath,
    (src, name) =>
      /OfferResolve/i.test(name) ||
      (/redirectUrlInitial/.test(src) && /SendInitPayload/.test(src))
  );
}

module.exports = {
  listServiceTs,
  findServiceByContent,
  findUtilService,
  findOfferResolve,
};
