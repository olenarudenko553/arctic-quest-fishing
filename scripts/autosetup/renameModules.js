/**
 * Rename all native module classes and their JS-visible module names.
 *
 * On each autosetup run:
 *   - Each class (Bakovitufore, Rumokuroh, etc.) gets a new random class name
 *   - Each module getName() return value (Zunahoquve, Rinaqahelo, etc.) gets a
 *     new random name that JS code uses via NativeModules.Name
 *
 * Patches:
 *   - android/.../modules/*.kt and *.java  (class decl + getName() value)
 *   - android/.../SModuleRegistry.kt       (imports + listOf instantiations)
 *   - Layouts/Game/ TS/JS files            (NativeModules.OldName references)
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

// ---------- Random pronounceable identifier ----------

const VOWELS = "aeiou";
const CONSONANTS = "bcdfgjklmnpqrstvwxyz";

function pickByte() {
  return crypto.randomBytes(1)[0];
}

function pickFrom(alphabet) {
  return alphabet[pickByte() % alphabet.length];
}

function randomWord(length) {
  let out = "";
  const startConsonant = (pickByte() & 1) === 0;
  for (let i = 0; i < length; i++) {
    const useConsonant = startConsonant ? i % 2 === 0 : i % 2 === 1;
    out += pickFrom(useConsonant ? CONSONANTS : VOWELS);
  }
  return out;
}

function randomInRange(min, max) {
  return min + (pickByte() % (max - min + 1));
}

function randomIdentifier() {
  const word = randomWord(randomInRange(8, 14));
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ---------- File helpers ----------

async function safeRead(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function findAndroidSource(rootPath, filename) {
  const base = path.join(rootPath, "android", "app", "src", "main", "java");
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const hit = await walk(full);
        if (hit) return hit;
      } else if (e.name === filename) {
        return full;
      }
    }
    return null;
  }
  return walk(base);
}

async function collectTsJsFiles(dir) {
  const files = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

// ---------- Source patching ----------

/**
 * Extract the string returned by getName(). Works for both single-line Kotlin
 * (`= "Name"`) and block-style Kotlin/Java (`return "Name"`).
 */
function extractModuleName(src) {
  const idx = src.indexOf("getName()");
  if (idx < 0) return null;
  const after = src.slice(idx);
  const m = /"([^"]+)"/.exec(after);
  return m ? m[1] : null;
}

/**
 * Replace the class declaration (and Java constructor name) in a module file.
 */
function patchClassName(src, oldName, newName, ext) {
  if (ext === ".kt") {
    return src.replace(new RegExp(`\\bclass\\s+${oldName}\\b`), `class ${newName}`);
  }
  // Java: patch class declaration and constructor (constructors share the class name)
  let result = src.replace(
    new RegExp(`\\bpublic\\s+class\\s+${oldName}\\b`),
    `public class ${newName}`
  );
  result = result.replace(
    new RegExp(`\\bpublic\\s+${oldName}\\s*\\(`),
    `public ${newName}(`
  );
  return result;
}

/**
 * Replace the string literal returned by getName() without touching anything
 * else in the file.
 */
function patchModuleName(src, oldModName, newModName) {
  const idx = src.indexOf("getName()");
  if (idx < 0) return src;
  const before = src.slice(0, idx);
  const after = src.slice(idx).replace(`"${oldModName}"`, `"${newModName}"`);
  return before + after;
}

// ---------- Entry point ----------

