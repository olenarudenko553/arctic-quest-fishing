const fs = require("node:fs");
const path = require("node:path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "obfuscator.config.json");

const ALWAYS_RESERVED = [
  "__d",
  "__r",
  "__c",
  "__registerSegment",
  "nativeRequire",
  "global",
  "__DEV__",
  "__BUNDLE_START_TIME__",
  "NativeModules",
  "require",
  "__fbBatchedBridge",
  "__fbBatchedBridgeConfig",
  "__turboModuleProxy",
  "nativeModuleProxy",
  "nativeCallSyncHook",
  "nativeFlushQueueImmediate",
  "nativePerformanceNow",
  "RN$Bridgeless",
  "RN$registerCallableModule",
];

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

function javascriptActive(config) {
  if (config.enabled === false) return false;
  const js = config.javascript || {};
  return Boolean(js.renameIdentifiers || js.renameProperties || js.encryptStrings || js.controlFlow);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildObfuscatorOptions(config) {
  const js = config.javascript || {};
  const reserved = [...new Set([...(config.reservedStrings || []), ...ALWAYS_RESERVED])];
  return {
    compact: true,
    controlFlowFlattening: Boolean(js.controlFlow),
    controlFlowFlatteningThreshold: js.controlFlow ? 0.2 : 0,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    identifiersPrefix: "",
    ignoreRequireImports: true,
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    renameProperties: Boolean(js.renameProperties),
    reservedNames: reserved.map((name) => `^${escapeRegExp(name)}$`),
    reservedStrings: reserved,
    seed: 1,
    selfDefending: false,
    simplify: true,
    sourceMap: false,
    splitStrings: false,
    stringArray: Boolean(js.encryptStrings),
    stringArrayCallsTransform: false,
    stringArrayEncoding: js.encryptStrings ? ["base64"] : [],
    stringArrayThreshold: js.encryptStrings ? 0.75 : 0,
    stringArrayWrappersChainedCalls: false,
    stringArrayWrappersCount: 1,
    stringArrayWrappersType: "variable",
    target: "browser",
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  };
}

function loadFn(ids, label) {
  let lastError = null;
  for (const id of ids) {
    try {
      const loaded = require(id);
      const fn = typeof loaded === "function" ? loaded : loaded && loaded.default;
      if (typeof fn === "function") return fn;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `Не найден ${label}. ` + (lastError ? lastError.message : "")
  );
}

function resolveSerializerPieces() {
  return {
    baseJSBundle: loadFn(
      [
        "metro/src/DeltaBundler/Serializers/baseJSBundle",
        "metro/private/DeltaBundler/Serializers/baseJSBundle",
      ],
      "сериализатор Metro baseJSBundle"
    ),
    bundleToString: loadFn(
      ["metro/src/lib/bundleToString", "metro/private/lib/bundleToString"],
      "metro bundleToString"
    ),
  };
}

function splitRuntimePrelude(code) {
  const token = "__d(function";
  const index = code.indexOf(token);
  if (index <= 0) return { prelude: "", body: code };
  return { prelude: code.slice(0, index), body: code.slice(index) };
}

function obfuscateBundleCode(code, config) {
  const JavaScriptObfuscator = require("javascript-obfuscator");
  const { prelude, body } = splitRuntimePrelude(code);
  const obfuscatedBody = JavaScriptObfuscator.obfuscate(body, buildObfuscatorOptions(config)).getObfuscatedCode();
  return prelude + obfuscatedBody;
}

function withRnObfuscator(config) {
  const { baseJSBundle, bundleToString } = resolveSerializerPieces();
  return {
    ...config,
    serializer: {
      ...(config.serializer || {}),
      customSerializer: async (entryPoint, preModules, graph, options) => {
        const packed = await baseJSBundle(entryPoint, preModules, graph, options);
        const rendered = bundleToString(packed);
        if (!rendered || typeof rendered.code !== "string") {
          throw new Error("Metro вернул bundle без кода.");
        }
        const dev = Boolean(options && options.dev);
        if (dev) return rendered.code;
        let projectConfig;
        try {
          projectConfig = readConfig();
        } catch (error) {
          throw new Error("Не удалось прочитать obfuscator.config.json: " + error.message);
        }
        if (!javascriptActive(projectConfig)) return rendered.code;
        return obfuscateBundleCode(rendered.code, projectConfig);
      },
    },
  };
}

module.exports = {
  buildObfuscatorOptions,
  obfuscateBundleCode,
  splitRuntimePrelude,
  withRnObfuscator,
};
