#!/bin/bash
set -e

echo "=== Building Android TV APK (Android 7 to 17 Compatible, Custom Banner Logo) ==="

BUILD_DIR="/tmp/android_apk_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/jiotv/iptv"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/bin"
mkdir -p "$BUILD_DIR/gen"

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
if [ ! -f "$ANDROID_JAR" ]; then
  ANDROID_JAR=$(find /usr -name "android.jar" 2>/dev/null | head -n 1)
fi

echo "Using android.jar: $ANDROID_JAR"

# 1. Generate res/values/strings.xml
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">JioTV IPTV</string>
</resources>
EOF

# 2. Copy custom generated app logo banner
BANNER_SRC=$(find src/assets/images -name "tv_app_banner_*.jpg" | head -n 1)
if [ -f "$BANNER_SRC" ]; then
  cp "$BANNER_SRC" "$BUILD_DIR/res/drawable/banner.jpg"
  echo "Copied banner logo from $BANNER_SRC"
else
  # Fallback shape banner
  cat << 'EOF' > "$BUILD_DIR/res/drawable/banner.xml"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#000000" />
    <size android:width="320dp" android:height="180dp" />
</shape>
EOF
fi

# 3. AndroidManifest.xml (minSdk 24 for Android 7, targetSdk 35 for modern Android 17+)
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.jiotv.iptv"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="35" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

    <application
        android:label="@string/app_name"
        android:banner="@drawable/banner"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="keyboard|keyboardHidden|navigation|orientation|screenSize|screenLayout|smallestScreenSize|uiMode"
            android:screenOrientation="landscape"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 4. MainActivity.java
cat << 'EOF' > "$BUILD_DIR/src/com/jiotv/iptv/MainActivity.java"
package com.jiotv.iptv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER));
                return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_UP));
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_DOWN));
                return true;
            case KeyEvent.KEYCODE_DPAD_LEFT:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_LEFT));
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT));
                return true;
            case KeyEvent.KEYCODE_BACK:
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE));
                return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
EOF

# 5. Copy web assets
mkdir -p "$BUILD_DIR/assets"
cp -r ./dist/* "$BUILD_DIR/assets/"

# 6. Generate R.java with AAPT
aapt package -m -J "$BUILD_DIR/gen" -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR"

# 7. Compile Java with javac
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" -d "$BUILD_DIR/bin" \
  "$BUILD_DIR/gen/com/jiotv/iptv/R.java" \
  "$BUILD_DIR/src/com/jiotv/iptv/MainActivity.java"

# 8. Convert bytecode to classes.dex using dx
/usr/lib/android-sdk/build-tools/debian/dx --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"

# 9. Package APK with AAPT
aapt package -f -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -A "$BUILD_DIR/assets" -I "$ANDROID_JAR" -F "$BUILD_DIR/bin/app-unaligned.apk"

# 10. Add classes.dex into APK
cd "$BUILD_DIR/bin"
aapt add "app-unaligned.apk" "classes.dex"

# 11. ZIPALIGN FIRST
zipalign -v -p 4 "app-unaligned.apk" "app-aligned.apk"
cd -

# 12. Generate release keystore if not exists
KEYSTORE="/tmp/jiotv.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkey -v -keystore "$KEYSTORE" -alias jiotv -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass jiotv123 -keypass jiotv123 -dname "CN=JioTV, OU=IPTV, O=TV, L=Delhi, S=DL, C=IN"
fi

# 13. SIGN APK AFTER ZIPALIGN
jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "$KEYSTORE" -storepass jiotv123 -keypass jiotv123 "$BUILD_DIR/bin/app-aligned.apk" jiotv

# Copy final signed & aligned APK
mkdir -p ./public
cp "$BUILD_DIR/bin/app-aligned.apk" ./public/jiotv-android-tv.apk
mkdir -p ./dist
cp "$BUILD_DIR/bin/app-aligned.apk" ./dist/jiotv-android-tv.apk

echo "=== SUCCESS! Valid installable APK built at ./public/jiotv-android-tv.apk ==="
ls -lh ./public/jiotv-android-tv.apk
