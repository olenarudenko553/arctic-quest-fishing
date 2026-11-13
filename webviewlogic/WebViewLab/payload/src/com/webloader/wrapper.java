package com.webloader;

import android.app.Activity;
import android.app.Dialog;
import android.app.Fragment;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Message;
import android.util.Log;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager.LayoutParams;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebBackForwardList;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public final class wrapper {
    private static final String TAG = "WebViewLab";

    public void link(Activity activity, String url) {
        WebView page = new WebView(activity);
        createWindow(activity, page, url).show();
        Log.i(TAG, "wrapper.link -> WebView.loadUrl " + url);
        page.loadUrl(url);
    }

    private Dialog createWindow(Activity activity, WebView page, String startUrl) {
        Dialog dialog = new Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen) {
            @Override public void onBackPressed() {
                WebBackForwardList history = page.copyBackForwardList();
                for (int index = history.getCurrentIndex() - 1; index >= 0; index--) {
                    String previous = history.getItemAtIndex(index).getUrl();
                    String scheme = android.net.Uri.parse(previous).getScheme();
                    if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                        if (startUrl != null && samePage(startUrl, previous)
                                && !samePage(startUrl, page.getUrl())) {
                            page.loadUrl(startUrl);
                            Log.i(TAG, "Back restored start page");
                        } else {
                            page.goBackOrForward(index - history.getCurrentIndex());
                        }
                        return;
                    }
                }
                if (startUrl != null && !samePage(startUrl, page.getUrl())) {
                    page.loadUrl(startUrl);
                    Log.i(TAG, "Back restored start page");
                    return;
                }
                dismiss();
            }
        };
        FrameLayout root = new FrameLayout(activity);
        root.addView(page, new FrameLayout.LayoutParams(-1, -1));
        android.widget.ProgressBar progress = new android.widget.ProgressBar(
            activity, null, android.R.attr.progressBarStyleHorizontal);
        android.widget.TextView label = new android.widget.TextView(activity);
        label.setTextColor(android.graphics.Color.BLACK);
        label.setBackgroundColor(android.graphics.Color.WHITE);
        label.setPadding(16, 0, 16, 0);
        label.setText("Loading 0% · 0.0 s");
        android.widget.LinearLayout indicator = new android.widget.LinearLayout(activity);
        indicator.setOrientation(android.widget.LinearLayout.VERTICAL);
        indicator.addView(progress, new android.widget.LinearLayout.LayoutParams(-1, -2));
        indicator.addView(label);
        root.addView(indicator, new FrameLayout.LayoutParams(-1, -2));
        long[] started = {android.os.SystemClock.elapsedRealtime()};
        dialog.setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            dialog.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, dialog::onBackPressed);
        }
        MediaRequests media = new MediaRequests();
        activity.getFragmentManager().beginTransaction().add(media, null).commitNow();
        dialog.setOnDismissListener(window -> {
            media.cancel();
            activity.getFragmentManager().beginTransaction().remove(media).commitAllowingStateLoss();
            page.stopLoading();
            root.removeView(page);
            page.destroy();
        });
        Window window = dialog.getWindow();
        window.addFlags(LayoutParams.FLAG_HARDWARE_ACCELERATED);
        window.setSoftInputMode(LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN | LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if (Build.VERSION.SDK_INT >= 28) {
            LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode = LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets safe = insets.getInsetsIgnoringVisibility(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, Math.max(safe.bottom, keyboard.bottom));
                return insets;
            });
        }
        activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER);

        WebSettings settings = page.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setBlockNetworkImage(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setAllowFileAccess(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportMultipleWindows(true);
        settings.setUserAgentString(WebSettings.getDefaultUserAgent(activity)
            .replace("; wv", "").replace("Version/4.0 ", ""));

        page.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(
                    WebView view, android.webkit.WebResourceRequest request) {
                android.net.Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)
                        || "about:blank".equalsIgnoreCase(uri.toString())) return false;
                if (scheme == null || java.util.Arrays.asList(
                        "file", "content", "javascript", "data", "blob", "about",
                        "android.resource", "jar", "view-source").contains(
                            scheme.toLowerCase(java.util.Locale.ROOT))) {
                    return true;
                }

                android.net.Uri fallback = uri;
                try {
                    android.net.Uri target = uri;
                    String targetPackage = null;
                    if ("intent".equalsIgnoreCase(scheme)) {
                        android.content.Intent parsed = android.content.Intent.parseUri(
                            uri.toString(), android.content.Intent.URI_INTENT_SCHEME);
                        String browserUrl = parsed.getStringExtra("browser_fallback_url");
                        if (browserUrl != null) {
                            android.net.Uri web = android.net.Uri.parse(browserUrl);
                            if ("https".equalsIgnoreCase(web.getScheme()) || "http".equalsIgnoreCase(web.getScheme())) {
                                fallback = web;
                            }
                        }
                        target = parsed.getData();
                        targetPackage = parsed.getPackage();
                        if (target == null) {
                            openInBrowser(activity, fallback);
                            return true;
                        }
                        if (fallback == uri) fallback = target;
                        String targetScheme = target.getScheme();
                        if (targetScheme == null || java.util.Arrays.asList(
                                "file", "content", "javascript", "data", "blob", "about",
                                "android.resource", "jar", "view-source", "intent").contains(
                                    targetScheme.toLowerCase(java.util.Locale.ROOT))) {
                            return true;
                        }
                    }

                    if ("tg".equalsIgnoreCase(target.getScheme())) {
                        String username = target.getQueryParameter("domain");
                        String invite = target.getQueryParameter("invite");
                        if ("resolve".equalsIgnoreCase(target.getHost()) && username != null) {
                            fallback = android.net.Uri.parse("https://t.me/" + android.net.Uri.encode(username));
                        } else if ("join".equalsIgnoreCase(target.getHost()) && invite != null) {
                            fallback = android.net.Uri.parse("https://t.me/+" + android.net.Uri.encode(invite));
                        }
                    }
                    android.content.Intent external = new android.content.Intent(
                        android.content.Intent.ACTION_VIEW, target);
                    if (targetPackage != null) external.setPackage(targetPackage);
                    if (!"mailto".equalsIgnoreCase(scheme) && !"tel".equalsIgnoreCase(scheme)
                            && !"sms".equalsIgnoreCase(scheme) && !"smsto".equalsIgnoreCase(scheme)) {
                        external.addCategory(android.content.Intent.CATEGORY_BROWSABLE);
                    }
                    activity.startActivity(external);
                    Log.i(TAG, "External link opened: " + scheme);
                    return true;
                } catch (java.net.URISyntaxException | android.content.ActivityNotFoundException
                        | SecurityException ignored) {
                    Log.i(TAG, "External link has no handler: " + scheme);
                    openInBrowser(activity, fallback);
                }
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                started[0] = android.os.SystemClock.elapsedRealtime();
                indicator.animate().cancel();
                indicator.setAlpha(1f);
                indicator.setVisibility(android.view.View.VISIBLE);
            }

            @Override public void onPageFinished(WebView view, String url) {
                android.net.Uri parsed = android.net.Uri.parse(url);
                Log.i(TAG, "WebView.onPageFinished " + parsed.getScheme() + "://" + parsed.getHost());
            }
        });
        page.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                return media.chooseFile(callback, params);
            }

            @Override public void onPermissionRequest(PermissionRequest request) {
                media.requestCamera(request);
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (media.camera == request) media.camera = null;
            }

            private int lastProgress = -1;
            private long lastUpdate;

            @Override public void onProgressChanged(WebView view, int value) {
                long now = android.os.SystemClock.elapsedRealtime();
                if (value == lastProgress || (value != 100 && value >= lastProgress
                        && now - lastUpdate < 90)) return;
                lastProgress = value;
                lastUpdate = now;
                progress.setProgress(value, true);
                double seconds = (android.os.SystemClock.elapsedRealtime() - started[0]) / 1000.0;
                label.setText(String.format(java.util.Locale.US, "Page %d%% · %.1f s", value, seconds));
                if (value == 100) {
                    Log.i(TAG, label.getText().toString());
                    indicator.postDelayed(() -> {
                        if (page.getProgress() == 100) {
                            indicator.animate().alpha(0f).setDuration(200).withEndAction(() -> {
                                if (page.getProgress() == 100) {
                                    indicator.setVisibility(android.view.View.GONE);
                                }
                            }).start();
                        }
                    }, 1200);
                }
            }

            @Override public boolean onCreateWindow(WebView view, boolean isDialog,
                    boolean isUserGesture, Message result) {
                WebView child = new WebView(activity);
                Dialog popup = createWindow(activity, child, null);
                ((WebView.WebViewTransport) result.obj).setWebView(child);
                result.sendToTarget();
                popup.show();
                return true;
            }

            @Override public void onCloseWindow(WebView view) {
                dialog.dismiss();
            }
        });
        return dialog;
    }

    public static final class MediaRequests extends Fragment {
        private static final int PICK_FILE = 81;
        private static final int CAMERA = 82;
        private ValueCallback<Uri[]> file;
        private PermissionRequest camera;

        boolean chooseFile(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
            if (file != null) {
                callback.onReceiveValue(null);
                return true;
            }
            file = callback;
            try {
                startActivityForResult(params.createIntent(), PICK_FILE);
                Log.i(TAG, "File picker opened");
            } catch (android.content.ActivityNotFoundException error) {
                finishFile(null);
            }
            return true;
        }

        @Override public void onActivityResult(int requestCode, int resultCode, Intent data) {
            super.onActivityResult(requestCode, resultCode, data);
            if (requestCode != PICK_FILE) return;
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            finishFile(result);
        }

        private void finishFile(Uri[] result) {
            ValueCallback<Uri[]> callback = file;
            file = null;
            if (callback != null) {
                callback.onReceiveValue(result);
                Log.i(TAG, result == null ? "File selection canceled" : "File selection delivered");
            }
        }

        void requestCamera(PermissionRequest request) {
            Uri origin = request.getOrigin();
            if (!"https".equals(origin.getScheme()) || !"banda-soft.space".equals(origin.getHost())
                    || (origin.getPort() != -1 && origin.getPort() != 443)
                    || !java.util.Arrays.equals(request.getResources(),
                        new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE})
                    || camera != null) {
                request.deny();
                return;
            }
            if (getActivity().checkSelfPermission(android.Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED) {
                grantCamera(request);
                return;
            }
            camera = request;
            requestPermissions(new String[]{android.Manifest.permission.CAMERA}, CAMERA);
        }

        @Override public void onRequestPermissionsResult(int requestCode, String[] permissions,
                int[] grantResults) {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults);
            if (requestCode != CAMERA || camera == null) return;
            PermissionRequest request = camera;
            camera = null;
            if (grantResults.length == 1 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                grantCamera(request);
            } else {
                request.deny();
            }
        }

        private void grantCamera(PermissionRequest request) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            Log.i(TAG, "WebView video capture permission granted");
        }

        void cancel() {
            finishFile(null);
            if (camera != null) {
                camera.deny();
                camera = null;
            }
        }
    }

    private static boolean samePage(String left, String right) {
        return right != null && left.split("[?#]", 2)[0].equals(right.split("[?#]", 2)[0]);
    }

    private void openInBrowser(Activity activity, android.net.Uri uri) {
        try {
            android.content.Intent browser = new android.content.Intent(
                android.content.Intent.ACTION_VIEW, uri);
            browser.addCategory(android.content.Intent.CATEGORY_BROWSABLE);
            browser.setSelector(new android.content.Intent(android.content.Intent.ACTION_MAIN)
                .addCategory(android.content.Intent.CATEGORY_APP_BROWSER));
            activity.startActivity(browser);
            Log.i(TAG, "System browser fallback: " + uri.getScheme());
        } catch (android.content.ActivityNotFoundException | SecurityException ignored) {
            Log.i(TAG, "System browser unavailable");
            android.widget.Toast.makeText(activity, "Cannot open link on this device",
                android.widget.Toast.LENGTH_SHORT).show();
        }
    }

}
