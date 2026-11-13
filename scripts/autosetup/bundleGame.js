/**
 * Game-source bundler. Takes a list of .ts/.tsx files (typically pulled from
 * a Jira source archive) and produces 4 bundled TypeScript files that together
 * replace the per-file source layout:
 *
 *   AppResources.ts   — theme / config / constants
 *   GameLogic.ts      — game rules, scoring, formatters, helpers
 *   AppUI.ts          — components, hooks, shared UI types
 *   AppScreens.ts     — screens
 *
 * Plus up to two style sidecars (`AppUI.styles.ts`, `AppScreens.styles.ts`) so
 * every `const styles = StyleSheet.create(...)` has a dedicated home. Local
 * identifiers (styles / Props / BLOBS / SIZE / …) are suffix-renamed with
 * `_<FileStem>` so files can live side-by-side in one module without
 * collisions. Default exports convert to named exports.
 *
 * Exports: bundleGameSources({ files, archiveApp, outDir, slotMarker }) which
 * writes the bundle set and returns a report.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const BUNDLE_BY_FOLDER = {
  components: "AppUI",
  hooks: "AppUI",
  utils: "AppUI",
  panels: "AppUI",
  screens: "AppScreens",
  constants: "AppResources",
  game: "GameLogic",
};

const BUNDLES = ["AppResources", "GameLogic", "AppUI", "AppScreens"];

const MARKER_HEAD_RE = /^\/\*\s*@app-slot\s*:\s*(service|game|anchor)\s*\*\/\s*\r?\n/;

function stripMarker(content) {
  return String(content).replace(MARKER_HEAD_RE, "");
}

/** Pick a bundle name from the file path relative to the source root. */
function categorize(relPath) {
  const parts = relPath.replace(/\\/g, "/").split("/");
  if (parts.length >= 2 && BUNDLE_BY_FOLDER[parts[0]]) return BUNDLE_BY_FOLDER[parts[0]];
  const bn = parts[parts.length - 1];
  const stem = bn.replace(/\.(ts|tsx)$/, "");
  if (/\.tsx$/.test(bn) && /^[A-Z]/.test(stem)) return "AppUI";
  if (/^use[A-Z]/.test(stem)) return "AppUI";
  if (/Screen$/.test(stem)) return "AppScreens";
  if (/^(theme|config|constants)/i.test(stem)) return "AppResources";
  return "GameLogic";
}

/** Split file content into imports + body (marker removed upstream).
 *  Handles multi-line block comments at the top (TS JSDoc headers) and
 *  comments interleaved with import statements. Stops at the first real
 *  code line. */
