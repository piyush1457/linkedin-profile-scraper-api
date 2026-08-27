const config = require("../config");

function timeout() {
  return (req, res, next) => {
    req.setTimeout(config.scrape.requestTimeoutMs, () => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          profile: null,
          meta: { sourceUrl: "", cached: false, scrapedAt: null },
          error: { code: "REQUEST_TIMEOUT", message: "Request timed out" },
        });
      }
    });
    next();
  };
}

module.exports = { timeout };
