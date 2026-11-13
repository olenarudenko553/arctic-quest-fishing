/**
 * Inject a random block of private dummy methods into each native module file.
 *
 * On every autosetup run the existing block (bounded by autopad markers) is
 * replaced with 3-8 freshly generated methods, changing the class structure
 * without touching any real logic.
 *
 * Supports .kt and .java module files.
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

// ---------- RNG helpers ----------

function pickByte() {
  return crypto.randomBytes(1)[0];
}

function pickFrom(arr) {
  return arr[pickByte() % arr.length];
}

function randomInRange(min, max) {
  return min + (pickByte() % (max - min + 1));
}

function randomWord(length) {
  const VOWELS = "aeiou";
  const CONS = "bcdfgjklmnpqrstvwxyz";
  const startCons = (pickByte() & 1) === 0;
  let out = "";
  for (let i = 0; i < length; i++) {
    const useCons = startCons ? i % 2 === 0 : i % 2 === 1;
    out += pickFrom(useCons ? CONS : VOWELS);
  }
  return out;
}

function randomMethodName() {
  const w = randomWord(randomInRange(6, 12));
  return w[0].toLowerCase() + w.slice(1);
}

// ---------- Method generators ----------

const KT_TYPES    = ["Unit", "Int", "String", "Boolean", "Long", "Float", "Double"];
const KT_P_TYPES  = ["Int", "String", "Boolean", "Long", "Float"];
const JAVA_TYPES  = ["void", "int", "String", "boolean", "long", "float"];
const JAVA_P_TYPES = ["int", "String", "boolean", "long"];

/** Random Kotlin literal for the given type */
function ktLit(type) {
  switch (type) {
    case "Int":     return String(pickByte() % 256 + 1);
    case "String":  return `"${randomWord(randomInRange(3, 8))}"`;
    case "Boolean": return (pickByte() & 1) ? "true" : "false";
    case "Long":    return `${pickByte() * 251 + pickByte() + 1}L`;
    case "Float":   return `${(pickByte() / 255 + 0.01).toFixed(4)}f`;
    case "Double":  return `${(pickByte() / 255 + 0.001).toFixed(6)}`;
    default:        return "null";
  }
}

/** Random Java literal for the given type */
function jLit(type) {
  switch (type) {
    case "int":     return String(pickByte() % 256 + 1);
    case "String":  return `"${randomWord(randomInRange(3, 8))}"`;
    case "boolean": return (pickByte() & 1) ? "true" : "false";
    case "long":    return `${pickByte() * 251 + pickByte() + 1}L`;
    case "float":   return `${(pickByte() / 255 + 0.01).toFixed(4)}f`;
    default:        return "null";
  }
}

/** Build a random parameter list (0–3 params) for Kotlin */
function ktParams() {
  const n = pickByte() % 4; // 0..3
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(`${randomMethodName()}: ${pickFrom(KT_P_TYPES)}`);
  return parts.join(", ");
}

/** Build a random parameter list (0–3 params) for Java */
function jParams() {
  const n = pickByte() % 4; // 0..3
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(`${pickFrom(JAVA_P_TYPES)} ${randomMethodName()}`);
  return parts.join(", ");
}

/**
 * Kotlin: pick one of 7 structural templates at random.
 * Uses 4-space indent for the method, 8-space for body.
 */
