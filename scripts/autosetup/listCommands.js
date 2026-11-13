#!/usr/bin/env node
const commands = require("./commands");

function printCommands() {
  console.log("\nКоманды autosetup / release\n");
  let lastGroup = null;
  let maxLen = 0;
  for (const cmd of commands) {
    maxLen = Math.max(maxLen, `npm run ${cmd.npm}`.length);
  }
  for (const cmd of commands) {
    if (cmd.group !== lastGroup) {
      if (lastGroup) console.log("");
      console.log(`── ${cmd.group} ──`);
      lastGroup = cmd.group;
    }
    const left = `npm run ${cmd.npm}`.padEnd(maxLen + 2);
    console.log(`  ${left}${cmd.description}`);
  }
  console.log("");
}

printCommands();
