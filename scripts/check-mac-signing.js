if (process.platform !== "darwin") {
  process.exit(0);
}

const hasCertificate = Boolean(process.env.CSC_LINK || process.env.CSC_NAME);

if (!hasCertificate) {
  console.error([
    "Missing macOS signing credentials for publishing.",
    "Set CSC_LINK and CSC_KEY_PASSWORD, or configure CSC_NAME on a macOS runner with the certificate installed.",
    "Unsigned macOS builds cannot be updated safely because electron-updater validates code signatures.",
  ].join("\n"));
  process.exit(1);
}
