# GameVault

An offline Android app for tracking your game library: add games with platform, genre, status, rating and notes, then search, filter and sort them. Data is stored on the device.

## Build

Requirements: JDK 17 and the Android SDK (platform 34, build-tools 34.0.0). Point `local.properties` at your SDK or set `ANDROID_HOME`.

```sh
./gradlew assembleDebug
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`. Install it with `adb install` or copy it to a phone.

The UI lives in `app/src/main/assets/` (`index.html`, `styles.css`, `app.js`) and is rendered by a single WebView activity in `MainActivity.java`.
