package com.gamevault;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private ActivityResultLauncher<Intent> imagePicker;
    private ActivityResultLauncher<Intent> exportPicker;
    private ActivityResultLauncher<Intent> importPicker;
    private String pendingExportJson = "{}";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        imagePicker = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            Uri[] uris = null;
            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                Uri data = result.getData().getData();
                if (data != null) uris = new Uri[]{data};
            }
            if (fileCallback != null) {
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
            }
        });

        exportPicker = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (result.getResultCode() != RESULT_OK || result.getData() == null) return;
            Uri uri = result.getData().getData();
            if (uri == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                if (out != null) {
                    out.write(pendingExportJson.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                    pendingExportJson = "{}";
                    toast("Backup saved");
                }
            } catch (Exception e) {
                toast("Could not save backup: " + e.getMessage());
            }
        });

        importPicker = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (result.getResultCode() != RESULT_OK || result.getData() == null) return;
            Uri uri = result.getData().getData();
            if (uri == null) return;
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in == null) return;
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[8192];
                int read;
                while ((read = in.read(chunk)) != -1) buffer.write(chunk, 0, read);
                String json = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
                evaluate("window.__gvImportBackup(" + JSONObject.quote(json) + ")");
            } catch (Exception e) {
                toast("Could not read backup: " + e.getMessage());
            }
        });

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF000000);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);

        webView.addJavascriptInterface(new Bridge(), "AndroidHost");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.setType("image/*");
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                }
                try {
                    imagePicker.launch(intent);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    toast("No file picker available");
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Let the web layer close a sheet or pop a screen first.
                webView.evaluateJavascript(
                        "(function(){ return window.__gvBack ? window.__gvBack() : false; })()",
                        value -> {
                            if (value == null || "false".equals(value) || "null".equals(value)) {
                                finish();
                            }
                        });
            }
        });

        setContentView(webView);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    private void evaluate(String js) {
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    private String iconDataUrl(Drawable drawable) {
        if (drawable == null) return "";
        try {
            int size = 96;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, size, size);
            drawable.draw(canvas);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 92, out);
            return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    /** JS bridge. All methods are invoked from the WebView's JavaScript thread. */
    public class Bridge {

        @JavascriptInterface
        public String getInstalledApps() {
            try {
                Intent intent = new Intent(Intent.ACTION_MAIN);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<android.content.pm.ResolveInfo> resolved =
                        getPackageManager().queryIntentActivities(intent, 0);
                List<JSONObject> apps = new ArrayList<>();
                for (android.content.pm.ResolveInfo info : resolved) {
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(getPackageName())) continue;
                    JSONObject app = new JSONObject();
                    app.put("packageName", pkg);
                    app.put("label", String.valueOf(info.loadLabel(getPackageManager())));
                    apps.add(app);
                }
                Collections.sort(apps, new Comparator<JSONObject>() {
                    @Override
                    public int compare(JSONObject a, JSONObject b) {
                        return a.optString("label").compareToIgnoreCase(b.optString("label"));
                    }
                });
                JSONArray array = new JSONArray();
                for (JSONObject app : apps) array.put(app);
                return array.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        /** Loaded per row by the web layer so a device scan never ships every icon at once. */
        @JavascriptInterface
        public String getAppIcon(String packageName) {
            try {
                return iconDataUrl(getPackageManager().getApplicationIcon(packageName));
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public String launchApp(String packageName) {
            try {
                Intent launch = getPackageManager().getLaunchIntentForPackage(packageName);
                if (launch == null) {
                    return "{\"ok\":false,\"message\":\"This app is not installed or cannot be launched.\"}";
                }
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(launch);
                return "{\"ok\":true}";
            } catch (Exception e) {
                JSONObject result = new JSONObject();
                try {
                    result.put("ok", false);
                    result.put("message", "Launch failed: " + e.getMessage());
                } catch (Exception ignored) {
                }
                return result.toString();
            }
        }

        @JavascriptInterface
        public boolean isInstalled(String packageName) {
            try {
                getPackageManager().getPackageInfo(packageName, 0);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void vibrate(int millis) {
            try {
                Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(
                            Math.max(8, millis), VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(Math.max(8, millis));
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void exportBackup(String json, String fileName) {
            pendingExportJson = json;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, fileName);
                try {
                    exportPicker.launch(intent);
                } catch (ActivityNotFoundException e) {
                    toast("No file manager available to save the backup");
                }
            });
        }

        @JavascriptInterface
        public void importBackup() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    importPicker.launch(intent);
                } catch (ActivityNotFoundException e) {
                    toast("No file manager available to open the backup");
                }
            });
        }

        @JavascriptInterface
        public String appVersion() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public String platform() {
            return "android";
        }
    }
}
