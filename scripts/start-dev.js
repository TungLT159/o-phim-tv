const { spawn } = require("child_process");

const isWindows = process.platform === "win32";

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    ...options,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
}

const apiServer = run("node", ["server.js"], {
  env: {
    ...process.env,
    PORT: "3001",
  },
});

const reactApp = run("npm", ["run", "start:react"], {
  env: process.env,
});

function shutdown() {
  apiServer.kill();
  reactApp.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