function generateKotlinMethod(name) {
  const retType = pickFrom(KT_TYPES);
  const params  = ktParams();
  const v1 = randomMethodName();
  const v2 = randomMethodName();
  const n1 = pickByte() % 100 + 1;
  const n2 = pickByte() % 100 + 1;

  if (retType === "Unit") {
    const tpl = pickByte() % 4;
    switch (tpl) {
      case 0: // empty body
        return `    private fun ${name}(${params}) {}`;
      case 1: { // local val, no return
        const vt = pickFrom(["Int", "Long", "Boolean"]);
        return [
          `    private fun ${name}(${params}) {`,
          `        val ${v1}: ${vt} = ${ktLit(vt)}`,
          `    }`,
        ].join("\n");
      }
      case 2: { // local val + if-guard
        return [
          `    private fun ${name}(${params}) {`,
          `        val ${v1} = ${n1}`,
          `        if (${v1} > ${n2}) return`,
          `    }`,
        ].join("\n");
      }
      case 3: { // two local vals
        const vt1 = pickFrom(["Int", "Long"]);
        const vt2 = pickFrom(["Boolean", "String"]);
        return [
          `    private fun ${name}(${params}) {`,
          `        val ${v1}: ${vt1} = ${ktLit(vt1)}`,
          `        val ${v2}: ${vt2} = ${ktLit(vt2)}`,
          `    }`,
        ].join("\n");
      }
    }
  }

  // Non-Unit: 7 templates
  const tpl = pickByte() % 7;
  switch (tpl) {
    case 0: // expression function
      return `    private fun ${name}(${params}): ${retType} = ${ktLit(retType)}`;

    case 1: { // simple block return
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        return ${ktLit(retType)}`,
        `    }`,
      ].join("\n");
    }

    case 2: { // val + return val
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        val ${v1}: ${retType} = ${ktLit(retType)}`,
        `        return ${v1}`,
        `    }`,
      ].join("\n");
    }

    case 3: { // var + reassign + return
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        var ${v1}: ${retType} = ${ktLit(retType)}`,
        `        ${v1} = ${ktLit(retType)}`,
        `        return ${v1}`,
        `    }`,
      ].join("\n");
    }

    case 4: { // if-else with literal arms
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        val ${v1} = ${n1}`,
        `        return if (${v1} > ${n2}) ${ktLit(retType)} else ${ktLit(retType)}`,
        `    }`,
      ].join("\n");
    }

    case 5: { // when-style (Boolean only), else fallback expression
      if (retType === "Boolean") {
        return [
          `    private fun ${name}(${params}): Boolean {`,
          `        val ${v1} = ${n1}`,
          `        return when {`,
          `            ${v1} > ${n2} -> true`,
          `            else -> false`,
          `        }`,
          `    }`,
        ].join("\n");
      }
      // fallback: simple val + return
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        val ${v1}: ${retType} = ${ktLit(retType)}`,
        `        return ${v1}`,
        `    }`,
      ].join("\n");
    }

    case 6: { // two locals, return second
      const interim = pickFrom(["Int", "Long"]);
      return [
        `    private fun ${name}(${params}): ${retType} {`,
        `        val ${v1}: ${interim} = ${ktLit(interim)}`,
        `        val ${v2}: ${retType} = ${ktLit(retType)}`,
        `        return ${v2}`,
        `    }`,
      ].join("\n");
    }

    default:
      return `    private fun ${name}(${params}): ${retType} = ${ktLit(retType)}`;
  }
}

/**
 * Java: pick one of 6 structural templates at random.
 */
function generateJavaMethod(name) {
  const retType = pickFrom(JAVA_TYPES);
  const params  = jParams();
  const v1 = randomMethodName();
  const v2 = randomMethodName();
  const n1 = pickByte() % 100 + 1;
  const n2 = pickByte() % 100 + 1;

  if (retType === "void") {
    const tpl = pickByte() % 3;
    switch (tpl) {
      case 0:
        return `    private void ${name}(${params}) {}`;
      case 1:
        return [
          `    private void ${name}(${params}) {`,
          `        int ${v1} = ${n1};`,
          `    }`,
        ].join("\n");
      case 2:
        return [
          `    private void ${name}(${params}) {`,
          `        int ${v1} = ${n1};`,
          `        if (${v1} > ${n2}) return;`,
          `    }`,
        ].join("\n");
    }
  }

  const tpl = pickByte() % 6;
  switch (tpl) {
    case 0: // single-line
      return `    private ${retType} ${name}(${params}) { return ${jLit(retType)}; }`;

    case 1: { // block return
      return [
        `    private ${retType} ${name}(${params}) {`,
        `        return ${jLit(retType)};`,
        `    }`,
      ].join("\n");
    }

    case 2: { // local var + return
      return [
        `    private ${retType} ${name}(${params}) {`,
        `        ${retType} ${v1} = ${jLit(retType)};`,
        `        return ${v1};`,
        `    }`,
      ].join("\n");
    }

    case 3: { // local + reassign + return
      return [
        `    private ${retType} ${name}(${params}) {`,
        `        ${retType} ${v1} = ${jLit(retType)};`,
        `        ${v1} = ${jLit(retType)};`,
        `        return ${v1};`,
        `    }`,
      ].join("\n");
    }

    case 4: { // if-else
      return [
        `    private ${retType} ${name}(${params}) {`,
        `        int ${v1} = ${n1};`,
        `        if (${v1} > ${n2}) {`,
        `            return ${jLit(retType)};`,
        `        }`,
        `        return ${jLit(retType)};`,
        `    }`,
      ].join("\n");
    }

    case 5: { // two locals
      return [
        `    private ${retType} ${name}(${params}) {`,
        `        int ${v1} = ${n1};`,
        `        ${retType} ${v2} = ${jLit(retType)};`,
        `        return ${v2};`,
        `    }`,
      ].join("\n");
    }

    default:
      return `    private ${retType} ${name}(${params}) { return ${jLit(retType)}; }`;
  }
}

// ---------- TypeScript function generators ----------

const TS_RET_TYPES = ["number", "string", "boolean", "void"];
const TS_P_TYPES   = ["number", "string", "boolean"];

function tsLit(type) {
  switch (type) {
    case "number":  return String(pickByte() % 256 + 1);
    case "string":  return `"${randomWord(randomInRange(3, 8))}"`;
    case "boolean": return (pickByte() & 1) ? "true" : "false";
    default:        return "undefined";
  }
}

function tsParams() {
  const n = pickByte() % 4;
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(`_${randomMethodName()}: ${pickFrom(TS_P_TYPES)}`);
  return parts.join(", ");
}

function generateTsFunction(name) {
  const retType = pickFrom(TS_RET_TYPES);
  const params  = tsParams();
  const v1 = randomMethodName();
  const v2 = randomMethodName();
  const n1 = pickByte() % 100 + 1;
  const n2 = pickByte() % 100 + 1;

  if (retType === "void") {
    const tpl = pickByte() % 3;
    switch (tpl) {
      case 0:
        return `function ${name}(${params}): void {}`;
      case 1:
        return [
          `function ${name}(${params}): void {`,
          `  const ${v1} = ${n1};`,
          `  if (${v1} > ${n2}) return;`,
          `}`,
        ].join("\n");
      case 2: {
        const vt = pickFrom(["number", "boolean"]);
        return [
          `function ${name}(${params}): void {`,
          `  const ${v1}: ${vt} = ${tsLit(vt)};`,
          `}`,
        ].join("\n");
      }
    }
  }

  const tpl = pickByte() % 6;
  switch (tpl) {
    case 0:
      return `function ${name}(${params}): ${retType} { return ${tsLit(retType)}; }`;
    case 1:
      return [
        `function ${name}(${params}): ${retType} {`,
        `  return ${tsLit(retType)};`,
        `}`,
      ].join("\n");
    case 2:
      return [
        `function ${name}(${params}): ${retType} {`,
        `  const ${v1}: ${retType} = ${tsLit(retType)};`,
        `  return ${v1};`,
        `}`,
      ].join("\n");
    case 3:
      return [
        `function ${name}(${params}): ${retType} {`,
        `  let ${v1}: ${retType} = ${tsLit(retType)};`,
        `  ${v1} = ${tsLit(retType)};`,
        `  return ${v1};`,
        `}`,
      ].join("\n");
    case 4:
      return [
        `function ${name}(${params}): ${retType} {`,
        `  const ${v1} = ${n1};`,
        `  return ${v1} > ${n2} ? ${tsLit(retType)} : ${tsLit(retType)};`,
        `}`,
      ].join("\n");
    case 5:
      return [
        `function ${name}(${params}): ${retType} {`,
        `  const ${v1} = ${n1};`,
        `  const ${v2}: ${retType} = ${tsLit(retType)};`,
        `  return ${v2};`,
        `}`,
      ].join("\n");
    default:
      return `function ${name}(${params}): ${retType} { return ${tsLit(retType)}; }`;
  }
}

// ---------- Pad-block injection ----------

const PAD_BEGIN = "    /* autopad-begin */";
const PAD_END = "    /* autopad-end */";
const PAD_RE = /[ \t]*\/\* autopad-begin \*\/[\s\S]*?\/\* autopad-end \*\/\n?/;

function buildPadBlock(methods) {
  return [PAD_BEGIN, ...methods, PAD_END].join("\n") + "\n";
}

// ---------- Class body brace locator ----------

/**
 * Walk the source from the first class/object declaration, count balanced
 * braces (skipping strings and comments), and return the index of the
 * matching closing '}' — the class-level boundary.
 *
 * This handles files with top-level helper functions after the class (which
 * have their own column-0 '}' that would fool a simple lastIndexOf search).
 */
function findClassBodyClose(src) {
  const classMatch = /(^|\n)((?:abstract\s+|open\s+|sealed\s+|data\s+)?(?:class|object))\s+\w/.exec(src);
  if (!classMatch) return -1;

  let i = classMatch.index + classMatch[0].length;

  // Skip to the opening brace of the class body
  while (i < src.length && src[i] !== "{") i++;
  if (i >= src.length) return -1;

  let depth = 0;

  while (i < src.length) {
    const c = src[i];

    // Line comment
    if (c === "/" && src[i + 1] === "/") {
      i += 2;
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }

    // Block comment
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // Triple-quoted string
    if (c === '"' && src[i + 1] === '"' && src[i + 2] === '"') {
      i += 3;
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"' && src[i + 2] === '"') { i += 3; break; }
        i++;
      }
      continue;
    }

    // Regular string
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"' && src[i] !== "\n") {
        if (src[i] === "\\") i++;
        i++;
      }
      if (src[i] === '"') i++;
      continue;
    }

    if (c === "{") { depth++; i++; continue; }
    if (c === "}") {
      depth--;
      if (depth === 0) return i;
      i++;
      continue;
    }

    i++;
  }

  return -1;
}

function buildTsPadBlock(methods) {
  return "/* autopad-begin */\n" + methods.join("\n") + "\n/* autopad-end */\n";
}

function injectTsPad(src, padBlock) {
  if (PAD_RE.test(src)) return src.replace(PAD_RE, padBlock);
  return src.trimEnd() + "\n\n" + padBlock;
}

function injectPad(src, padBlock, ext) {
  // Always strip first — may be misplaced from a previous buggy run.
  const base = PAD_RE.test(src) ? src.replace(PAD_RE, "") : src;

  // Kotlin: preferred anchor — companion object boundary
  if (ext === ".kt") {
    const compIdx = base.lastIndexOf("\n    companion object");
    if (compIdx >= 0) {
      return base.slice(0, compIdx + 1) + padBlock + base.slice(compIdx + 1);
    }
  }

  // Use brace counting to find the actual class/object closing brace.
  // This correctly handles files with top-level helper functions after the
  // class — those also have column-0 '}' but would fool a simple search.
  const closePos = findClassBodyClose(base);
  if (closePos >= 0) {
    const before = base.slice(0, closePos);
    const sep = before.endsWith("\n") ? "" : "\n";
    return before + sep + padBlock + base.slice(closePos);
  }

  // Final fallback
  const lastBrace = base.lastIndexOf("}");
  if (lastBrace >= 0) {
    return base.slice(0, lastBrace) + padBlock + base.slice(lastBrace);
  }

  return base + "\n" + padBlock;
}

// ---------- File discovery ----------

async function safeRead(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

async function walkAllJavaFiles(dir) {
  const results = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...await walkAllJavaFiles(full));
    } else if (/\.(kt|java)$/.test(e.name)) {
      results.push(full);
    }
  }
  return results;
}

async function walkAllTsFiles(dir) {
  const results = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "assets") continue;
      results.push(...await walkAllTsFiles(full));
    } else if (/\.(tsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

// ---------- Entry point ----------

async function padMethods({ projectRoot }) {
  const javaBase = path.join(projectRoot, "android", "app", "src", "main", "java");
  const tsBase   = path.join(projectRoot, "Layouts", "Game");

  const allJavaFiles = await walkAllJavaFiles(javaBase);
  const allTsFiles   = await walkAllTsFiles(tsBase);

  if (allJavaFiles.length === 0 && allTsFiles.length === 0) {
    return { ok: false, details: "Нет .kt/.java/.ts/.tsx файлов" };
  }

  const patched = [];

  for (const filePath of allJavaFiles) {
    const src = await safeRead(filePath);
    if (!src) continue;

    // Skip files with no class or object body (e.g. pure interface files)
    if (!/\b(class|object)\s+\w/.test(src)) continue;

    const ext = filePath.endsWith(".kt") ? ".kt" : ".java";
    const count = randomInRange(3, 20);
    const methods = [];
    for (let i = 0; i < count; i++) {
      const name = randomMethodName();
      methods.push(ext === ".kt" ? generateKotlinMethod(name) : generateJavaMethod(name));
    }

    const padBlock = buildPadBlock(methods);
    const newSrc = injectPad(src, padBlock, ext);
    if (newSrc !== src) {
      await fs.writeFile(filePath, newSrc, "utf8");
      const rel = path.relative(projectRoot, filePath).replace(/\\/g, "/");
      patched.push(`${rel} (${count})`);
    }
  }

  for (const filePath of allTsFiles) {
    const src = await safeRead(filePath);
    if (!src) continue;

    const count = randomInRange(3, 20);
    const methods = [];
    for (let i = 0; i < count; i++) methods.push(generateTsFunction(randomMethodName()));

    const padBlock = buildTsPadBlock(methods);
    const newSrc = injectTsPad(src, padBlock);
    if (newSrc !== src) {
      await fs.writeFile(filePath, newSrc, "utf8");
      const rel = path.relative(projectRoot, filePath).replace(/\\/g, "/");
      patched.push(`${rel} (${count})`);
    }
  }

  if (patched.length === 0) return { ok: true, details: "нет изменений" };
  return { ok: true, details: `${patched.length} файлов: ${patched.join(", ")}` };
}

module.exports = { padMethods };
