# Lubna Mobile Setup (Capacitor iOS + Android)

## Add Targets

```bash
pnpm --filter @lubna/web add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
pnpm --filter @lubna/web exec npx cap init Lubna com.lubna.app --web-dir dist
pnpm --filter @lubna/web exec npx cap add ios
pnpm --filter @lubna/web exec npx cap add android
pnpm --filter @lubna/web build
pnpm --filter @lubna/web exec npx cap sync
```

## iOS Info.plist

Add to `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Lubna needs your mic so you can talk to her like calling a friend</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Lubna listens to what you say and responds in your language</string>
<key>NSCameraUsageDescription</key>
<string>Show Lubna your outfit and she'll style you</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Share photos with Lubna — outfits, inspo, anything</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save images Lubna suggests to your library</string>
```

## Android Manifest

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

Add deep link intent filter:

```xml
<activity android:name="com.getcapacitor.BrowserActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.lubna.app" android:host="auth" />
  </intent-filter>
</activity>
```
