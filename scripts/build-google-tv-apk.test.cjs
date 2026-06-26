const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  getBuildPlan,
  getArmLibraryPaths,
  getApkPath,
  getTauriIconPaths,
  prepareTauriIcons,
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

test('returns the Tauri icon copy paths', () => {
  assert.deepEqual(getTauriIconPaths('C:/repo'), [
    {
      source: 'C:/repo/public/logo192.png',
      destination: 'C:/repo/src-tauri/icons/32x32.png',
    },
    {
      source: 'C:/repo/public/logo192.png',
      destination: 'C:/repo/src-tauri/icons/128x128.png',
    },
    {
      source: 'C:/repo/public/logo512.png',
      destination: 'C:/repo/src-tauri/icons/128x128@2x.png',
    },
    {
      source: 'C:/repo/public/logo.ico',
      destination: 'C:/repo/src-tauri/icons/icon.ico',
    },
  ]);
});

test('copies public logo assets into the Tauri icons directory', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo192.png'), 'logo192');
  fs.writeFileSync(path.join(rootDir, 'public', 'logo512.png'), 'logo512');
  fs.writeFileSync(path.join(rootDir, 'public', 'logo.ico'), 'logoico');

  const iconPaths = prepareTauriIcons(rootDir);

  assert.equal(iconPaths.length, 4);
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '32x32.png'), 'utf8'), 'logo192');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '128x128.png'), 'utf8'), 'logo192');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', '128x128@2x.png'), 'utf8'), 'logo512');
  assert.equal(fs.readFileSync(path.join(rootDir, 'src-tauri', 'icons', 'icon.ico'), 'utf8'), 'logoico');
});

test('throws a clear error when a public logo asset is missing', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-missing-'));
  fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'public', 'logo192.png'), 'logo192');
  fs.writeFileSync(path.join(rootDir, 'public', 'logo512.png'), 'logo512');

  assert.throws(
    () => prepareTauriIcons(rootDir),
    /Missing public logo asset: .*public.*logo\.ico/,
  );
});
