const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const pngToIcoModule = require("png-to-ico");

const pngToIco = pngToIcoModule.default || pngToIcoModule;
const root = path.join(__dirname, "..");
const sourceLogo = path.join(root, "public", "logo.png");
const targetIcon = path.join(root, "public", "favicon.ico");
const temporaryPng = path.join(root, "public", ".favicon-256.png");

function resizeNearestNeighbor(source, size) {
  const output = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.floor((x * source.width) / size);
      const sourceY = Math.floor((y * source.height) / size);
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const outputOffset = (y * size + x) * 4;

      output.data[outputOffset] = source.data[sourceOffset];
      output.data[outputOffset + 1] = source.data[sourceOffset + 1];
      output.data[outputOffset + 2] = source.data[sourceOffset + 2];
      output.data[outputOffset + 3] = source.data[sourceOffset + 3];
    }
  }

  return output;
}

async function generateNsisFavicon() {
  const source = PNG.sync.read(fs.readFileSync(sourceLogo));
  const resized = resizeNearestNeighbor(source, 256);

  fs.writeFileSync(temporaryPng, PNG.sync.write(resized));
  try {
    const icon = await pngToIco([temporaryPng]);
    fs.writeFileSync(targetIcon, icon);
  } finally {
    fs.rmSync(temporaryPng, { force: true });
  }
}

generateNsisFavicon().catch((error) => {
  console.error(error);
  process.exit(1);
});
