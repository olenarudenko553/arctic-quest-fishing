/**
 * Project encryption mode detector. With the AES-GCM migration there is
 * only one supported mode left; this stub stays for callers (run.js,
 * applyMeta, rotateEncryption) that still expect a detection step but
 * doesn't need to scan the source tree any more.
 */

async function detectProjectEncryptionMode(_rootPath) {
  return "aesgcm";
}

function helperNameForMode(mode) {
  return mode === "aesgcm" ? "RN App Helper (AES-GCM)" : "RN App Helper (?)";
}

module.exports = {
  detectProjectEncryptionMode,
  helperNameForMode,
};
