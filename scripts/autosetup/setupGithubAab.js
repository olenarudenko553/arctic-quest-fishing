const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { redactSecrets, restoreGitHubDesktopCredentialHelper } = require("./jiraExtras");
const { toolEnv, gitBasicAuthEnv } = require("./exeEnv");

function run(cmd, args, { cwd, token, input, extraEnv } = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    input,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
    env: toolEnv({
      ...(token ? { GH_TOKEN: token, GITHUB_TOKEN: token } : {}),
      GIT_TERMINAL_PROMPT: "0",
      ...(extraEnv || {}),
    }),
  });
  const output = redactSecrets(`${result.stdout || ""}\n${result.stderr || ""}`).trim();
  if (result.error) {
    throw new Error(`${cmd} ${args[0]}: ${redactSecrets(result.error.message)}`);
  }
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} (${result.status}): ${output || "нет вывода"}`);
  }
  return output;
}

function prop(text, name) {
  const match = String(text || "").match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) throw new Error(`В android/gradle.properties нет ${name}`);
  return match[1].trim();
}

function gradleExt(text, name, fallback) {
  const match = String(text || "").match(new RegExp(`${name}\\s*=\\s*"?([^"\\n]+)"?`));
  return match ? match[1].trim() : fallback;
}

function workflowYaml({ compileSdk, buildTools, ndk, npmCi, googleServices }) {
  const install = npmCi ? "npm ci" : "npm install";
  const googleStep = googleServices
    ? `
      - name: Decode google-services.json
        env:
          GOOGLE_SERVICES_JSON_BASE64: \${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}
        run: |
          if [ -z "$GOOGLE_SERVICES_JSON_BASE64" ]; then
            echo "Missing secret GOOGLE_SERVICES_JSON_BASE64"
            exit 1
          fi
          echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > android/app/google-services.json
`
    : "";
  return `name: Android AAB

on:
  workflow_dispatch:

concurrency:
  group: android-aab-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-aab:
    name: Build release AAB
    runs-on: ubuntu-latest
    timeout-minutes: 90

    env:
      GRADLE_OPTS: "-Xmx6g -XX:MaxMetaspaceSize=1g -Dorg.gradle.daemon=false -Dkotlin.daemon.jvm.options=-Xmx2g"
      NODE_VERSION: "22.11.0"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: npm

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
        with:
          packages: platform-tools

      - name: Install Android SDK packages
        run: |
          sdkmanager --install \\
            "platform-tools" \\
            "platforms;android-${compileSdk}" \\
            "build-tools;${buildTools}" \\
            "ndk;${ndk}"
          yes | sdkmanager --licenses >/dev/null || true

      - name: Install npm dependencies
        run: ${install}

      - name: Configure Android SDK path
        run: |
          SDK_ROOT="\${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
          echo "sdk.dir=$SDK_ROOT" > android/local.properties
          printf '%s\\n' \\
            'org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8' \\
            'kotlin.daemon.jvmargs=-Xmx2g' \\
            'android.useAndroidX=true' \\
            'reactNativeArchitectures=armeabi-v7a,arm64-v8a' \\
            'newArchEnabled=true' \\
            'hermesEnabled=true' \\
            'edgeToEdgeEnabled=false' \\
            > android/gradle.properties

      - name: Decode release keystore
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
        run: |
          if [ -z "$KEYSTORE_BASE64" ]; then
            echo "Missing secret KEYSTORE_BASE64"
            exit 1
          fi
          mkdir -p "$HOME/keystores"
          echo "$KEYSTORE_BASE64" | base64 -d > "$HOME/keystores/release.keystore"
          echo "KEYSTORE_PATH=$HOME/keystores/release.keystore" >> "$GITHUB_ENV"
${googleStep}
      - name: Build Android AAB (release)
        env:
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        run: |
          set -euo pipefail
          if [ -z "\${KEYSTORE_PASSWORD:-}" ] || [ -z "\${KEY_ALIAS:-}" ] || [ -z "\${KEY_PASSWORD:-}" ]; then
            echo "Missing one of: KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD"
            exit 1
          fi
          cd android
          chmod +x ./gradlew
          ./gradlew clean bundleRelease --refresh-dependencies --stacktrace \\
            -Pandroid.useAndroidX=true \\
            -PMYAPP_RELEASE_STORE_FILE="$KEYSTORE_PATH" \\
            -PMYAPP_RELEASE_STORE_PASSWORD="$KEYSTORE_PASSWORD" \\
            -PMYAPP_RELEASE_KEY_ALIAS="$KEY_ALIAS" \\
            -PMYAPP_RELEASE_KEY_PASSWORD="$KEY_PASSWORD"
          AAB_PATH="$(ls -1 app/build/outputs/bundle/release/*.aab | head -n 1)"
          echo "Built AAB: $AAB_PATH"

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: android/app/build/outputs/bundle/release/*.aab
          if-no-files-found: error
          retention-days: 30

      - name: Upload ProGuard mapping
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: release-mapping
          path: android/app/build/outputs/mapping/release/mapping.txt
          if-no-files-found: ignore
          retention-days: 30
`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function githubRepo(token, owner, repo) {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "autosetup",
      },
    }
  );
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

