/**
 * repairImports — post-game fixups that prevent runtime crashes
 *
 * 1. getName() drift: after rename-modules, native modules may have random
 *    getName() values that no longer match NativeModules.Xxx references in TS.
 *    Scan TS for required module names, cross-reference by @ReactMethod method
 *    names, patch mismatched getName() in native files.
 *
 * 2. theme import: obfuscation sometimes drops `theme` from the destructured
 *    import in AppScreens.styles.ts / AppUI.styles.ts while the code still
 *    calls theme.xxx — add it back automatically.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

// ---------- helpers ----------

function extractGetName(src) {
  let m = /override\s+fun\s+getName\s*\(\s*\)\s*(?::\s*String\s*)?=\s*"([^"]+)"/.exec(src);
  if (m) return m[1];
  m = /override\s+fun\s+getName\s*\(\s*\)[\s\S]{0,120}?return\s+"([^"]+)"/.exec(src);
  if (m) return m[1];
  m = /public\s+String\s+getName\s*\(\s*\)[\s\S]{0,120}?return\s+"([^"]+)"/.exec(src);
  if (m) return m[1];
  return null;
}

function extractReactMethods(src) {
  const methods = new Set();
  for (const m of src.matchAll(/@ReactMethod[\s\S]{0,80}?(?:fun\s+|void\s+|public\s+\w+\s+)(\w+)\s*\(/g)) {
    if (m[1] !== "void" && m[1] !== "String" && m[1] !== "fun") methods.add(m[1]);
  }
  return methods;
}

function patchGetName(src, newName) {
  let next = src.replace(
    /(override\s+fun\s+getName\s*\(\s*\)\s*(?::\s*String\s*)?=\s*)"[^"]+"/,
    `$1"${newName}"`
  );
  if (next !== src) return next;
  next = src.replace(
    /(override\s+fun\s+getName\s*\(\s*\)[\s\S]{0,120}?return\s+)"[^"]+"/,
    `$1"${newName}"`
  );
  if (next !== src) return next;
  next = src.replace(
    /(public\s+String\s+getName\s*\(\s*\)[\s\S]{0,120}?return\s+)"[^"]+"/,
    `$1"${newName}"`
  );
  return next;
}

/** Map: moduleName → Set<methodName called on it in TS */
function extractTsModuleRefs(src) {
  const refs = new Map();
  // NativeModules.Xxx.method(
  for (const m of src.matchAll(/NativeModules\.([A-Z]\w+)\.(\w+)\s*\(/g)) {
    if (!refs.has(m[1])) refs.set(m[1], new Set());
    refs.get(m[1]).add(m[2]);
  }
  // NativeModules.Xxx (bare reference — variable assignment etc.)
  for (const m of src.matchAll(/NativeModules\.([A-Z]\w+)\b/g)) {
    if (!refs.has(m[1])) refs.set(m[1], new Set());
  }
  // const { Xxx } = NativeModules (destructuring)
  for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*NativeModules/g)) {
    for (const name of m[1].split(",").map(s => s.trim()).filter(s => /^[A-Z]/.test(s))) {
      if (!refs.has(name)) refs.set(name, new Set());
    }
  }
  return refs;
}

async function walkTs(rootPath) {
  const dir = path.join(rootPath, "Layouts", "Game");
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() && /\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts")) {
        files.push(path.join(dir, e.name));
      }
    }
  } catch {}
  return files;
}

async function walkAndroid(rootPath) {
  const base = path.join(rootPath, "android", "app", "src", "main", "java");
  const files = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.(kt|java)$/.test(e.name)) files.push(full);
    }
  }
  await walk(base);
  return files;
}

// ---------- 1. getName() repair ----------

async function repairGetName(rootPath) {
  const fixes = [];

  // Collect required module names from TS
  const tsFiles = await walkTs(rootPath);
  const required = new Map(); // moduleName → Set<methodName>
  for (const file of tsFiles) {
    let src;
    try { src = await fs.readFile(file, "utf8"); } catch { continue; }
    for (const [mod, methods] of extractTsModuleRefs(src)) {
      if (!required.has(mod)) required.set(mod, new Set());
      for (const m of methods) required.get(mod).add(m);
    }
  }
  if (required.size === 0) return fixes;

  // Collect native module info
  const nativeFiles = await walkAndroid(rootPath);
  const natives = [];
  for (const filePath of nativeFiles) {
    let src;
    try { src = await fs.readFile(filePath, "utf8"); } catch { continue; }
    const registeredName = extractGetName(src);
    if (!registeredName) continue;
    natives.push({ filePath, src, registeredName, methods: extractReactMethods(src) });
  }

  const registeredNames = new Set(natives.map(n => n.registeredName));

  for (const [requiredName, requiredMethods] of required) {
    if (registeredNames.has(requiredName)) continue;

    // Find best native match by method intersection
    let best = null;
    let bestScore = 0;
    for (const native of natives) {
      let score = 0;
      for (const m of requiredMethods) {
        if (native.methods.has(m)) score++;
      }
      if (score > bestScore) { bestScore = score; best = native; }
    }

    if (!best || bestScore === 0) {
      fixes.push(`WARN: NativeModules.${requiredName} — нет совпадения по @ReactMethod, пропуск`);
      continue;
    }

    const oldName = best.registeredName;
    const patched = patchGetName(best.src, requiredName);
    if (patched === best.src) {
      fixes.push(`WARN: NativeModules.${requiredName} — не удалось пропатчить getName() в ${path.basename(best.filePath)}`);
      continue;
    }

    await fs.writeFile(best.filePath, patched, "utf8");
    fixes.push(`${path.basename(best.filePath)}: getName() "${oldName}" → "${requiredName}"`);
    best.src = patched;
    best.registeredName = requiredName;
    registeredNames.delete(oldName);
    registeredNames.add(requiredName);
  }

  return fixes;
}

// ---------- 2. theme import repair ----------

async function repairThemeImports(rootPath) {
  const styleFiles = [
    path.join(rootPath, "Layouts", "Game", "AppScreens.styles.ts"),
    path.join(rootPath, "Layouts", "Game", "AppUI.styles.ts"),
  ];
  const fixes = [];

  for (const file of styleFiles) {
    let src;
    try { src = await fs.readFile(file, "utf8"); } catch { continue; }
    if (!/\btheme\./.test(src)) continue;

    const importRe = /(import\s*\{)([^}]+)(\}\s*from\s*['"]\.\/AppResources['"])/;
    const m = importRe.exec(src);
    if (!m) continue;
    if (/\btheme\b/.test(m[2])) continue;

    const patched = src.replace(importRe, `$1${m[2].trimEnd()}, theme$3`);
    if (patched === src) continue;

    await fs.writeFile(file, patched, "utf8");
    fixes.push(`${path.basename(file)}: добавлен theme в import`);
  }

  return fixes;
}

// ---------- entry ----------

async function repairImports({ projectRoot }) {
  const all = [];

  const nameFixes = await repairGetName(projectRoot);
  all.push(...nameFixes);

  const themeFixes = await repairThemeImports(projectRoot);
  all.push(...themeFixes);

  return {
    ok: true,
    details: all.length > 0 ? all.join("; ") : "без изменений",
  };
}

module.exports = { repairImports };
