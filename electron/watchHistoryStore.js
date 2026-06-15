const fs = require("fs/promises");
const path = require("path");

function createWatchHistoryStore(filePath) {
  const tempPath = `${filePath}.tmp`;
  let pendingOperation = Promise.resolve();

  const enqueue = (operation) => {
    pendingOperation = pendingOperation.then(operation, operation);
    return pendingOperation;
  };

  return {
    async read() {
      try {
        const content = await fs.readFile(filePath, "utf8");
        const history = JSON.parse(content);
        return Array.isArray(history) ? history : [];
      } catch (error) {
        if (error.code === "ENOENT" || error instanceof SyntaxError) {
          return [];
        }
        throw error;
      }
    },

    async write(history) {
      if (!Array.isArray(history)) {
        throw new TypeError("Watch history must be an array");
      }

      return enqueue(async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(tempPath, JSON.stringify(history), "utf8");
        await fs.rename(tempPath, filePath);
      });
    },

    async clear() {
      return enqueue(async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
      });
    },
  };
}

module.exports = { createWatchHistoryStore };
