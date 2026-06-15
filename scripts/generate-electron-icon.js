const fs = require("fs");
const path = require("path");
const pngToIcoModule = require("png-to-ico");

const pngToIco = pngToIcoModule.default || pngToIcoModule;
const root = path.join(__dirname, "..");
const sourceLogo = path.join(root, "public", "logo.png");
const targetIcon = path.join(root, "public", "logo.ico");

async function generateElectronIcon() {
  const icon = await pngToIco([sourceLogo]);
  fs.writeFileSync(targetIcon, icon);
}

generateElectronIcon().catch((error) => {
  console.error(error);
  process.exit(1);
});
