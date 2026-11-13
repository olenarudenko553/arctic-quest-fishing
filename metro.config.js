const fs = require('fs');
const Module = require('module');

// Pin every resolve to the real path so Metro and Node agree on one root.
const realpathNative = fs.realpathSync.native.bind(fs);
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  const resolved = resolveFilename.call(this, request, parent, isMain, options);
  if (typeof resolved !== 'string') {
    return resolved;
  }
  try {
    return realpathNative(resolved);
  } catch {
    return resolved;
  }
};

const projectRoot = realpathNative(__dirname);
const { getDefaultConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(projectRoot);

// rn-obfuscator-begin
const { withRnObfuscator } = require("./scripts/rn-obfuscator/metro");
// rn-obfuscator-end

module.exports = withRnObfuscator({
  ...defaultConfig,
  projectRoot,
  resolver: {
    ...defaultConfig.resolver,
    // Watchman cannot open this root: the folder name has non-ASCII characters.
    useWatchman: false,
  },
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
});