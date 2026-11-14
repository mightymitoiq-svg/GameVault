package com.gamevault;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String PREFS_NAME = "gamevault";
    private static final String PREFS_PLAYS = "plays";

    private WebView webView;
    private WebAppInterface jsBridge;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0F1117);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        jsBridge = new WebAppInterface(this);
        webView.addJavascriptInterface(jsBridge, "Android");

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
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

    public class WebAppInterface {
        private final Context context;
        private final android.content.pm.PackageManager pm;

        public WebAppInterface(Context context) {
            this.context = context;
            this.pm = context.getPackageManager();
        }

        @JavascriptInterface
        public String getInstalledGames() {
            try {
                Intent intent = new Intent(Intent.ACTION_MAIN, null);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<android.content.pm.ResolveInfo> resolveInfos =
                        pm.queryIntentActivities(intent, 0);

                List<android.content.pm.ResolveInfo> sorted = new ArrayList<>(resolveInfos);
                Collections.sort(sorted, Comparator.comparing(
                        r -> r.loadLabel(pm).toString().toLowerCase()));

                JSONArray array = new JSONArray();
                for (android.content.pm.ResolveInfo info : sorted) {
                    String packageName = info.activityInfo.packageName;
                    String label = info.loadLabel(pm) != null
                            ? info.loadLabel(pm).toString()
                            : packageName;
                    Drawable icon = info.activityInfo.loadIcon(pm);
                    JSONObject item = new JSONObject();
                    item.put("packageName", packageName);
                    item.put("label", label);
                    item.put("iconBase64", iconToBase64(icon));
                    array.put(item);
                }
                return array.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void launchGame(String packageName) {
            try {
                Intent intent = pm.getLaunchIntentForPackage(packageName);
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void vibrate(long milliseconds) {
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(milliseconds);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void recordPlay(String packageName) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                String json = prefs.getString(PREFS_PLAYS, "{}");
                JSONObject stats = new JSONObject(json);
                JSONObject entry;
                if (stats.has(packageName)) {
                    entry = stats.getJSONObject(packageName);
                } else {
                    entry = new JSONObject();
                    entry.put("count", 0);
                    entry.put("lastPlayed", 0L);
                }
                int count = entry.optInt("count", 0) + 1;
                entry.put("count", count);
                entry.put("lastPlayed", System.currentTimeMillis());
                stats.put(packageName, entry);
                editor.putString(PREFS_PLAYS, stats.toString());
                editor.apply();
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String getPlayStats(String packageName) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String json = prefs.getString(PREFS_PLAYS, "{}");
                JSONObject stats = new JSONObject(json);
                if (stats.has(packageName)) {
                    return stats.getJSONObject(packageName).toString();
                }
                return "{\"count\":0,\"lastPlayed\":0}";
            } catch (Exception ignored) {
                return "{\"count\":0,\"lastPlayed\":0}";
            }
        }

        @JavascriptInterface
        public String getAllPlayStats() {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                return prefs.getString(PREFS_PLAYS, "{}");
            } catch (Exception ignored) {
                return "{}";
            }
        }

        private String iconToBase64(Drawable icon) {
            if (icon == null) return "";
            try {
                int width = Math.max(1, icon.getIntrinsicWidth());
                int height = Math.max(1, icon.getIntrinsicHeight());
                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                icon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                icon.draw(canvas);
                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream);
                return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP);
            } catch (Exception ignored) {
                return "";
            }
        }
    }
}
