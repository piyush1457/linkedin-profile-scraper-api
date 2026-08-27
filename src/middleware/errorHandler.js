const { log } = require("../utils/logging");

function errorHandler(err, req, res, _next) {
  log.error("Unhandled error", { error: err.message, stack: err.stack });

  if (res.headersSent) return;

  res.status(500).json({
    success: false,
    profile: null,
    meta: { sourceUrl: "", cached: false, scrapedAt: null },
    error: { code: "SCRAPE_FAILED", message: "Internal server error" },
  });
}

module.exports = { errorHandler };
