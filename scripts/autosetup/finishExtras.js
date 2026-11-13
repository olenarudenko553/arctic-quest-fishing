const { isJiraConfigured } = require("./fetchJiraTask");
const { checkProjectPaths } = require("./checkPaths");
const { postGameDescription } = require("./postGameDescription");
const { attachGitFromJira } = require("./attachGitFromJira");
const { setupGithubAab } = require("./setupGithubAab");
const { pushFacebookJira } = require("./pushFacebookJira");
const { writeRepairHandoff } = require("./writeRepairHandoff");

const TAIL_STEPS = ["paths", "description", "git-remote", "github-aab", "fb-jira", "repair-handoff"];

/**
 * End of a full autosetup. Only the follow-up work the user requested from
 * Jira / GitHub lives here now (game description back to Jira, .git remote,
 * GitHub AAB workflow + secrets, FB hash / class name). Plus a report-only
 * path-check pass so broken relative imports surface before build.
 *
 * Every step is best-effort: a failure (usually Jira/GitHub network or no `gh`)
 * is collected as a warning and does not abort the autosetup.
 */
async function runFinishExtras(rootPath, meta, { only } = {}) {
  const want = (name) => !only || only.has(name);
  const warnings = [];
  const ran = [];
  const jira = isJiraConfigured(meta);

  const step = async (name, label, fn) => {
    process.stdout.write(`[autosetup] ${label}... `);
    try {
      const result = await fn();
      console.log(result?.details || "ok");
      if (result?.warning) {
        console.log(`[autosetup] warning: ${result.warning}`);
        warnings.push({ title: label, reason: result.warning });
      }
      ran.push(name);
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`warn: ${reason}`);
      warnings.push({ title: label, reason });
      return null;
    }
  };

  if (want("paths")) {
    await step("paths", "path-check (tail)", async () => {
      const check = await checkProjectPaths(rootPath);
      if (!check.ok) {
        for (const p of check.problems) {
          warnings.push({ title: "path-check", reason: `${p.file} → ${p.ref}` });
        }
        return { details: `FOUND ${check.problems.length} broken refs` };
      }
      return { details: `ok (${check.checkedFiles} files)` };
    });
  }

  if (want("description")) {
    if (jira) {
      await step("description", "game description → Jira", () =>
        postGameDescription(rootPath, meta)
      );
    } else {
      console.log("[autosetup] description: Jira не настроен — пропуск");
    }
  }

  // git-remote resolves the GitHub token/owner/repo that github-aab needs.
  let gitInfo = null;
  const needGit = want("git-remote") || want("github-aab");
  if (needGit) {
    if (jira) {
      gitInfo = await step("git-remote", ".git from GitHub (Jira token)", () =>
        attachGitFromJira(rootPath, meta)
      );
    } else {
      console.log("[autosetup] git-remote/github-aab: Jira не настроен — пропуск");
    }
  }

  if (want("github-aab")) {
    if (gitInfo) {
      await step("github-aab", "GitHub AAB workflow + secrets", () =>
        setupGithubAab(rootPath, gitInfo)
      );
    } else if (jira) {
      warnings.push({
        title: "github-aab",
        reason: "git-remote не дал owner/repo/token — workflow не настроен",
      });
    }
  }

  if (want("fb-jira")) {
    if (jira) {
      await step("fb-jira", "Facebook hash / Class Name → Jira", () =>
        pushFacebookJira(rootPath, meta)
      );
    } else {
      console.log("[autosetup] fb-jira: Jira не настроен — пропуск");
    }
  }

  // Hand off to the /repair-imports skill via .claude/autosetup-repair.md.
  // The RN App Helper extension watches that file; writing it fires the
  // watcher and auto-opens Claude Code with the repair prompt.
  let repairHandoff = null;
  if (want("repair-handoff") || (!only && TAIL_STEPS.includes("repair-handoff"))) {
    try {
      const outPath = await writeRepairHandoff({ rootPath, meta, warnings });
      console.log(`[autosetup] repair-handoff → ${outPath.replace(/\\/g, "/")}`);
      repairHandoff = outPath;
      ran.push("repair-handoff");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`[autosetup] repair-handoff warn: ${reason}`);
      warnings.push({ title: "repair-handoff", reason });
    }
  }

  return { warnings, ran, repairHandoff };
}

module.exports = { runFinishExtras, TAIL_STEPS };
