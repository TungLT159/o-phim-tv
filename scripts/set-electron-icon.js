const path = require("path");
const { spawnSync } = require("child_process");
const rceditModule = require("rcedit");

const rcedit = rceditModule.rcedit || rceditModule.default || rceditModule;

module.exports = async function setElectronIcon(context) {
  if (context.electronPlatformName === "darwin") {
    const dotCleanResult = spawnSync("dot_clean", ["-m", context.appOutDir], { stdio: "inherit" });
    if (dotCleanResult.status !== 0) {
      throw new Error(`Failed to clean macOS metadata from ${context.appOutDir}`);
    }

    const result = spawnSync("xattr", ["-cr", context.appOutDir], { stdio: "inherit" });
    if (result.status !== 0) {
      throw new Error(`Failed to clear macOS extended attributes from ${context.appOutDir}`);
    }
    return;
  }

  if (context.electronPlatformName !== "win32") return;

  const iconPath = path.join(context.packager.projectDir, "public", "logo.ico");
  const executableName = `${context.packager.appInfo.productFilename}.exe`;
  const executablePath = path.join(context.appOutDir, executableName);

  await rcedit(executablePath, {
    icon: iconPath,
  });
};
