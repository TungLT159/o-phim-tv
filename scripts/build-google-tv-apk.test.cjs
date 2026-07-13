const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const packageJson = require('../package.json');

const {
  getBuildPlan,
  getGradleCleanCommand,
  getGradleBuildCommand,
  getRustCleanCommand,
  getFrontendBuildDir,
  getFrontendBuildCommand,
  getFrontendBuildOutputPath,
  validateFreshFrontendBuild,
  cleanStaleAndroidBuildOutputs,
  validateFreshArmLibrary,
  validateFreshApk,
  getArmLibraryPaths,
  getApkPath,
  getTauriIconPaths,
  getAndroidLauncherIconPaths,
  getAndroidTvBannerPaths,
  getAndroidTauriPropertiesPath,
  prepareTauriIcons,
  prepareAndroidLauncherIcons,
  prepareAndroidTvBanner,
  ensureFreshAndroidVersion,
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

test('routes the default Android APK build through the cache-safe Google TV builder', () => {
  assert.equal(packageJson.scripts['tauri:android:build'], 'npm run tauri:android:build:google-tv');
  assert.equal(packageJson.scripts['tauri:android:build:raw'], 'tauri android build');
});

test('plans a Gradle clean before generated Android resources are patched', () => {
  assert.deepEqual(getGradleCleanCommand('C:/repo', 'win32'), {
    command: 'C:/repo/src-tauri/gen/android/gradlew.bat',
    args: ['clean'],
    cwd: 'C:/repo/src-tauri/gen/android',
  });
});

test('plans a Gradle reassemble after generated Android resources are patched', () => {
  assert.deepEqual(getGradleBuildCommand('C:/repo', 'win32'), {
    command: 'C:/repo/src-tauri/gen/android/gradlew.bat',
    args: ['assembleArmRelease'],
    cwd: 'C:/repo/src-tauri/gen/android',
  });
});

test('plans a Rust package clean so Tauri embeds the latest frontend build', () => {
  assert.deepEqual(getRustCleanCommand('C:/repo'), {
    command: 'cargo',
    args: ['clean', '--target', 'armv7-linux-androideabi'],
    cwd: 'C:/repo/src-tauri',
  });
});

test('returns the React production build directory for cache cleanup', () => {
  assert.equal(getFrontendBuildDir('C:/repo'), 'C:/repo/build');
});

test('plans a fresh React production build before Android packaging', () => {
  assert.deepEqual(getFrontendBuildCommand('C:/repo'), {
    command: 'npm',
    args: ['run', 'build'],
    cwd: 'C:/repo',
  });
});

test('returns the React production build output path', () => {
  assert.equal(getFrontendBuildOutputPath('C:/repo'), 'C:/repo/build/index.html');
});

test('throws a clear error when the React production build output is missing', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-build-missing-'));

  assert.throws(
    () => validateFreshFrontendBuild(rootDir),
    /Missing React build output: .*build.*index\.html/,
  );
});

test('throws a clear error when the React production build output is stale', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-build-stale-'));
  const outputPath = path.join(rootDir, 'build', 'index.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, '<html></html>');
  const startedAt = Date.now();
  const staleTime = new Date(startedAt - 3000);
  fs.utimesSync(outputPath, staleTime, staleTime);

  assert.throws(
    () => validateFreshFrontendBuild(rootDir, startedAt),
    /Stale React build output: .*build.*index\.html/,
  );
});

test('returns the fresh React production build output path', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-build-fresh-'));
  const outputPath = path.join(rootDir, 'build', 'index.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, '<html></html>');
  const startedAt = Date.now();

  assert.equal(validateFreshFrontendBuild(rootDir, startedAt), outputPath.replace(/\\/g, '/'));
});

test('removes stale native library and APK outputs before Google TV packaging', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-android-output-'));
  const armPaths = getArmLibraryPaths(rootDir);
  const apkPath = getApkPath(rootDir);
  [armPaths.source, armPaths.destination, apkPath].forEach((filePath) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'stale');
  });

  const removed = cleanStaleAndroidBuildOutputs(rootDir);

  assert.deepEqual(removed, [armPaths.source, armPaths.destination, apkPath]);
  assert.equal(fs.existsSync(armPaths.source), false);
  assert.equal(fs.existsSync(armPaths.destination), false);
  assert.equal(fs.existsSync(apkPath), false);
});

test('removes the stale React build directory before rebuilding frontend assets', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-react-build-dir-'));
  const staleBuildFile = path.join(rootDir, 'build', 'static', 'js', 'old.js');
  fs.mkdirSync(path.dirname(staleBuildFile), { recursive: true });
  fs.writeFileSync(staleBuildFile, 'old frontend');

  const removed = cleanStaleAndroidBuildOutputs(rootDir);

  assert.ok(removed.includes(getFrontendBuildDir(rootDir)));
  assert.equal(fs.existsSync(path.join(rootDir, 'build')), false);
});

test('throws when the ARM native library was not rebuilt freshly', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-arm-lib-'));
  const armPaths = getArmLibraryPaths(rootDir);
  [armPaths.source, armPaths.destination].forEach((filePath) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'old native lib');
    const staleTime = new Date(Date.now() - 3000);
    fs.utimesSync(filePath, staleTime, staleTime);
  });

  assert.throws(
    () => validateFreshArmLibrary(rootDir, Date.now()),
    /Stale ARM native library: .*libo_phim_lib\.so/,
  );
});

test('returns fresh ARM native library paths after rebuild and copy', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-arm-lib-'));
  const armPaths = getArmLibraryPaths(rootDir);
  const startedAt = Date.now();
  [armPaths.source, armPaths.destination].forEach((filePath) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'fresh native lib');
  });

  assert.deepEqual(validateFreshArmLibrary(rootDir, startedAt), armPaths);
});

test('throws when the final Google TV APK is stale', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-google-tv-apk-'));
  const apkPath = getApkPath(rootDir);
  fs.mkdirSync(path.dirname(apkPath), { recursive: true });
  fs.writeFileSync(apkPath, 'old apk');
  const staleTime = new Date(Date.now() - 3000);
  fs.utimesSync(apkPath, staleTime, staleTime);

  assert.throws(
    () => validateFreshApk(rootDir, Date.now()),
    /Stale Google TV APK: .*app-arm-release\.apk/,
  );
});

test('returns the fresh Google TV APK path', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-google-tv-apk-'));
  const apkPath = getApkPath(rootDir);
  const startedAt = Date.now();
  fs.mkdirSync(path.dirname(apkPath), { recursive: true });
  fs.writeFileSync(apkPath, 'fresh apk');

  assert.equal(validateFreshApk(rootDir, startedAt), apkPath);
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

test('returns generated Android freshness patch paths', () => {
  assert.equal(
    getAndroidTauriPropertiesPath('C:/repo'),
    'C:/repo/src-tauri/gen/android/app/tauri.properties',
  );
});

test('bumps Android versionCode so TV installs cannot reuse an old APK version', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'android-version-fresh-'));
  const propertiesPath = getAndroidTauriPropertiesPath(rootDir);
  fs.mkdirSync(path.dirname(propertiesPath), { recursive: true });
  fs.writeFileSync(propertiesPath, 'tauri.android.versionName=0.4.5\ntauri.android.versionCode=4005\n');

  const versionCode = ensureFreshAndroidVersion(rootDir, 1700000000123);

  assert.equal(versionCode, 1700000000);
  assert.match(fs.readFileSync(propertiesPath, 'utf8'), /tauri\.android\.versionCode=1700000000/);
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
