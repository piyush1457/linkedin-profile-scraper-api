require("dotenv").config();
const app = require("./app");
const config = require("./config");
const { log } = require("./utils/logging");

const server = app.listen(config.port, () => {
  log.info("Server started", { port: config.port });

  if (!config.storageState) {
    log.warn("LinkedIn session not configured. API requests will fail.", {
      hint: "Set LINKEDIN_COOKIE_HEADER or run 'npm run cookies' to write storageState.json",
    });
  }
});

const shutdown = async (signal) => {
  log.info("Shutting down", { signal });
  server.close(() => process.exit(0));

  setTimeout(() => {
    log.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled rejection", { reason: String(reason) });
});

module.exports = server;
