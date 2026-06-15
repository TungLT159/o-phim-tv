if (!process.env.GH_TOKEN) {
  console.error([
    "Missing GH_TOKEN for publishing GitHub Releases.",
    "Use `npm run electron:dist:mac` if you only want to build a local DMG.",
    "Use `GH_TOKEN=<your_token> npm run release:mac` to publish macOS auto-update files.",
  ].join("\n"));
  process.exit(1);
}
