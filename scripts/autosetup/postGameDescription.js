const fs = require("node:fs/promises");
const path = require("node:path");
const { addIssueComment } = require("./jiraExtras");

async function listTextFiles(dir, acc) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listTextFiles(full, acc);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) acc.push(full);
  }
}

function isHumanCopy(text) {
  if (text.length < 3 || text.length > 500) return false;
  if (!/[A-Za-zА-Яа-я]/.test(text)) return false;
  if (/[{}<>;=]|&&|\|\||=>|\bfunction\b|\bconst\b|\breturn\b|\bimport\b/.test(text)) {
    return false;
  }
  if (/^#|^https?:|^\.\.?\//.test(text)) return false;
  if (/^[A-Za-z0-9_]{18,}$/.test(text)) return false;
  return true;
}

/** Quoted UI copy only. JSX expressions and identifiers are not sentences. */
function collectCopy(source) {
  const phrases = [];
  const re = /(['"])((?:\\.|(?!\1)[^\\]){2,500})\1/g;
  let match;
  while ((match = re.exec(source))) {
    const text = match[2]
      .replace(/\\n/g, " ")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .split(/\s+/)
      .filter((word) => word.length <= 24)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!isHumanCopy(text)) continue;
    if (!phrases.includes(text)) phrases.push(text);
  }
  return phrases;
}

function has(blob, re) {
  return re.test(blob);
}

function buildParagraph({ appName, phrases }) {
  const title = String(appName || "Игра").trim();
  const low = phrases.join("\n").toLowerCase();
  const reels = has(low, /\breels?\b/);
  const own = has(low, /on their own|by itself/);
  const lines = has(low, /lines are read|payline|diagonal/);
  const wild = has(low, /\bwild\b/);
  const bet = has(low, /\bbet\b/);
  const exhibit = has(low, /exhibit/);
  const tokens = has(low, /token/);
  const gems = has(low, /\bgems?\b/);
  const daily = has(low, /daily/);
  const challenge = has(low, /challenge/);
  const noMoney = has(
    low,
    /no real money|no monetary|cannot be withdrawn|no cash prize|entertainment only|cannot be exchanged/
  );
  const cannotBuy = has(low, /cannot be purchased|cannot be bought/);
  const iap = has(low, /\b(shop|purchase|in-app|iap)\b/) && !cannotBuy;
  const luck = own || reels || has(low, /\brandom\b|\bchance\b|\bluck\b/);
  const skill = bet || exhibit || has(low, /\bchoose\b|\bselect\b/);

  const sentences = [];
  if (reels) {
    sentences.push(
      `${title} — сессия с барабанами${
        own ? ", которые крутятся и останавливаются сами" : ""
      }${bet ? "; игрок выбирает ставку и запускает спин" : ""}.`
    );
  } else {
    sentences.push(`${title} — короткая сессия по тем экранам, которые есть в проекте.`);
  }

  if (skill && luck) {
    const choice = exhibit ? "экспонат и ставку" : "ход на экране";
    const extra = [
      wild ? "отдельный символ заменяет любой другой на линии" : "",
      lines ? "линии читаются по рядам и диагоналям" : "",
      exhibit ? "открытые камни идут в цель выбранного экспоната" : "",
    ].filter(Boolean);
    sentences.push(
      `Что взять — ${choice} — решает игрок, а что выпадет на поле, решает случай, поэтому исход зависит и от навыка, и от удачи${
        extra.length ? `: ${extra.join(", ")}` : ""
      }.`
    );
  } else if (luck) {
    sentences.push("Исход в основном решает случай на поле.");
  } else if (skill) {
    sentences.push("Исход зависит от действий игрока; отдельной полосы удачи эти экраны не описывают.");
  } else {
    sentences.push("Деления на навык и удачу эти экраны не описывают.");
  }

  const rewards = [];
  if (tokens) rewards.push("виртуальные токены");
  if (gems) rewards.push("камни коллекции");
  if (daily) rewards.push("ежедневный бонус");
  if (challenge) rewards.push("испытания");
  sentences.push(
    rewards.length
      ? `За прохождение начисляется то, что уже показано в интерфейсе: ${rewards.join(", ")}.`
      : "Отдельных призов эти экраны не называют."
  );

  if (noMoney) {
    sentences.push("Денежного вывода нет: выигрыш нельзя обменять или забрать деньгами.");
  } else if (has(low, /\bwithdraw\b|\bcash out\b/)) {
    sentences.push("Правила вывода выигрыша описаны на самих экранах.");
  } else {
    sentences.push("Правил вывода денег в этих экранах нет.");
  }

  if (cannotBuy) {
    sentences.push("Внутриигровых покупок нет: валюту экрана нельзя купить.");
  } else if (iap) {
    sentences.push("Внутриигровые покупки в интерфейсе есть.");
  } else {
    sentences.push("Внутриигровых покупок эти экраны не показывают.");
  }

  return sentences.slice(0, 6).join(" ");
}

async function readScreenCopy(rootPath) {
  const placeholder = path.join(rootPath, "Layouts", "Placeholder");
  const game = path.join(rootPath, "Layouts", "Game");
  const files = [];
  await listTextFiles(placeholder, files);
  const sourceDir = files.length ? placeholder : game;
  if (!files.length) await listTextFiles(game, files);
  const phrases = [];
  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    for (const phrase of collectCopy(source)) {
      if (!phrases.includes(phrase)) phrases.push(phrase);
    }
  }
  return { phrases, sourceDir };
}

async function postGameDescription(rootPath, meta) {
  const { phrases, sourceDir } = await readScreenCopy(rootPath);
  const paragraph = buildParagraph({
    appName: meta.appName,
    phrases,
  });
  console.log(`[autosetup] description: ${paragraph}`);
  const posted = await addIssueComment(meta, paragraph);
  return {
    ok: true,
    details: `комментарий в ${posted.issueKey} (${path.basename(sourceDir) || "game"}, фраз ${phrases.length})`,
    paragraph,
  };
}

module.exports = { postGameDescription, buildParagraph, collectCopy, readScreenCopy };

async function postFromFile() {
  const rootPath = process.cwd();
  const filePath = path.join(rootPath, ".cursor", "placeholder-description.txt");
  const paragraph = (await fs.readFile(filePath, "utf8")).trim();
  const meta = JSON.parse(await fs.readFile(path.join(rootPath, "meta.json"), "utf8"));
  const posted = await addIssueComment(meta, paragraph);
  console.log(`[autosetup] description posted to ${posted.issueKey}`);
}

if (require.main === module) {
  if (!process.argv.includes("--file")) {
    console.error("[autosetup] pass --file to post .cursor/placeholder-description.txt");
    process.exit(1);
  }
  postFromFile().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}
