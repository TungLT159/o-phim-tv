#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function getBuildPlan(platform = process.platform) {
  return {
    tauriArgs: ['tauri', 'android', 'build', '--apk', '--target', 'armv7'],
    gradleTask: 'assembleArmRelease',
    needsSymlinkFallback: platform === 'win32',
  };
}

function getArmLibraryPaths(rootDir = process.cwd()) {
  return {
    source: toPosix(path.join(rootDir, 'src-tauri', 'target', 'armv7-linux-androideabi', 'release', 'libo_phim_lib.so')),
    destination: toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'jniLibs', 'armeabi-v7a', 'libo_phim_lib.so')),
  };
}

function getAndroidManifestPath(rootDir = process.cwd()) {
  return path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
}

function getAndroidDir(rootDir = process.cwd()) {
  return path.join(rootDir, 'src-tauri', 'gen', 'android');
}

function getApkPath(rootDir = process.cwd()) {
  return toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk', 'arm', 'release', 'app-arm-release.apk'));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    const status = result.status ?? result.signal ?? 'unknown';
    throw new Error(`${command} ${args.join(' ')} failed with status ${status}`);
  }
}

function copyArmLibrary(rootDir = process.cwd()) {
  const paths = getArmLibraryPaths(rootDir);
  if (!fs.existsSync(paths.source)) {
    throw new Error(`Missing native library: ${paths.source}`);
  }

  fs.mkdirSync(path.dirname(paths.destination), { recursive: true });
  fs.copyFileSync(paths.source, paths.destination);
  return paths;
}

function addUsesFeature(manifest, featureName, required) {
  const featurePattern = new RegExp(
    `<uses-feature\\s+android:name=["']${featureName.replace(/\./g, '\\.')}["'][^>]*>`,
  );
  const featureTag = `<uses-feature android:name="${featureName}" android:required="${required}" />`;

  if (featurePattern.test(manifest)) {
    return manifest.replace(featurePattern, featureTag);
  }

  return manifest.replace(/(<manifest\b[^>]*>)/, `$1\n    ${featureTag}`);
}

function ensureGoogleTvManifestCompatibility(manifest) {
  let updated = addUsesFeature(manifest, 'android.software.leanback', 'false');
  updated = addUsesFeature(updated, 'android.hardware.touchscreen', 'false');
  return updated;
}

function updateGoogleTvManifest(rootDir = process.cwd()) {
  const manifestPath = getAndroidManifestPath(rootDir);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing Android manifest: ${toPosix(manifestPath)}`);
  }

  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const updated = ensureGoogleTvManifestCompatibility(manifest);
  if (updated !== manifest) {
    fs.writeFileSync(manifestPath, updated);
  }
}

function findApkSigner() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  const buildToolsDir = path.join(sdkRoot, 'build-tools');
  if (!fs.existsSync(buildToolsDir)) return null;

  const toolName = process.platform === 'win32' ? 'apksigner.bat' : 'apksigner';
  const versions = fs.readdirSync(buildToolsDir).sort().reverse();
  for (const version of versions) {
    const candidate = path.join(buildToolsDir, version, toolName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function verifyApk(apkPath) {
  const apkSigner = findApkSigner();
  if (!apkSigner) {
    console.warn('apksigner not found; skipping signature verification.');
    return;
  }

  run(apkSigner, ['verify', '--verbose', '--print-certs', apkPath]);
}

function buildGoogleTvApk(rootDir = process.cwd()) {
  const plan = getBuildPlan();
  updateGoogleTvManifest(rootDir);
  try {
    run('npx', plan.tauriArgs, { cwd: rootDir });
  } catch (error) {
    if (!plan.needsSymlinkFallback) throw error;
    console.warn('Tauri Android build failed. Applying Windows symlink fallback and running Gradle directly.');
    copyArmLibrary(rootDir);
    const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    run(path.join(getAndroidDir(rootDir), gradle), [plan.gradleTask], { cwd: getAndroidDir(rootDir) });
  }

  const apkPath = getApkPath(rootDir);
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK was not created: ${apkPath}`);
  }

  verifyApk(apkPath);
  console.log(`Google TV signed APK: ${apkPath}`);
  return apkPath;
}

if (require.main === module) {
  try {
    buildGoogleTvApk();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  getBuildPlan,
  getArmLibraryPaths,
  getApkPath,
  ensureGoogleTvManifestCompatibility,
  buildGoogleTvApk,
};
