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

function getGradleBuildCommand(rootDir = process.cwd(), platform = process.platform) {
  const plan = getBuildPlan(platform);
  const androidDir = getAndroidDir(rootDir);
  const gradle = platform === 'win32' ? 'gradlew.bat' : './gradlew';
  return {
    command: toPosix(path.join(androidDir, gradle)),
    args: [plan.gradleTask],
    cwd: toPosix(androidDir),
  };
}

function getApkPath(rootDir = process.cwd()) {
  return toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk', 'arm', 'release', 'app-arm-release.apk'));
}

function getTauriIconPaths(rootDir = process.cwd()) {
  return [
    {
      source: toPosix(path.join(rootDir, 'public', 'logo.png')),
      destination: toPosix(path.join(rootDir, 'src-tauri', 'icons', '32x32.png')),
    },
    {
      source: toPosix(path.join(rootDir, 'public', 'logo.png')),
      destination: toPosix(path.join(rootDir, 'src-tauri', 'icons', '128x128.png')),
    },
    {
      source: toPosix(path.join(rootDir, 'public', 'logo.png')),
      destination: toPosix(path.join(rootDir, 'src-tauri', 'icons', '128x128@2x.png')),
    },
    {
      source: toPosix(path.join(rootDir, 'public', 'logo.ico')),
      destination: toPosix(path.join(rootDir, 'src-tauri', 'icons', 'icon.ico')),
    },
  ];
}

function getAndroidLauncherIconPaths(rootDir = process.cwd()) {
  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const names = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];
  return densities.flatMap((density) =>
    names.map((name) =>
      toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, name)),
    ),
  );
}

function getAndroidTvBannerPaths(rootDir = process.cwd()) {
  return ['drawable', 'drawable-xhdpi'].map((directory) =>
    toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res', directory, 'banner.png')),
  );
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

function prepareTauriIcons(rootDir = process.cwd()) {
  const iconPaths = getTauriIconPaths(rootDir);
  for (const iconPath of iconPaths) {
    if (!fs.existsSync(iconPath.source)) {
      throw new Error(`Missing public logo asset: ${iconPath.source}`);
    }
  }

  for (const iconPath of iconPaths) {
    fs.mkdirSync(path.dirname(iconPath.destination), { recursive: true });
    fs.copyFileSync(iconPath.source, iconPath.destination);
  }

  return iconPaths;
}

function prepareAndroidLauncherIcons(rootDir = process.cwd()) {
  const source = path.join(rootDir, 'public', 'logo.png');
  if (!fs.existsSync(source)) {
    throw new Error(`Missing public logo asset: ${toPosix(source)}`);
  }

  const iconPaths = getAndroidLauncherIconPaths(rootDir);
  for (const iconPath of iconPaths) {
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.copyFileSync(source, iconPath);
  }

  return iconPaths;
}

function prepareAndroidTvBanner(rootDir = process.cwd()) {
  const source = path.join(rootDir, 'public', 'logo.png');
  if (!fs.existsSync(source)) {
    throw new Error(`Missing public logo asset: ${toPosix(source)}`);
  }

  const bannerPaths = getAndroidTvBannerPaths(rootDir);
  for (const bannerPath of bannerPaths) {
    fs.mkdirSync(path.dirname(bannerPath), { recursive: true });
    fs.copyFileSync(source, bannerPath);
  }

  return bannerPaths;
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

function addUsesPermission(manifest, permissionName) {
  const permissionPattern = new RegExp(
    `<uses-permission\\s+android:name=["']${permissionName.replace(/\./g, '\\.')}["'][^>]*>`,
  );
  const permissionTag = `<uses-permission android:name="${permissionName}" />`;

  if (permissionPattern.test(manifest)) {
    return manifest;
  }

  return manifest.replace(/(<manifest\b[^>]*>)/, `$1\n    ${permissionTag}`);
}

function setApplicationAttribute(manifest, attributeName, attributeValue) {
  return manifest.replace(/<application\b[^>]*>/, (applicationTag) => {
    const attributePattern = new RegExp(`\\s+${attributeName}=["'][^"']*["']`);
    if (attributePattern.test(applicationTag)) {
      return applicationTag.replace(attributePattern, `\n        ${attributeName}="${attributeValue}"`);
    }

    return applicationTag.replace(/\s*>$/, `\n        ${attributeName}="${attributeValue}">`);
  });
}

function ensureGoogleTvManifestCompatibility(manifest) {
  let updated = addUsesPermission(manifest, 'android.permission.INTERNET');
  updated = addUsesPermission(updated, 'android.permission.ACCESS_NETWORK_STATE');
  updated = addUsesFeature(updated, 'android.software.leanback', 'false');
  updated = addUsesFeature(updated, 'android.hardware.touchscreen', 'false');
  updated = setApplicationAttribute(updated, 'android:banner', '@drawable/banner');
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
  prepareTauriIcons(rootDir);
  prepareAndroidLauncherIcons(rootDir);
  prepareAndroidTvBanner(rootDir);
  updateGoogleTvManifest(rootDir);
  try {
    run('npx', plan.tauriArgs, { cwd: rootDir });
  } catch (error) {
    if (!plan.needsSymlinkFallback) throw error;
    console.warn('Tauri Android build failed. Applying Windows symlink fallback and running Gradle directly.');
    copyArmLibrary(rootDir);
  }

  prepareAndroidLauncherIcons(rootDir);
  prepareAndroidTvBanner(rootDir);
  updateGoogleTvManifest(rootDir);
  const gradleBuild = getGradleBuildCommand(rootDir);
  run(gradleBuild.command, gradleBuild.args, { cwd: gradleBuild.cwd });

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
  buildGoogleTvApk,
};
