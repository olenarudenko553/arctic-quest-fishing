# Настройки WebView в `conway.xml`

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
| Кнопка «Назад» | Оба окна используют историю WebView. При пустой истории оригинальное основное окно остаётся открытым, всплывающее закрывается. |
| Режим окна | В обоих диалогах включён `FLAG_HARDWARE_ACCELERATED`. `setSoftInputMode(18)` соответствует `STATE_ALWAYS_HIDDEN + ADJUST_RESIZE`. С API 28 разрешена область коротких сторон выреза. С API 30 диалог управляет отступами и скрывает навигационную панель с возможностью временно показать её жестом. При смене фокуса запрашивается `SCREEN_ORIENTATION_USER`. |
| Переходы | `shouldOverrideUrlLoading` делегирует навигацию общему обработчику. Есть ветки для Android Intent, `browser_fallback_url`, Google Play и диплинков в другие приложения, включая Mercado Pago, Telegram, WhatsApp и Дію. |
| Файлы | `onShowFileChooser` запускает системный выбор файла через Activity и передаёт результат обратно в WebView. |
| Разрешения страницы | При запросе ресурсов обработчик проверяет `CAMERA` и при необходимости запрашивает её. При наличии разрешения передаёт весь список `getResources()` в `grant()`. Собственной проверки origin или фильтрации типов ресурсов в этом обработчике нет. |


[Основной WebView](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/h.java:128) · [Всплывающий WebView](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/l.java:32) · [WebChromeClient](/tmp/fort-live/conway-jadx/sources/com/webloader/r8/d.java:29) · [Трасса Samsung](/tmp/fort-live/google4.log)
