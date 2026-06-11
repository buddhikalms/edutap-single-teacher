$ErrorActionPreference = "Stop"

$sdkRoot = "F:\Android\Sdk"
$gradleHome = "F:\Gradle"
$tempRoot = "F:\tmp"
$platformTools = Join-Path $sdkRoot "platform-tools"
$cmdlineTools = Join-Path $sdkRoot "cmdline-tools\latest\bin"

if (-not (Test-Path (Join-Path $platformTools "adb.exe"))) {
  throw "adb.exe was not found at $platformTools. Install Android SDK platform-tools into F:\Android\Sdk first."
}

New-Item -ItemType Directory -Force -Path $gradleHome, $tempRoot | Out-Null

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = $gradleHome
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:Path = "$platformTools;$cmdlineTools;$env:Path"

npx expo run:android @args
