# SimplexApp Android 1.0.1

Existing SimplexApp site hosted in a native Android WebView, package `it.simplexapp.store`, Android 8 or newer. Website changes appear without rebuilding the APK. The website/PWA remains available.

APK links selected in the catalogue open a native download confirmation, progress and cancel controls, then Android's package installer. The first installation requires the user's Android “install unknown apps” permission. Installation always remains under the user's control. HTTPS redirects, incomplete files, disk space, APK parsing and a 2 GiB ceiling are checked. Downloads stay in app-private storage and are exposed through a narrowly scoped FileProvider. Web authentication credentials are never forwarded to download hosts. The release does not enable WebView debugging or expose JavaScript interfaces.

The document picker supports APK and other admin file uploads, including multiple image selection. WebView retains its own admin login and cookies; it does not inherit the browser's login. External sites open in the browser. Google authentication must continue in the browser: start again from the catalogue there to keep the PKCE flow in one browser context. Data exports using `blob:` URLs should be performed from the browser in this initial version.

Build with JDK 17, Android SDK 36 and Gradle 8.13:

```
gradle -p android-native testReleaseUnitTest lintRelease assembleRelease
```

CI produces an **unsigned** release APK; this is not installable until signed. The private release key is maintained outside the repository. Future updates must keep the same package ID and signing certificate and increment versionCode.

Checks: URL policy unit tests, Android lint, release build and post-build APK identity/signature verification. A real-phone acceptance check is still required: install SimplexApp, download one catalogue APK, authorize the source, confirm installation, cancel/retry a download and upload an APK from Admin. No production application is installed or removed by CI.

Version 1.0.1 removes the native Home/Reload toolbar. Retry is available by tapping the offline message; Android Back remains available. Web text uses the native Android typeface exposed through public shaping APIs on Android 12+, served in memory only to the local WebView font route. Devices which cannot expose a usable font fall back to WebView system-ui. Font size follows Android fontScale exactly once through textZoom. Logos and text embedded in images retain their original artwork.