async function renameModules({ projectRoot }) {
  const sModRegPath = await findAndroidSource(projectRoot, "SModuleRegistry.kt");
  if (!sModRegPath) {
    return { ok: false, details: "SModuleRegistry.kt не найден" };
  }

  const sModSrc = await safeRead(sModRegPath);
  if (!sModSrc) {
    return { ok: false, details: "SModuleRegistry.kt не прочитан" };
  }

  // Extract imported class names
  const importRe = /import\s+[\w.]+\.modules\.(\w+)/g;
  const classNames = [];
  let m;
  while ((m = importRe.exec(sModSrc)) !== null) {
    classNames.push(m[1]);
  }

  if (classNames.length === 0) {
    return { ok: false, details: "Нет импортов модулей в SModuleRegistry.kt" };
  }

  const modulesDirPath = path.join(path.dirname(sModRegPath), "modules");

  // Gather info and generate new names
  const renames = [];
  for (const oldClassName of classNames) {
    let filePath = path.join(modulesDirPath, oldClassName + ".kt");
    let ext = ".kt";
    let fileSrc = await safeRead(filePath);
    if (fileSrc == null) {
      filePath = path.join(modulesDirPath, oldClassName + ".java");
      ext = ".java";
      fileSrc = await safeRead(filePath);
    }
    if (fileSrc == null) {
      return {
        ok: false,
        details: `Файл модуля ${oldClassName}.kt/.java не найден в ${modulesDirPath}`,
      };
    }

    const oldModuleName = extractModuleName(fileSrc);
    if (!oldModuleName) {
      return {
        ok: false,
        details: `Не удалось извлечь getName() из ${oldClassName}${ext}`,
      };
    }

    renames.push({
      oldClassName,
      newClassName: randomIdentifier(),
      oldModuleName,
      newModuleName: randomIdentifier(),
      ext,
      filePath,
      fileSrc,
    });
  }

  const writtenFiles = [];

  // Patch and rename each module file
  for (const r of renames) {
    let src = r.fileSrc;
    src = patchClassName(src, r.oldClassName, r.newClassName, r.ext);
    src = patchModuleName(src, r.oldModuleName, r.newModuleName);

    const newFilePath = path.join(modulesDirPath, r.newClassName + r.ext);
    await fs.writeFile(newFilePath, src, "utf8");
    writtenFiles.push(path.relative(projectRoot, newFilePath).replace(/\\/g, "/"));

    if (r.newClassName !== r.oldClassName) {
      await fs.unlink(r.filePath);
    }
  }

  // Patch SModuleRegistry.kt — imports and instantiations
  let sModNew = sModSrc;
  for (const r of renames) {
    sModNew = sModNew.replace(
      new RegExp(`(import [\\w.]+\\.modules\\.)${r.oldClassName}\\b`),
      `$1${r.newClassName}`
    );
    sModNew = sModNew.replace(
      new RegExp(`\\b${r.oldClassName}\\(reactContext\\)`),
      `${r.newClassName}(reactContext)`
    );
  }
  if (sModNew !== sModSrc) {
    await fs.writeFile(sModRegPath, sModNew, "utf8");
    writtenFiles.push(
      path.relative(projectRoot, sModRegPath).replace(/\\/g, "/")
    );
  }

  // Patch NativeModules references in Layouts/Game/
  const layoutsGameDir = path.join(projectRoot, "Layouts", "Game");
  const tsFiles = await collectTsJsFiles(layoutsGameDir);

  for (const tsFile of tsFiles) {
    let src = await safeRead(tsFile);
    if (!src) continue;

    let changed = false;
    for (const r of renames) {
      const next = src
        .replace(
          new RegExp(`NativeModules\\.${r.oldModuleName}\\b`, "g"),
          `NativeModules.${r.newModuleName}`
        )
        .replace(
          new RegExp(`NativeModules\\['${r.oldModuleName}'\\]`, "g"),
          `NativeModules['${r.newModuleName}']`
        )
        .replace(
          new RegExp(`NativeModules\\["${r.oldModuleName}"\\]`, "g"),
          `NativeModules["${r.newModuleName}"]`
        );
      if (next !== src) {
        src = next;
        changed = true;
      }
    }

    if (changed) {
      await fs.writeFile(tsFile, src, "utf8");
      writtenFiles.push(
        path.relative(projectRoot, tsFile).replace(/\\/g, "/")
      );
    }
  }

  const summary = renames
    .map((r) => `${r.oldClassName}→${r.newClassName} (${r.oldModuleName}→${r.newModuleName})`)
    .join(", ");

  return {
    ok: true,
    details: `${renames.length} модулей: ${summary}\n  files: ${writtenFiles.join(", ")}`,
    renames,
  };
}

module.exports = { renameModules };
