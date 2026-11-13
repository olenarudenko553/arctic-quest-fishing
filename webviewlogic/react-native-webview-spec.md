# ТЗ. Открытие URL из ответа сервера в React Native на Android

## Цель

В лабораторной Android-сборке воспроизвести проверенный на Samsung сценарий. React Native получает URL, скачивает отдельный DEX и через Android-модуль вызывает `com.webloader.wrapper.link(Activity, String)`. Тестовый URL — `https://www.google.com/`.

## Контракт и последовательность

1. При запуске TypeScript один раз вызывает `GET /getAds`. Пример ответа для теста:

   ```json
   {"success": true, "ads": "https://www.google.com/"}
   ```

2. При ошибке HTTP, таймауте, пустом `ads`, неверном URL или хосте вне списка разрешённых приложение остаётся на основном экране. Для теста разрешён HTTPS на `www.google.com`.
3. После проверки URL приложение скачивает байты с фиксированного тестового адреса `/conway.xml`. Тело ответа содержит DEX. Имя файла воспроизводит исследованный сценарий.
4. TypeScript передаёт байты и URL в `DexBridge.open(bytes, url)`. Нативный модуль проверяет размер файла и SHA-256 по значению, заданному в тестовом билде.
5. Android-модуль получает текущую Activity, создаёт `InMemoryDexClassLoader(ByteBuffer.wrap(dex), activity.classLoader)`, загружает класс `com.webloader.wrapper` и создаёт экземпляр. Вызов `link(activity, url)` выполняется на UI-потоке.
6. `link` показывает полноэкранный диалог поверх React Native, создаёт системный WebView и вызывает `loadUrl(url)`. В новой реализации кнопка «Назад» использует историю WebView, а при пустой истории закрывает диалог. При закрытии WebView освобождается. Одновременно разрешено одно основное окно.

Целевая платформа — Android API 26+. Для Expo используется development build с локальным нативным модулем. Для Google Play `wrapper` включается в Android-сборку, а сервер передаёт URL. Правила Google Play запрещают скачивание исполняемого DEX с внешнего сервера для распространяемых через магазин приложений. [Expo](https://docs.expo.dev/workflow/customizing/) · [Android API](https://developer.android.com/reference/dalvik/system/InMemoryDexClassLoader) · [Google Play](https://support.google.com/googleplay/android-developer/answer/16559646)

## Критерии приёмки

- Google отображается внутри приложения на физическом Android-устройстве.
- Лог подтверждает цепочку получения URL, скачивания и проверки DEX, вызова `wrapper.link` и загрузки страницы.
- При `ad not found`, сетевой ошибке, неверном URL, повреждённом DEX или ошибке загрузки класса основной экран остаётся доступен.
- Повторный вызов при загрузке или при открытом основном окне не создаёт дубликат.
- На сдаче есть тестовый APK, отдельный DEX, его SHA-256 и лог успешного прогона.

## Все настройки WebView в исследованном DEX

Основной WebView создаёт `com.webloader.r8.h`, всплывающий — `com.webloader.r8.l`. Оба выставляют один и тот же набор из десяти параметров.

| Вызов WebSettings | Значение | Эффект |
|---|---|---|
| `setJavaScriptEnabled` | `true` | Выполнение JavaScript |
| `setAllowContentAccess` | `true` | Доступ к URL со схемой `content://` в пределах разрешений Android |
| `setBlockNetworkImage` | `false` | Сетевые изображения разрешены |
| `setJavaScriptCanOpenWindowsAutomatically` | `true` | JavaScript может открывать окна автоматически |
| `setAllowFileAccess` | `true` | Доступ WebView к файловой системе в пределах ограничений Android |
| `setDomStorageEnabled` | `true` | DOM Storage, включая `localStorage` и `sessionStorage` |
| `setLoadWithOverviewMode` | `true` | Подгонка масштаба широкого содержимого под экран |
| `setUseWideViewPort` | `true` | Поддержка viewport страницы и широкого viewport |
| `setSupportMultipleWindows` | `true` | Поддержка нескольких окон WebView |
| `setUserAgentString` | `WebSettings.getDefaultUserAgent(activity).replace("; wv", "").replace("Version/4.0 ", "")` | Удаляет обе указанные подстроки из системного User-Agent |

Явных настроек CookieManager, mixed content, Safe Browsing, кэша, геолокации, зума, доступа между файловыми URL и JavaScript-моста `addJavascriptInterface` в проверенном DEX не найдено. Значения по умолчанию в таблицу не включены.

### Обработчики и настройки окна

| Область | Наблюдаемое поведение |
|---|---|
| Основное окно | Полноэкранный `Dialog` без заголовка. WebView и контейнер занимают всю доступную область. URL передаётся в `loadUrl`. Клиенты — `r8.e` и `r8.d`. |
| Всплывающее окно | `onCreateWindow` создаёт отдельный полноэкранный диалог с WebView и передаёт его через `WebViewTransport`. Клиенты — `r8.j` и `r8.k`. `onCloseWindow` закрывает диалог. |
| Кнопка «Назад» | Оба окна используют историю WebView. При пустой истории оригинальное основное окно остаётся открытым, всплывающее закрывается. ТЗ выше задаёт закрытие и для основного окна. |
| Режим окна | В обоих диалогах включён `FLAG_HARDWARE_ACCELERATED`. `setSoftInputMode(18)` соответствует `STATE_ALWAYS_HIDDEN + ADJUST_RESIZE`. С API 28 разрешена область коротких сторон выреза. С API 30 диалог управляет отступами и скрывает навигационную панель с возможностью временно показать её жестом. При смене фокуса запрашивается `SCREEN_ORIENTATION_USER`. |
| Переходы | `shouldOverrideUrlLoading` делегирует навигацию общему обработчику. Есть ветки для Android Intent, `browser_fallback_url`, Google Play и диплинков в другие приложения, включая Mercado Pago, Telegram, WhatsApp и Дію. |
| Файлы | `onShowFileChooser` запускает системный выбор файла через Activity и передаёт результат обратно в WebView. |
| Разрешения страницы | При запросе ресурсов обработчик проверяет `CAMERA` и при необходимости запрашивает её. При наличии разрешения передаёт весь список `getResources()` в `grant()`. Собственной проверки origin или фильтрации типов ресурсов в этом обработчике нет. |

Таблица описывает поведение исследованного DEX. Для минимальной реализации ТЗ достаточно JavaScript и DOM Storage для страницы, нужной тесту. Остальные настройки и обработчики перечислены для сопоставления с оригиналом.

[Основной WebView](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/h.java:128) · [Всплывающий WebView](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/l.java:32) · [WebChromeClient](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/d.java:29) · [Трасса Samsung](/tmp/fort-live/google4.log)
