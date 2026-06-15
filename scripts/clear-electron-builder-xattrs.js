const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function clearXattrs(target) {
  if (!target || !fs.existsSync(target)) return;

  const dotCleanResult = spawnSync("dot_clean", ["-m", target], { stdio: "inherit" });
  if (dotCleanResult.status !== 0) {
    throw new Error(`Failed to clean macOS metadata from ${target}`);
  }

  const result = spawnSync("xattr", ["-cr", target], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Failed to clear macOS extended attributes from ${target}`);
  }
}

module.exports = async function clearElectronBuilderXattrs(context) {
  if (context.electronPlatformName !== "darwin") return;

  clearXattrs(context.appOutDir);
  const productFilename = context.packager?.appInfo?.productFilename;
  if (productFilename) {
    clearXattrs(path.join(context.appOutDir, `${productFilename}.app`));
  }
};
