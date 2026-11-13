#!/usr/bin/env node
/**
 * Fixes paths in android/build/generated/autolinking/autolinking.json
 * after copying the project (when paths still contain the old directory, e.g. *TEMP).
 *
 * Run from project root: node scripts/fix-autolinking-path.js
 * Or: npm run fix-autolinking
 */

const fs = require('fs');
const path = require('path');

const AUTOLINKING_PATH = path.join(
  process.cwd(),
  'android',
  'build',
  'generated',
  'autolinking',
  'autolinking.json'
);

function main() {
  if (!fs.existsSync(AUTOLINKING_PATH)) {
    console.error(
      'File not found: android/build/generated/autolinking/autolinking.json\n' +
        'Build Android first (e.g. cd android && gradlew assembleDebug),\n' +
        'then run this script again.'
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(process.cwd());
  let content = fs.readFileSync(AUTOLINKING_PATH, 'utf8');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse autolinking.json:', e.message);
    process.exit(1);
  }

  const oldRoot = parsed.root;
  if (!oldRoot) {
    console.error('Key "root" was not found in autolinking.json.');
    process.exit(1);
  }

  const oldRootNormalized = path.normalize(oldRoot);
  const newRootNormalized = path.normalize(projectRoot);
  if (oldRootNormalized === newRootNormalized) {
    console.log('Paths already match; no changes needed.');
    process.exit(0);
  }

  // Old path variants in the file: double backslashes (JSON) and forward slashes
  const oldRootEscaped = oldRoot.replace(/\\/g, '\\\\');
  const oldRootForward = oldRoot.replace(/\\/g, '/');
  const newRootEscaped = projectRoot.replace(/\\/g, '\\\\');
  const newRootForward = projectRoot.replace(/\\/g, '/');

  let newContent = content;
  newContent = newContent.split(oldRootEscaped).join(newRootEscaped);
  newContent = newContent.split(oldRoot).join(newRootEscaped);
  newContent = newContent.split(oldRootForward).join(newRootForward);

  if (newContent === content) {
    console.log('No replacements made (path may already be fixed or format differs).');
    process.exit(0);
  }

  fs.writeFileSync(AUTOLINKING_PATH, newContent, 'utf8');
  console.log('Done: paths in autolinking.json have been updated.');
  console.log('  Was:  ' + oldRoot);
  console.log('  Now:  ' + projectRoot);
}

main();
