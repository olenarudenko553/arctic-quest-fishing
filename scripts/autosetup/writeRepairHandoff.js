/**
 * Write `.claude/autosetup-repair.md` at the end of an autosetup run so the
 * RN App Helper's file watcher fires and auto-opens Claude Code with the
 * /repair-imports skill. The content embeds the current task context (Jira
 * issue, package, CF Protocol surface, path-check warnings) so the skill has
 * everything it needs without re-scanning the project first.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

function formatWarnings(warnings) {
  const pathCheck = (warnings || []).filter((w) => w.title === "path-check");
  const other = (warnings || []).filter((w) => w.title !== "path-check");
  const lines = [];
  if (pathCheck.length) {
    lines.push("### Broken relative imports (path-check)");
    lines.push("");
    for (const w of pathCheck) lines.push(`- ${w.reason}`);
    lines.push("");
  } else {
    lines.push("### path-check: ok");
    lines.push("");
  }
  if (other.length) {
    lines.push("### Other warnings");
    lines.push("");
    for (const w of other) lines.push(`- ${w.title}: ${w.reason}`);
    lines.push("");
  }
  return lines.join("\n");
}

function formatCfProtocol(meta) {
  const p = meta?.cfProtocol;
  if (!p || typeof p !== "object") return "- cf-protocol: (не применён / meta.cfProtocol пуст)";
  return [
    `- cf-protocol: cookie=\`${p.cookieName}\`, header=\`${p.headerName}\`, path=\`${p.path}\`, bodyField=\`${p.bodyField}\``,
  ].join("\n");
}

async function writeRepairHandoff({ rootPath, meta, warnings = [] }) {
  const claudeDir = path.join(rootPath, ".claude");
  await ensureDir(claudeDir);

  const jiraIssue = String(meta?.jiraIssue || "(n/a)");
  const appName = String(meta?.appName || "(n/a)");
  const packageName = String(meta?.packageName || "(n/a)");
  const versionCode = String(meta?.versionCode || "1");
  const versionName = String(meta?.versionName || "1.0");

  const body = `# Autosetup → финальный ремонт (задача ${jiraIssue})

Автосетап завершён для **${appName}** (\`${packageName}\`, v${versionCode} / ${versionName}).
Он уже сделал (в JS, без окон Cursor):

- meta: appName / packageName / versionCode / versionName
- keystore + google-services + game bundles из Jira ANDROID-${jiraIssue}
- rotate AES: PASSWORD + SALT в Qelujowofahuhe.kt + worker, LINK_HEX перешифровка
${formatCfProtocol(meta)}
- path-check + description → Jira + .git remote + GitHub AAB + FB hash → Jira

Остался шаг, которому нужен агент: **финальный ремонт импортов/экспортов и
запуск на эмуляторе BlueStacks**. Выполни его в этой сессии Claude Code.

Перед запуском BlueStacks должен быть открыт, ADB включён (BlueStacks →
Settings → Advanced → Android Debug Bridge). Порт по умолчанию \`5555\`;
если другой — установи env \`BLUESTACKS_ADB_PORT=<порт>\`. Скилл сам сделает
\`adb connect 127.0.0.1:<порт>\`.

## Что сделать

Запусти скилл **repair-imports** (и справочно раздел *Final repair* из
**services-obfuscation**). Скиллы лежат в \`.claude/skills/\`:

\`\`\`
/repair-imports
\`\`\`

Если скилл не подхватился — выполни то же вручную:

1. Пройди \`App.tsx\`, \`index.js\`, \`Layouts/\`, \`services/\`,
   \`android/app/src/main/java/\` (пропусти \`node_modules\`, \`android/**/build\`).
2. Почини:
   - битые относительные \`import\`/\`require\` (переименованные файлы, split \`*PartNN*\`);
   - \`import { Name }\` из файла, который не экспортирует \`Name\`
     (включая почти одноимённые \`Part\`-файлы) — \`… is not a function (undefined)\`;
   - cipher-имена: один и тот же спеллинг на экспорте и вызове
     (\`aesEncryptHex\`/\`aesDecryptHex\`, \`aesEncryptB64u\`/\`aesDecryptB64u\`,
     \`hexToBytes\`, \`bytesToHex\`);
   - unresolved \`void\`-хелперы — привязать к существующему экспорту/определению;
   - Kotlin/Java: дубликаты \`*SinkV*\` в одной области (\`Conflicting declarations\`),
     DecoyHub import drift, незакрытые лямбды/типы;
   - Animated / RN style-keys, переименованные обфускацией
     (\`transform\`, \`opacity\` и т.д. должны остаться литералами).
3. **Не менять** игровую логику, UI-текст, ключи шифрования, cf-protocol literals
   (\`cookieName\`/\`headerName\`/\`path\`/\`bodyField\`) и split \`*PartNN*\`.
4. \`adb connect 127.0.0.1:\${BLUESTACKS_ADB_PORT:-5555}\` → \`adb devices\` должен
   показать строку \`127.0.0.1:<порт>  device\`.
5. Запусти \`npm run android\`. Готово только когда: \`BUILD SUCCESSFUL\`, процесс
   поднялся в BlueStacks, в Metro и \`adb logcat\` нет redbox / \`Unable to
   resolve module\` / \`ReferenceError\` / \`Style property '…' is not supported\`.
   Чини и перезапускай, пока не станет чисто (но не больше 4 попыток на одну
   и ту же ошибку). USB-телефон и AVD-эмулятор не трогать — цель только
   BlueStacks.

## Контекст текущего прогона

${formatWarnings(warnings)}
<!-- timestamp: ${new Date().toISOString()} -->
`;

  const outPath = path.join(claudeDir, "autosetup-repair.md");
  await fs.writeFile(outPath, body, "utf8");
  return outPath;
}

module.exports = { writeRepairHandoff };
