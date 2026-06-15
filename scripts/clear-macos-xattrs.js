const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

if (process.platform !== "darwin") {
  process.exit(0);
}

const root = path.join(__dirname, "..");
const electronBuilderCache = path.join(os.homedir(), "Library", "Caches", "electron-builder");
const targets = [
  path.join(os.homedir(), "Library", "Caches", "electron"),
  electronBuilderCache,
  path.join(root, "node_modules", "electron", "dist"),
  path.join(root, "dist-electron"),
].filter((target) => fs.existsSync(target));

if (fs.existsSync(electronBuilderCache)) {
  for (const entry of fs.readdirSync(electronBuilderCache)) {
    if (entry.startsWith("dmg-builder@")) {
      fs.rmSync(path.join(electronBuilderCache, entry), { force: true, recursive: true });
    }
  }
}

for (const target of targets) {
  const result = spawnSync("xattr", ["-cr", target], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const outputDir = path.join(root, "dist-electron");
const staleArtifacts = fs.existsSync(outputDir)
  ? fs.readdirSync(outputDir)
    .filter((entry) => /\.dmg(\.blockmap)?$/.test(entry))
    .map((entry) => path.join(outputDir, entry))
  : [];

for (const target of staleArtifacts) {
  fs.rmSync(target, { force: true, recursive: true });
}