async function setupGithubAab(rootPath, gitInfo) {
  restoreGitHubDesktopCredentialHelper();
  if (!gitInfo || gitInfo.skippedRemote) {
    return {
      ok: true,
      details: "GitHub AAB пропущен: origin проекта не совпадает с Git URL задачи",
    };
  }
  if (!gitInfo.token || !gitInfo.owner || !gitInfo.repo) {
    throw new Error("GitHub AAB: нет token или owner/repo");
  }
  const repo = `${gitInfo.owner}/${gitInfo.repo}`;
  // gh repo view uses GraphQL, which is a separate quota and was already exhausted.
  // REST /repos still answers with the same token.
  const viewed = await githubRepo(gitInfo.token, gitInfo.owner, gitInfo.repo);
  let defaultBranch = "main";
  let branchAssumed = false;
  if (viewed.ok) {
    const fullName = String(viewed.json?.full_name || "");
    if (fullName && fullName.toLowerCase() !== repo.toLowerCase()) {
      throw new Error(`GitHub видит ${fullName}, ожидался ${repo}`);
    }
    defaultBranch = viewed.json?.default_branch || gitInfo.defaultBranch || "main";
  } else if (viewed.status === 403 || viewed.status === 429) {
    branchAssumed = true;
  } else {
    throw new Error(
      `GitHub repo ${viewed.status}: ${viewed.json?.message || repo}`
    );
  }

  const rootGradle = await fs.readFile(path.join(rootPath, "android", "build.gradle"), "utf8");
  const appGradle = await fs.readFile(path.join(rootPath, "android", "app", "build.gradle"), "utf8");
  const props = await fs.readFile(path.join(rootPath, "android", "gradle.properties"), "utf8");
  const compileSdk = gradleExt(rootGradle, "compileSdkVersion", "36");
  const buildTools = gradleExt(rootGradle, "buildToolsVersion", "36.0.0");
  const ndk = gradleExt(rootGradle, "ndkVersion", "29.0.14206865");
  const npmCi = await fileExists(path.join(rootPath, "package-lock.json"));
  const googleServices = /com\.google\.gms\.google-services/.test(appGradle);
  const yaml = workflowYaml({ compileSdk, buildTools, ndk, npmCi, googleServices });
  const workflowPath = path.join(rootPath, ".github", "workflows", "android-aab.yml");
  await fs.mkdir(path.dirname(workflowPath), { recursive: true });
  await fs.writeFile(workflowPath, yaml.replace(/\n/g, "\n"), "utf8");

  const storeFile = prop(props, "MYAPP_RELEASE_STORE_FILE");
  const storePass = prop(props, "MYAPP_RELEASE_STORE_PASSWORD");
  const alias = prop(props, "MYAPP_RELEASE_KEY_ALIAS");
  const keyPass = prop(props, "MYAPP_RELEASE_KEY_PASSWORD");
  const candidates = [
    path.join(rootPath, "android", "app", storeFile),
    path.join(rootPath, "android", storeFile),
    path.isAbsolute(storeFile) ? storeFile : path.join(rootPath, storeFile),
  ];
  let keystore = null;
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      keystore = candidate;
      break;
    }
  }
  if (!keystore) throw new Error(`Keystore не найден: ${storeFile}`);
  const keystoreB64 = (await fs.readFile(keystore)).toString("base64");
  const secret = (name, value) => {
    run("gh", ["secret", "set", name, "--repo", repo], {
      cwd: rootPath,
      token: gitInfo.token,
      input: value,
    });
  };
  secret("KEYSTORE_BASE64", keystoreB64);
  secret("KEYSTORE_PASSWORD", storePass);
  secret("KEY_ALIAS", alias);
  secret("KEY_PASSWORD", keyPass);
  if (googleServices) {
    const gsCandidates = [
      path.join(rootPath, "android", "app", "google-services.json"),
      path.join(rootPath, "android", "google-services.json"),
    ];
    let gs = null;
    for (const candidate of gsCandidates) {
      if (await fileExists(candidate)) {
        gs = candidate;
        break;
      }
    }
    if (!gs) throw new Error("google-services plugin подключён, но google-services.json не найден");
    secret("GOOGLE_SERVICES_JSON_BASE64", (await fs.readFile(gs)).toString("base64"));
  }
  const listed = run("gh", ["secret", "list", "--repo", repo], {
    cwd: rootPath,
    token: gitInfo.token,
  });

  const email = "autosetup@local";
  run("git", ["add", "--", ".github/workflows/android-aab.yml"], { cwd: rootPath });
  const staged = spawnSync("git", ["diff", "--cached", "--quiet", "--", ".github/workflows/android-aab.yml"], {
    cwd: rootPath,
    windowsHide: true,
  });
  if (staged.status === 1) {
    run(
      "git",
      [
        "-c",
        "user.name=autosetup",
        "-c",
        `user.email=${email}`,
        "commit",
        "-m",
        "Add GitHub Actions workflow for Android release AAB.",
        "--",
        ".github/workflows/android-aab.yml",
      ],
      { cwd: rootPath }
    );
  } else if (staged.status && staged.status !== 0) {
    throw new Error(`git diff --cached завершился с кодом ${staged.status}`);
  }
  const pushUrl = `https://github.com/${repo}.git`;
  try {
    run("git", ["push", pushUrl, `HEAD:refs/heads/${defaultBranch}`], {
      cwd: rootPath,
      extraEnv: gitBasicAuthEnv("x-access-token", gitInfo.token),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/non-fast-forward|fetch first|\[rejected\]/i.test(message)) {
      throw new Error(
        `${message}\nИстория проекта не совпадает с ${repo}:${defaultBranch}. ` +
          "Привяжите .git к репо задачи (node scripts/autosetup/run.js --only git-remote) и повторите."
      );
    }
    throw error;
  }
  const configPath = path.join(rootPath, ".git", "config");
  const cfg = await fs.readFile(configPath, "utf8");
  const originNote = /x-access-token:|ghp_|github_pat_/i.test(cfg)
    ? "origin с токеном (push/pull без входа в GitHub Desktop)"
    : "origin без токена";
  return {
    ok: true,
    details: `workflow на ${defaultBranch} в ${repo}${branchAssumed ? " (ветка main: лимит GitHub API)" : ""}; ${originNote}; secrets: ${listed.split(/\r?\n/).filter(Boolean).map((line) => line.split(/\s+/)[0]).join(", ") || "set"}`,
  };
}

module.exports = { setupGithubAab, workflowYaml };
