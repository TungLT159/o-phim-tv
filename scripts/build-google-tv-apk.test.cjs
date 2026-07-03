const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  getBuildPlan,
  getGradleBuildCommand,
  getArmLibraryPaths,
  getApkPath,
  getTauriIconPaths,
  getAndroidLauncherIconPaths,
  getAndroidTvBannerPaths,
  prepareTauriIcons,
  prepareAndroidLauncherIcons,
  prepareAndroidTvBanner,
  ensureGoogleTvManifestCompatibility,
} = require('./build-google-tv-apk.cjs');

test('plans the Tauri ARMv7 APK build for Bravia VH21 Google TV', () => {
  const plan = getBuildPlan('win32');

  assert.deepEqual(plan.tauriArgs, [
    'tauri',
    'android',
    'build',
    '--apk',
    '--target',
    'armv7',
  ]);
  assert.equal(plan.gradleTask, 'assembleArmRelease');
  assert.equal(plan.needsSymlinkFallback, true);
});

test('plans a Gradle reassemble after generated Android resources are patched', () => {
  assert.deepEqual(getGradleBuildCommand('C:/repo', 'win32'), {
    command: 'C:/repo/src-tauri/gen/android/gradlew.bat',
    args: ['assembleArmRelease'],
    cwd: 'C:/repo/src-tauri/gen/android',
  });
});

test('returns the ARMv7 native library copy paths', () => {
  const paths = getArmLibraryPaths('C:/repo');

  assert.equal(
    paths.source,
    'C:/repo/src-tauri/target/armv7-linux-androideabi/release/libo_phim_lib.so',
  );
  assert.equal(
    paths.destination,
    'C:/repo/src-tauri/gen/android/app/src/main/jniLibs/armeabi-v7a/libo_phim_lib.so',
  );
});

test('returns the signed ARMv7 release APK path', () => {
  assert.equal(
    getApkPath('C:/repo'),
    'C:/repo/src-tauri/gen/android/app/build/outputs/apk/arm/release/app-arm-release.apk',
  );
});

test('marks touchscreen optional for Android TV package compatibility', () => {
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />

    <application />
</manifest>`;

  const updated = ensureGoogleTvManifestCompatibility(manifest);

  assert.match(updated, /android\.hardware\.touchscreen" android:required="false"/);
  assert.match(updated, /android\.software\.leanback" android:required="false"/);
});

test('declares the Android TV home banner on the application', () => {
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name" />
</manifest>`;

  const updated = ensureGoogleTvManifestCompatibility(manifest);

  assert.match(updated, /<application[\s\S]*android:banner="@drawable\/banner"/);
});

test('updates an existing Android TV home banner on the application', () => {
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:banner="@drawable/tauri_banner"
        android:icon="@mipmap/ic_launcher" />
</manifest>`;

  const updated = ensureGoogleTvManifestCompatibility(manifest);

  assert.match(updated, /android:banner="@drawable\/banner"/);
  assert.doesNotMatch(updated, /tauri_banner/);
});

test('ensures Android network permissions required for TV video playback', () => {
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application />
</manifest>`;

  const updated = ensureGoogleTvManifestCompatibility(manifest);

  assert.match(updated, /android\.permission\.INTERNET/);
  assert.match(updated, /android\.permission\.ACCESS_NETWORK_STATE/);
});

test('returns the Tauri icon copy paths', () => {
  assert.deepEqual(getTauriIconPaths('C:/repo'), [
    {
      source: 'C:/repo/public/logo.png',
      destination: 'C:/repo/src-tauri/icons/32x32.png',
    },
    {
      source: 'C:/repo/public/logo.png',
      destination: 'C:/repo/src-tauri/icons/128x128.png',
    },
    {
      source: 'C:/repo/public/logo.png',
      destination: 'C:/repo/src-tauri/icons/128x128@2x.png',
    },
    {
      source: 'C:/repo/public/logo.ico',
      destination: 'C:/repo/src-tauri/icons/icon.ico',
    },
  ]);
});

test('returns Android launcher icon paths used by the generated Google TV project', () => {
  assert.deepEqual(getAndroidLauncherIconPaths('C:/repo'), [
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
  ]);
});

test('returns Android TV home banner paths used by Leanback launcher', () => {
  assert.deepEqual(getAndroidTvBannerPaths('C:/repo'), [
    'C:/repo/src-tauri/gen/android/app/src/main/res/drawable/banner.png',
    'C:/repo/src-tauri/gen/android/app/src/main/res/drawable-xhdpi/banner.png',
  ]);
});

test('copies public logo assets into the Tauri icons directory', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.png'), 'logo');
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.ico'), 'logoico');

  const iconPaths = prepareTauriIcons(rootDir);

  assert.equal(iconPaths.length, 4);
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '32x32.png'), 'utf8'), 'logo');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '128x128.png'), 'utf8'), 'logo');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '128x128@2x.png'), 'utf8'), 'logo');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', 'icon.ico'), 'utf8'), 'logoico');
});

test('copies public logo into generated Android launcher icon resources', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'android-launcher-icons-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.png'), 'android-logo');

  const iconPaths = prepareAndroidLauncherIcons(rootDir);

  assert.equal(iconPaths.length, 15);
  for (const iconPath of iconPaths) {
    assert.equal(fs.readFileSync(iconPath, 'utf8'), 'android-logo');
  }
});

test('copies public logo into Android TV home banner resources', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'android-tv-banner-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.png'), 'tv-home-logo');

  const bannerPaths = prepareAndroidTvBanner(rootDir);

  assert.equal(bannerPaths.length, 2);
  for (const bannerPath of bannerPaths) {
    assert.equal(fs.readFileSync(bannerPath, 'utf8'), 'tv-home-logo');
  }
});

test('throws a clear error when a public logo asset is missing', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-missing-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.ico'), 'logoico');

  assert.throws(
    () => prepareTauriIcons(rootDir),
    /Missing public logo asset: .*public.*logo\.png/,
  );
});
