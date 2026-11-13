/**
 * Единый список команд autosetup / release.
 * Источник описаний для `npm run cmds`.
 * Скрипты в package.json должны совпадать с полем `npm`.
 */
module.exports = [
  {
    group: "справка",
    npm: "cmds",
    description: "Показать весь список команд в терминале",
  },
  {
    group: "полный сетап",
    npm: "autosetup",
    description:
      "Полный цикл: Jira (поля+вложения+Worker URL из комментариев) + rotate + path-check + npm + checklist (иконка вручную)",
  },
  {
    group: "полный сетап",
    npm: "autosetup:assets",
    description:
      "Только keystore/google-services/game из Jira + path-check (без rotate, npm и checklist)",
  },
  {
    group: "полный сетап",
    npm: "autosetup:checklist",
    description: "Показать итоговый summary (без изменений)",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:meta",
    description:
      "Jira → appName/package + Cloudflare Worker URL → LINK_HEX в Rumokuroh.java",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:keystore",
    description: "Только keystore из Jira *.tar.gz + gradle.properties",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:google-services",
    description: "Только google-services.json из Jira",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:game",
    description:
      "Код игры из Jira *_source.zip → assets + @app-slot:game бандлы в Layouts/Game",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:rotate",
    description:
      "Новый AES-256-GCM ключ (PASSWORD + SALT) в native + worker; LINK_HEX перешифровка",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:cf-protocol",
    description:
      "Рандом CF_PROTOCOL (cookieName/headerName/path/bodyField/extraQuery/dummyBodyKeys) в worker + native, сохранение в meta.cfProtocol",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:native-check",
    description:
      "Проверка v2-native: BwCodec + gemefuxolaru/jopuwikemavo + cf-intake:v2 маркер",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:paths",
    description: "Только проверка путей в Layouts/Game и App.tsx",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:npm",
    description: "Только npm install",
  },
  {
    group: "частичные шаги",
    npm: "autosetup:clean-android",
    description: "Удалить android/build и android/app/build",
  },
  {
    group: "хвост",
    npm: "autosetup:tail",
    description:
      "Path-check, описание в Jira, .git из GitHub, AAB workflow, FB hash/Class Name",
  },
  {
    group: "хвост",
    npm: "autosetup:github-aab",
    description: ".git из GitHub + AAB workflow и секреты (gh) в JS",
  },
  {
    group: "релиз",
    npm: "release",
    description: "assembleRelease + bundleRelease → ReadyBuilds (имя как в Helper)",
  },
  {
    group: "релиз",
    npm: "release:apk",
    description: "Только APK (assembleRelease) → ReadyBuilds",
  },
  {
    group: "релиз",
    npm: "release:aab",
    description: "Только AAB (bundleRelease) → ReadyBuilds",
  },
];
