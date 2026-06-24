const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getBuildPlan,
  getArmLibraryPaths,
  getApkPath,
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
