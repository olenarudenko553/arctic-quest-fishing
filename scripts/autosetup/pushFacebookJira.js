const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const crypto = require("node:crypto");
const { setFacebookFields } = require("./jiraExtras");

const execFileAsync = promisify(execFile);

function matchGroup(text, re) {
  const match = String(text || "").match(re);
  return match ? match[1] : "";
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function resolveKeystore(rootPath) {
  const propsPath = path.join(rootPath, "android", "gradle.properties");
  const props = await readText(propsPath);
  if (props == null) throw new Error("android/gradle.properties не найден");
  const storeFile = matchGroup(props, /MYAPP_RELEASE_STORE_FILE\s*=\s*(.+)/).trim();
  const alias = matchGroup(props, /MYAPP_RELEASE_KEY_ALIAS\s*=\s*(.+)/).trim();
  const storePassword = matchGroup(props, /MYAPP_RELEASE_STORE_PASSWORD\s*=\s*(.+)/).trim();
  if (!alias) throw new Error("MYAPP_RELEASE_KEY_ALIAS пуст");
  if (!storePassword) throw new Error("MYAPP_RELEASE_STORE_PASSWORD пуст");
  const candidates = [];
  if (storeFile) {
    candidates.push(
      path.isAbsolute(storeFile) ? storeFile : path.join(rootPath, "android", "app", storeFile)
    );
    candidates.push(path.join(rootPath, "android", storeFile));
  }
  candidates.push(
    path.join(rootPath, "android", "app", "keystore.keystore"),
    path.join(rootPath, "android", "app", "release.keystore")
  );
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return { keystorePath: candidate, alias, storePassword };
    } catch {
      // next
    }
  }
  throw new Error("Release keystore не найден");
}

async function readClassName(rootPath) {
  const gradle = await readText(path.join(rootPath, "android", "app", "build.gradle"));
  if (gradle == null) throw new Error("android/app/build.gradle не найден");
  const namespace = matchGroup(gradle, /namespace\s+"([^"]+)"/).trim();
  if (!namespace) throw new Error("namespace не найден в android/app/build.gradle");
  return `${namespace}.MainActivity`;
}

async function readKeyHash(rootPath) {
  const { keystorePath, alias, storePassword } = await resolveKeystore(rootPath);
  const { stdout } = await execFileAsync(
    "keytool",
    ["-exportcert", "-alias", alias, "-keystore", path.basename(keystorePath), "-storepass", storePassword],
    {
      cwd: path.dirname(keystorePath),
      windowsHide: true,
      encoding: "buffer",
      maxBuffer: 2 * 1024 * 1024,
    }
  );
  const der = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  return crypto.createHash("sha1").update(der).digest("base64");
}

async function pushFacebookJira(rootPath, meta) {
  const className = await readClassName(rootPath);
  const keyHash = await readKeyHash(rootPath);
  const posted = await setFacebookFields(meta, keyHash, className);
  return {
    ok: true,
    keyHash,
    className,
    details: `${posted.issueKey}: FB hash и FB Class Name записаны (${className})`,
  };
}

module.exports = { pushFacebookJira, readClassName, readKeyHash };

if (require.main === module) {
  const rootPath = process.cwd();
  const meta = JSON.parse(fsSync.readFileSync(path.join(rootPath, "meta.json"), "utf8"));
  pushFacebookJira(rootPath, meta)
    .then((result) => {
      console.log(result.details);
    })
    .catch((err) => {
      console.error(err && err.message ? err.message : err);
      process.exit(1);
    });
}
