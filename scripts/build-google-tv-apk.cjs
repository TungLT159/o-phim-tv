#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FRONTEND_BUILD_TIMESTAMP_TOLERANCE_MS = 2000;

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

function getAndroidTauriPropertiesPath(rootDir = process.cwd()) {
  return toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'tauri.properties'));
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

function getGradleCleanCommand(rootDir = process.cwd(), platform = process.platform) {
  const androidDir = getAndroidDir(rootDir);
  const gradle = platform === 'win32' ? 'gradlew.bat' : './gradlew';
  return {
    command: toPosix(path.join(androidDir, gradle)),
    args: ['clean'],
    cwd: toPosix(androidDir),
  };
}

function getRustCleanCommand(rootDir = process.cwd()) {
  return {
    command: 'cargo',
    args: ['clean', '--target', 'armv7-linux-androideabi'],
    cwd: toPosix(path.join(rootDir, 'src-tauri')),
  };
}

function getApkPath(rootDir = process.cwd()) {
  return toPosix(path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk', 'arm', 'release', 'app-arm-release.apk'));
}

function getFrontendBuildCommand(rootDir = process.cwd()) {
  return { command: 'npm', args: ['run', 'build'], cwd: toPosix(rootDir) };
}

function getFrontendBuildDir(rootDir = process.cwd()) {
  return toPosix(path.join(rootDir, 'build'));
}

function getFrontendBuildOutputPath(rootDir = process.cwd()) {
  return toPosix(path.join(getFrontendBuildDir(rootDir), 'index.html'));
}

function validateFreshFrontendBuild(rootDir = process.cwd(), startedAt = Date.now()) {
  const outputPath = getFrontendBuildOutputPath(rootDir);
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Missing React build output: ${outputPath}`);
  }

  const stats = fs.statSync(outputPath);
  if (stats.mtimeMs + FRONTEND_BUILD_TIMESTAMP_TOLERANCE_MS < startedAt) {
    throw new Error(`Stale React build output: ${outputPath}`);
  }

  return outputPath;
}

function validateFreshFile(filePath, startedAt, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (stats.mtimeMs + FRONTEND_BUILD_TIMESTAMP_TOLERANCE_MS < startedAt) {
    throw new Error(`Stale ${label}: ${filePath}`);
  }

  return filePath;
}

function validateFreshArmLibrary(rootDir = process.cwd(), startedAt = Date.now()) {
  const paths = getArmLibraryPaths(rootDir);
  validateFreshFile(paths.source, startedAt, 'ARM native library');
  validateFreshFile(paths.destination, startedAt, 'ARM native library');
  return paths;
}

function validateFreshApk(rootDir = process.cwd(), startedAt = Date.now()) {
  return validateFreshFile(getApkPath(rootDir), startedAt, 'Google TV APK');
}

function cleanStaleAndroidBuildOutputs(rootDir = process.cwd()) {
  const armPaths = getArmLibraryPaths(rootDir);
  const outputPaths = [getFrontendBuildDir(rootDir), armPaths.source, armPaths.destination, getApkPath(rootDir)];
  const removed = [];

  for (const outputPath of outputPaths) {
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { force: true, recursive: true });
      removed.push(outputPath);
    }
  }

  return removed;
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

function buildFrontend(rootDir = process.cwd()) {
  const startedAt = Date.now();
  const frontendBuild = getFrontendBuildCommand(rootDir);
  run(frontendBuild.command, frontendBuild.args, { cwd: frontendBuild.cwd });
  return validateFreshFrontendBuild(rootDir, startedAt);
}

function cleanRustPackage(rootDir = process.cwd()) {
  const rustClean = getRustCleanCommand(rootDir);
  run(rustClean.command, rustClean.args, { cwd: rustClean.cwd });
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

function ensureFreshAndroidVersion(rootDir = process.cwd(), now = Date.now()) {
  const propertiesPath = getAndroidTauriPropertiesPath(rootDir);
  if (!fs.existsSync(propertiesPath)) {
    throw new Error(`Missing Android Tauri properties: ${propertiesPath}`);
  }

  const versionCode = Math.floor(now / 1000);
  const properties = fs.readFileSync(propertiesPath, 'utf8');
  const updated = /tauri\.android\.versionCode=\d+/.test(properties)
    ? properties.replace(/tauri\.android\.versionCode=\d+/, `tauri.android.versionCode=${versionCode}`)
    : `${properties.trimEnd()}\ntauri.android.versionCode=${versionCode}\n`;
  fs.writeFileSync(propertiesPath, updated);
  return versionCode;
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
  const androidBuildStartedAt = Date.now();
  cleanStaleAndroidBuildOutputs(rootDir);
  buildFrontend(rootDir);
  cleanRustPackage(rootDir);
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

  validateFreshArmLibrary(rootDir, androidBuildStartedAt);
  prepareAndroidLauncherIcons(rootDir);
  prepareAndroidTvBanner(rootDir);
  updateGoogleTvManifest(rootDir);
  const gradleClean = getGradleCleanCommand(rootDir);
  run(gradleClean.command, gradleClean.args, { cwd: gradleClean.cwd });
  ensureFreshAndroidVersion(rootDir, androidBuildStartedAt);
  const gradleBuild = getGradleBuildCommand(rootDir);
  run(gradleBuild.command, gradleBuild.args, { cwd: gradleBuild.cwd });

  const apkPath = validateFreshApk(rootDir, androidBuildStartedAt);

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
  buildFrontend,
  cleanRustPackage,
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
  buildGoogleTvApk,
};
