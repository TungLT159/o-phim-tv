const fs = require('fs');
const path = require('path');

describe('custom NSIS installer script', () => {
  const scriptPath = path.join(
    __dirname,
    '..',
    'dist-electron-installed-icon',
    'test.nsi'
  );

  const testGeneratedNsisScript = fs.existsSync(scriptPath) ? test : test.skip;

  testGeneratedNsisScript('uses the favicon icon for setup and uninstall icons', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    const faviconPath = 'E:\\website-ophim\\app-o-phim\\public\\favicon.ico';

    expect(script).toContain(`!define MUI_ICON "${faviconPath}"`);
    expect(script).toContain(`!define MUI_UNICON "${faviconPath}"`);
    expect(script).toContain(`Icon "${faviconPath}"`);
    expect(script).toContain(`UninstallIcon "${faviconPath}"`);
  });

  test('favicon icon dimensions are compatible with NSIS', () => {
    const iconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    const icon = fs.readFileSync(iconPath);
    const imageCount = icon.readUInt16LE(4);

    expect(icon.readUInt16LE(0)).toBe(0);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(imageCount).toBeGreaterThan(0);

    for (let index = 0; index < imageCount; index += 1) {
      const entryOffset = 6 + index * 16;
      const imageOffset = icon.readUInt32LE(entryOffset + 12);
      const width = icon.readInt32LE(imageOffset + 4);
      const heightWithMask = icon.readInt32LE(imageOffset + 8);

      expect(width).toBeLessThanOrEqual(256);
      expect(heightWithMask / 2).toBeLessThanOrEqual(256);
    }
  });
});
