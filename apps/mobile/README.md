# EduTap Mobile

React Native attendance terminal for teachers and staff. This app uses Expo Dev Build, not Expo Go, because NFC requires native support through `react-native-nfc-manager`.

## Features

- Staff login with secure token storage through `expo-secure-store`
- Dashboard with today classes, active sessions, pending dues, and recent scans
- Branch and class selection
- Start or continue an attendance session
- NFC UID attendance using `react-native-nfc-manager`
- QR attendance using `expo-camera`
- Manual present, absent, late, and excused marking
- Student quick view with attendance and payment context

## Configure API URL

Create `.env` in `apps/mobile`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Use your computer LAN IP, not `localhost`, when testing on a physical Android device. The login screen also lets staff override the backend URL for development.

## Install

```bash
cd apps/mobile
npm install
```

## Run With Expo Dev Build

```bash
cd apps/mobile
npm run android
npm start
```

Scan the dev-client QR with the installed development build. Do not use Expo Go for NFC.

## Build APK With EAS

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The `preview` profile outputs an internal APK.

## Local Android Build

Install Android Studio, Android SDK, and set `ANDROID_HOME`, then run:

```bash
cd apps/mobile
npm run android
```

Expo prebuild will generate native Android files and install the dev build on a connected device or emulator.

This project is configured for a low-C-drive Windows machine:

- Android SDK: `F:\Android\Sdk`
- Gradle cache: `F:\Gradle`
- Temporary build files: `F:\tmp`
- Gradle local SDK pointer: `android/local.properties`
- The `npm run android` script sets these paths automatically through `scripts/android.ps1`

To build a debug APK without installing to a device:

```powershell
$env:ANDROID_HOME="F:\Android\Sdk"
$env:ANDROID_SDK_ROOT="F:\Android\Sdk"
$env:GRADLE_USER_HOME="F:\Gradle"
$env:TEMP="F:\tmp"
$env:TMP="F:\tmp"
$env:Path="F:\Android\Sdk\platform-tools;F:\Android\Sdk\cmdline-tools\latest\bin;$env:Path"
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon --console=plain
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Backend Endpoints Used

- `POST /api/mobile/auth/login`
- `GET /api/mobile/bootstrap`
- `POST /api/mobile/attendance/session/start`
- `GET /api/mobile/classes/:classGroupId/students`
- `POST /api/attendance/nfc`
- `POST /api/attendance/qr`
- `POST /api/mobile/attendance/manual`
- `GET /api/mobile/students/:studentId`

## Testing Checklist

1. Run the Next.js backend on a LAN-visible host: `npm run dev -- --hostname 0.0.0.0`
2. In the mobile login screen, set backend URL to `http://YOUR_LAN_IP:3000`
3. Sign in with a staff or admin account
4. Select a branch and class, then start a session
5. NFC: tap a student card whose UID is saved in the student profile
6. QR: scan a student QR code containing the secure attendance token
7. Manual: mark a few students and save
8. Open Student Quick View and confirm payment and attendance summaries

## NFC Notes

Android NFC works in the dev build when the device has NFC hardware enabled. iOS NFC support can require additional Apple entitlements and hardware support; Android is the recommended first testing target.