function splitImports(content) {
  const lines = content.split("\n");
  const imports = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Blank line — skip.
    if (line.trim() === "") { i++; continue; }
    // Single-line // comment — skip.
    if (/^\s*\/\//.test(line)) { i++; continue; }
    // Block comment — may span multiple lines. Skip until we see `*/`.
    if (/^\s*\/\*/.test(line)) {
      if (/\*\//.test(line)) { i++; continue; }
      i++;
      while (i < lines.length && !/\*\//.test(lines[i])) i++;
      if (i < lines.length) i++;
      continue;
    }
    // Import statement — collect, support multi-line.
    if (/^\s*import\s/.test(line)) {
      let imp = line;
      while (!/;\s*$/.test(imp) && i + 1 < lines.length) {
        i++;
        imp += "\n" + lines[i];
      }
      imports.push(imp.trim());
      i++;
      continue;
    }
    break;
  }
  return { imports, body: lines.slice(i).join("\n") };
}

/** Rewrite subfolder-relative paths (both `import ... from` and `require(...)`)
 *  to flat siblings before bundling: `../components/X` → `./X`, `./src/X` →
 *  `./X`, `../../assets/x.png` → `./assets/x.png`. The subsequent bundle pass
 *  can then recognise `./NAME` and drop/rewire it. Same regexes as the one
 *  applyAssets.js uses for the GameInit anchor, now applied per source too. */
function flattenSourceImports(content) {
  let next = String(content || "");
  next = next.replace(
    /(from\s+|require\(\s*)(['"])\.\/src\/([^'"]+)\2/g,
    (_m, kw, q, name) => `${kw}${q}./${name}${q}`
  );
  next = next.replace(
    /(from\s+|require\(\s*)(['"])\.{1,2}\/(?:components|screens|game|hooks|constants|utils|panels)\/([^'"]+)\2/g,
    (_m, kw, q, name) => `${kw}${q}./${name}${q}`
  );
  next = next.replace(
    /(from\s+|require\(\s*)(['"])(?:\.\.\/)+assets(\/[^'"]*)?\2/g,
    (_m, kw, q, rest) => `${kw}${q}./assets${rest || ""}${q}`
  );
  return next;
}

/** Find top-level identifier declarations in the body (column-0 lines only).
 *  Handles both simple declarations (const X = …) and object destructuring
 *  (const { width: SCREEN_W, height: SCREEN_H } = …) so the bundler can
 *  suffix-rename all local identifiers and avoid cross-file collisions. */
function findTopLevelDecls(body) {
  const decls = [];
  // Simple: const X, let X, var X, function X, class X, type X, interface X
  const re = /^(export\s+(?:default\s+)?)?(const|let|var|function|class|type|interface)\s+([A-Za-z_][A-Za-z_0-9]*)/gm;
  let m;
  while ((m = re.exec(body))) {
    decls.push({
      name: m[3],
      kind: m[2],
      exported: !!m[1],
      isDefault: /default/.test(m[1] || ""),
    });
  }
  // Object destructuring (non-exported only — exported names must stay stable):
  //   const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  //   const { FOO, BAR = 0 } = something;
  const destructRe = /^(?!export\s)(const|let|var)\s+\{([^}]*)\}\s*=/gm;
  while ((m = destructRe.exec(body))) {
    for (const part of m[2].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      let name;
      if (colonIdx >= 0) {
        // "key: binding" or "key: binding = default"
        name = trimmed.slice(colonIdx + 1).trim().split(/\s*=\s*/)[0].trim();
      } else {
        // "binding" or "binding = default"
        name = trimmed.split(/\s*=\s*/)[0].trim();
      }
      if (/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) {
        decls.push({ name, kind: m[1], exported: false, isDefault: false });
      }
    }
  }
  return decls;
}

/** Word-boundary identifier rename that skips strings and comments. */
function renameIdent(src, oldName, newName) {
  if (oldName === newName) return src;
  let out = "";
  let i = 0;
  let inStr = null;
  let inLine = false;
  let inBlock = false;
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1] || "";
    if (inLine) {
      out += c;
      if (c === "\n") inLine = false;
      i++;
      continue;
    }
    if (inBlock) {
      out += c;
      if (c === "*" && c2 === "/") {
        out += c2;
        i += 2;
        inBlock = false;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      out += c;
      if (c === "\\" && c2) {
        out += c2;
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === "/" && c2 === "/") {
      out += "//";
      i += 2;
      inLine = true;
      continue;
    }
    if (c === "/" && c2 === "*") {
      out += "/*";
      i += 2;
      inBlock = true;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      out += c;
      inStr = c;
      i++;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z_0-9]/.test(src[j])) j++;
      const word = src.slice(i, j);
      out += word === oldName ? newName : word;
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function convertDefaultExports(body, stem) {
  let next = body;
  next = next.replace(/^export\s+default\s+(function\s+[A-Za-z_][A-Za-z_0-9]*)/gm, "export $1");
  next = next.replace(/^export\s+default\s+(class\s+[A-Za-z_][A-Za-z_0-9]*)/gm, "export $1");
  next = next.replace(/^export\s+default\s+([A-Za-z_][A-Za-z_0-9]*)\s*;?\s*$/gm, (line, name) => {
    const hasNamed = new RegExp(
      `^export\\s+(?:const|let|function|class|type|interface)\\s+${name}\\b`,
      "m"
    ).test(next);
    return hasNamed ? `// (bundled: ${stem} default was ${name})` : `export { ${name} };`;
  });
  return next;
}

/** Extract `const styles = StyleSheet.create(...)` block + rename to `styleName`. */
function extractStyles(body, styleName) {
  const re = /^(\s*)const\s+styles\s*=\s*StyleSheet\.create\(/m;
  const m = re.exec(body);
  if (!m) return { body, styles: null };
  const start = m.index + m[0].length - 1; // `(`
  let depth = 0;
  let i = start;
  let inStr = null;
  let inLine = false;
  let inBlock = false;
  while (i < body.length) {
    const c = body[i];
    const c2 = body[i + 1] || "";
    if (inLine) {
      if (c === "\n") inLine = false;
      i++;
      continue;
    }
    if (inBlock) {
      if (c === "*" && c2 === "/") {
        i += 2;
        inBlock = false;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === "/" && c2 === "/") {
      i += 2;
      inLine = true;
      continue;
    }
    if (c === "/" && c2 === "*") {
      i += 2;
      inBlock = true;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      i++;
      continue;
    }
    if (c === "(") {
      depth++;
      i++;
      continue;
    }
    if (c === ")") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
      i++;
      continue;
    }
    i++;
  }
  while (i < body.length && /[ \t]/.test(body[i])) i++;
  if (body[i] === ";") i++;
  const stylesBlock = body.slice(m.index, i).replace(/^(\s*)const\s+styles\s*=/, `$1export const ${styleName} =`);
  const bodyNoStyles = body.slice(0, m.index) + body.slice(i);
  return { body: bodyNoStyles, styles: stylesBlock };
}

/** Import parser used for the final rewire/dedupe pass. */
function parseImport(raw) {
  const trimmed = raw.replace(/\s+/g, " ").trim().replace(/;+$/, "");
  const mFrom = trimmed.match(/from\s+['"]([^'"]+)['"]$/);
  if (!mFrom) return null;
  const source = mFrom[1];
  let body = trimmed.slice(0, trimmed.length - mFrom[0].length).replace(/\s+$/, "");
  body = body.replace(/^import\s+/, "");
  let isType = false;
  if (/^type\s+/.test(body)) {
    isType = true;
    body = body.replace(/^type\s+/, "");
  }
  let def = null;
  let namespace = null;
  const named = [];
  const nsMatch = body.match(/^\*\s+as\s+([A-Za-z_][A-Za-z_0-9]*)$/);
  if (nsMatch) namespace = nsMatch[1];
  else {
    const mix = body.match(/^([A-Za-z_][A-Za-z_0-9]*)\s*,\s*\{(.+)\}$/);
    if (mix) {
      def = mix[1];
      for (const n of mix[2].split(",").map((s) => s.trim()).filter(Boolean)) named.push(n);
    } else {
      const only = body.match(/^\{(.+)\}$/);
      if (only) for (const n of only[1].split(",").map((s) => s.trim()).filter(Boolean)) named.push(n);
      else if (/^[A-Za-z_][A-Za-z_0-9]*$/.test(body)) def = body;
    }
  }
  return { source, isType, def, namespace, named };
}

function stringifyImport(imp) {
  const prefix = imp.isType ? "import type " : "import ";
  if (imp.namespace) return `${prefix}* as ${imp.namespace} from '${imp.source}';`;
  const parts = [];
  if (imp.def) parts.push(imp.def);
  if (imp.named.length) parts.push(`{ ${[...new Set(imp.named)].sort().join(", ")} }`);
  if (parts.length === 0) return `${prefix}'${imp.source}';`;
  return `${prefix}${parts.join(", ")} from '${imp.source}';`;
}

/** Rewrite imports pointing at per-file stems to the owning bundle, convert
 *  default→named, dedupe. `stemToBundle` is a shared map from stem to bundle
 *  name; `currentBundle` null if the file isn't itself a bundle (e.g. GameInit). */
function rewriteFileImports(content, stemToBundle, currentBundle) {
  const marker = (content.match(/^(\/\*\s*@app-slot[\s\S]*?\*\/\s*\n)/) || [""])[0];
  let rest = content.slice(marker.length);
  const leading = [];
  while (true) {
    const bm = rest.match(/^\s*\/\*[\s\S]*?\*\/\s*\n?/);
    if (bm) { leading.push(bm[0]); rest = rest.slice(bm[0].length); continue; }
    const lm = rest.match(/^\s*\/\/[^\n]*\n/);
    if (lm) { leading.push(lm[0]); rest = rest.slice(lm[0].length); continue; }
    const ws = rest.match(/^\s+/);
    if (ws && !rest.slice(ws[0].length).startsWith("import")) break;
    if (ws) { leading.push(ws[0]); rest = rest.slice(ws[0].length); continue; }
    break;
  }
  const raws = [];
  while (true) {
    const m = rest.match(/^(\s*)(import[\s\S]*?;)(\s*\n?)/);
    if (!m) break;
    raws.push(m[2]);
    rest = rest.slice(m[0].length);
  }
  const parsed = raws.map(parseImport).filter(Boolean);
  for (const imp of parsed) {
    const sm = imp.source.match(/^\.\/([A-Za-z_][A-Za-z_0-9]*)$/);
    if (!sm) continue;
    const stem = sm[1];
    const target = stemToBundle[stem];
    if (!target) continue;
    if (target === currentBundle) { imp._drop = true; continue; }
    imp.source = `./${target}`;
    if (imp.def) {
      imp.named.push(imp.def);
      imp.def = null;
    }
  }
  const kept = parsed.filter((i) => !i._drop);
  const buckets = new Map();
  for (const imp of kept) {
    const key = `${imp.isType ? "T" : "V"}|${imp.source}`;
    if (!buckets.has(key)) buckets.set(key, { ...imp, named: [] });
    const b = buckets.get(key);
    if (imp.def && !b.def) b.def = imp.def;
    if (imp.namespace && !b.namespace) b.namespace = imp.namespace;
    for (const n of imp.named) b.named.push(n);
  }
  const finalLines = [...buckets.values()].map(stringifyImport);
  return marker + leading.join("") + finalLines.join("\n") + "\n\n" + rest.replace(/^\s+/, "");
}

// ---------------------------------------------------------------------------
// Import-collision helpers
// ---------------------------------------------------------------------------

/** Derive a non-conflicting alias for a name from an external package.
 *  'react-native-svg' + 'G' → 'SvgG'; 'lucide-react-native' + 'X' → 'LucideX'. */
function deriveAlias(source, localName) {
  const bare = source
    .replace(/^[@][^/]+\//, "")        // strip @scope/
    .replace(/^react-native-/, "")     // strip react-native- prefix
    .replace(/-react-native$/, "")     // strip -react-native suffix
    .replace(/^react-/, "")            // strip react- prefix
    .split("/").pop()                  // last path segment
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // camelCase
  const prefix = bare.charAt(0).toUpperCase() + bare.slice(1);
  return prefix + localName;
}

/** Extract (orig, local) binding pairs from a raw import string.
 *  Covers named bindings { X, Y as Z } only (default imports rarely collide). */
function getImportBindings(imp) {
  const inner = (imp.match(/\{([^}]+)\}/) || [])[1];
  if (!inner) return [];
  return inner
    .split(",")
    .map((part) => {
      const p = part.trim().split(/\s+as\s+/);
      return { orig: p[0].trim(), local: (p[1] || p[0]).trim() };
    })
    .filter((b) => /^[A-Za-z_]/.test(b.orig));
}

/** Rebuild a raw import string applying renames { oldLocal → newLocal } to named bindings. */
function rebuildImport(imp, renames) {
  return imp.replace(/\{([^}]+)\}/, (_, inner) => {
    const parts = inner.split(",").map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const p = trimmed.split(/\s+as\s+/);
      const orig = p[0].trim();
      const local = (p[1] || p[0]).trim();
      const alias = renames[local];
      return alias ? `${orig} as ${alias}` : trimmed;
    });
    return `{ ${parts.filter(Boolean).join(", ")} }`;
  });
}

/** Pre-scan all files in a bundle and produce per-stem rename maps so that
 *  import name collisions (same local name from two different packages) are
 *  resolved before bodies are merged.  Internal/relative imports win; external
 *  package imports get a package-derived alias (e.g. G → SvgG). */
function resolveImportCollisions(fileData, stemToBundle, bundleName) {
  // 1. Collect all (stem, local, source) triples for every kept import.
  const claims = [];
  for (const { stem, raw } of fileData) {
    const { imports } = splitImports(raw);
    for (const imp of imports) {
      const srcMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (!srcMatch) continue;
      const src = srcMatch[1];
      const sm = src.match(/^\.\/([A-Za-z_][A-Za-z_0-9]*)$/);
      if (sm && stemToBundle[sm[1]] === bundleName) continue; // in-bundle → dropped
      for (const { local } of getImportBindings(imp)) {
        claims.push({ stem, local, source: src });
      }
    }
  }

  // 2. Determine winner per local name:
  //    Pass 1 — relative (internal) sources take priority.
  //    Pass 2 — first-seen external fills remaining slots.
  const winner = new Map(); // localName → { source }
  for (const { local, source } of claims) {
    if (/^\./.test(source) && !winner.has(local)) winner.set(local, { source });
  }
  for (const { local, source } of claims) {
    if (!winner.has(local)) winner.set(local, { source });
  }

  // 3. Build per-stem rename maps for losers.
  const result = new Map(); // stem → { oldLocal → newAlias }
  for (const { stem, local, source } of claims) {
    const w = winner.get(local);
    if (w && w.source !== source) {
      if (!result.has(stem)) result.set(stem, {});
      const renames = result.get(stem);
      if (!renames[local]) renames[local] = deriveAlias(source, local);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
/** Core routine: bundle a set of {stem, path} entries into {code, styles} strings. */
async function bundleOne(bundleName, entries, stemToBundle) {
  const allImports = [];
  const bodies = [];
  const styleChunks = [];
  const styleNames = [];

  // Pre-read all source files so we can run the collision pre-scan without double I/O.
  const fileData = [];
  for (const { stem, path: filePath } of entries) {
    const raw = flattenSourceImports(stripMarker(await fs.readFile(filePath, "utf8")));
    fileData.push({ stem, filePath, raw });
  }

  // Detect import-name collisions across the bundle and produce per-stem rename maps.
  // e.g. if two files both import `G` from different packages, the loser gets `SvgG`.
  const importRenameMap = resolveImportCollisions(fileData, stemToBundle, bundleName);

  for (const { stem, raw } of fileData) {
    const { imports, body: rawBody } = splitImports(raw);
    const impRenames = importRenameMap.get(stem) || {}; // { oldLocal → newAlias }

    const kept = [];
    for (const imp of imports) {
      const mod = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (!mod) { kept.push(imp); continue; }
      const sm = mod[1].match(/^\.\/([A-Za-z_][A-Za-z_0-9]*)$/);
      if (sm && stemToBundle[sm[1]] === bundleName) continue; // in-bundle drop
      // Rewrite named bindings that were renamed to avoid collisions.
      kept.push(Object.keys(impRenames).length ? rebuildImport(imp, impRenames) : imp);
    }
    allImports.push(...kept);

    // Apply import-collision renames to the body before any other processing.
    let rawBodyFixed = rawBody;
    for (const [o, n] of Object.entries(impRenames)) rawBodyFixed = renameIdent(rawBodyFixed, o, n);

    const styleName = `styles_${stem}`;
    const { body: bodyNoStyles, styles } = extractStyles(rawBodyFixed, styleName);
    let body = bodyNoStyles;
    const decls = findTopLevelDecls(body);
    const toRename = {};
    for (const d of decls) {
      if (!d.exported && d.name !== "styles") toRename[d.name] = `${d.name}_${stem}`;
    }
    for (const [o, n] of Object.entries(toRename)) body = renameIdent(body, o, n);
    if (styles) {
      body = renameIdent(body, "styles", styleName);
      let renamedStyles = styles;
      for (const [o, n] of Object.entries(toRename)) renamedStyles = renameIdent(renamedStyles, o, n);
      const prelude = [];
      // Match plain `const X = …` (renamed local) AND `export const X = …`
      // (exported, unrenamed). Both can be referenced in an extracted styles
      // block but won't be in scope in the separate .styles.ts file, so we
      // re-declare them as plain consts in the styles prelude.
      const cRe = /^(?:(export)\s+)?const\s+([A-Za-z_][A-Za-z_0-9]*)\s*=\s*([^;]+);/gm;
      let cm;
      while ((cm = cRe.exec(body))) {
        const [fullMatch, exportKw, name] = cm;
        const isRenamed = Object.values(toRename).includes(name);
        const isExported = !!exportKw;
        if (!isRenamed && !isExported) continue;
        if (!new RegExp(`\\b${name}\\b`).test(renamedStyles)) continue;
        prelude.push(isExported ? fullMatch.replace(/^export\s+/, "") : fullMatch);
      }
      styleChunks.push({ stem, prelude, block: renamedStyles });
      styleNames.push(styleName);
    }
    body = convertDefaultExports(body, stem);
    bodies.push(`// ------ ${stem} ------\n${body.trim()}\n`);
  }

  const seen = new Set();
  const deduped = [];
  for (const imp of allImports) {
    const k = imp.replace(/\s+/g, " ").trim();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(imp);
  }
  const stylesImport = styleNames.length
    ? `import { ${styleNames.join(", ")} } from './${bundleName}.styles';`
    : "";
  const code =
    deduped.join("\n") +
    (stylesImport ? "\n" + stylesImport : "") +
    "\n\n" +
    bodies.join("\n");
  const styles = styleChunks.length
    ? `import { StyleSheet } from 'react-native';\n\n` +
      styleChunks
        .map(({ stem, prelude, block }) => {
          const pre = (prelude || []).length ? prelude.join("\n") + "\n" : "";
          return `// ------ ${stem} ------\n${pre}${block.trim()}`;
        })
        .join("\n\n") +
      "\n"
    : null;
  return { code, styles };
}

/** Add cross-bundle imports to styles files (SCREEN_W, PLATE, …). */
function injectCrossBundleStyleImports(bundles, exportMap) {
  for (const b of BUNDLES) {
    if (!bundles[b] || !bundles[b].styles) continue;
    const content = bundles[b].styles;
    const idents = new Set(content.match(/\b[A-Z][A-Za-z_0-9]*\b/g) || []);
    const needed = {};
    for (const id of idents) {
      const src = exportMap[id];
      if (!src || src === b) continue;
      if (new RegExp(`import\\s*\\{[^}]*\\b${id}\\b[^}]*\\}\\s+from\\s+['"]\\./${src}['"]`).test(content)) continue;
      if (!needed[src]) needed[src] = new Set();
      needed[src].add(id);
    }
    if (!Object.keys(needed).length) continue;
    const lines = Object.entries(needed).map(
      ([src, set]) => `import { ${[...set].sort().join(", ")} } from './${src}';`
    );
    const idx = content.indexOf("import { StyleSheet } from 'react-native';");
    if (idx < 0) continue;
    const end = content.indexOf("\n", idx) + 1;
    bundles[b].styles = content.slice(0, end) + lines.join("\n") + "\n" + content.slice(end);
  }
}

/** Main entry point. */
async function bundleGameSources({ files, archiveApp, outDir }) {
  // 1. Categorize source files into buckets.
  const buckets = { AppResources: [], GameLogic: [], AppUI: [], AppScreens: [] };
  const stemToBundle = {};
  for (const relPath of Object.keys(files)) {
    const bundle = categorize(relPath);
    const stem = path.basename(relPath).replace(/\.(ts|tsx)$/, "");
    buckets[bundle].push({ stem, path: files[relPath] });
    stemToBundle[stem] = bundle;
  }

  // 2. Bundle each bucket.
  const result = {};
  for (const b of BUNDLES) {
    if (buckets[b].length === 0) continue;
    result[b] = await bundleOne(b, buckets[b], stemToBundle);
  }

  // 3. Build export map for cross-bundle styles imports.
  const exportMap = {};
  for (const [b, out] of Object.entries(result)) {
    const expRe = /^export\s+(?:const|let|function|class|type|interface)\s+([A-Za-z_][A-Za-z_0-9]*)/gm;
    let m;
    while ((m = expRe.exec(out.code))) if (!exportMap[m[1]]) exportMap[m[1]] = b;
  }
  injectCrossBundleStyleImports(result, exportMap);

  // 4. Rewire cross-bundle imports in code (./theme → ./AppResources etc).
  for (const b of BUNDLES) {
    if (!result[b]) continue;
    result[b].code = rewriteFileImports(`/* @app-slot:game */\n${result[b].code}`, stemToBundle, b)
      .replace(/^\/\*\s*@app-slot:game\s*\*\/\n/, "");
  }

  // 5. Prepare GameInit (anchor) from the archive's App.tsx. Flatten the
  //    subfolder prefix (`./src/screens/X`, `./components/Y`, …) down to
  //    `./X`, `./Y` so the subsequent rewireFileImports pass can map each
  //    stem to its owning bundle via stemToBundle.
  let anchor = null;
  if (archiveApp) {
    const raw = flattenSourceImports(stripMarker(await fs.readFile(archiveApp, "utf8")));
    anchor = rewriteFileImports(`/* @app-slot:anchor */\n${raw}`, stemToBundle, null);
  }

  // 6. Write files.
  // AppUI and AppScreens contain JSX (React components) so Metro requires .tsx.
  // AppResources and GameLogic are plain TS — .ts is fine.
  const JSX_BUNDLES = new Set(["AppUI", "AppScreens"]);
  const written = [];
  for (const [b, out] of Object.entries(result)) {
    const ext = JSX_BUNDLES.has(b) ? ".tsx" : ".ts";
    const codePath = path.join(outDir, `${b}${ext}`);
    await fs.writeFile(codePath, `/* @app-slot:game */\n${out.code}`);
    written.push(`${b}${ext}`);
    if (out.styles) {
      const stylesPath = path.join(outDir, `${b}.styles.ts`);
      await fs.writeFile(stylesPath, `/* @app-slot:game */\n${out.styles}`);
      written.push(`${b}.styles.ts`);
    }
  }
  if (anchor) {
    await fs.writeFile(path.join(outDir, "GameInit.tsx"), anchor);
    written.push("GameInit.tsx");
  }

  return { written, bundles: Object.keys(result), stemToBundle };
}

module.exports = {
  BUNDLES,
  bundleGameSources,
  categorize,
};
