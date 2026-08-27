const config = require("../config");
const { log } = require("../utils/logging");

function rateLimit() {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of hits) {
      if (now - data.windowStart > config.rateLimit.windowMs) {
        hits.delete(key);
      }
    }
  }, config.rateLimit.windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now - entry.windowStart > config.rateLimit.windowMs) {
      hits.set(ip, { windowStart: now, count: 1 });
      return next();
    }

    entry.count++;
    if (entry.count > config.rateLimit.maxRequests) {
      log.warn("Rate limit exceeded", { ip });
      return res.status(429).json({
        success: false,
        profile: null,
        meta: { sourceUrl: "", cached: false, scrapedAt: null },
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
      });
    }

    next();
  };
}

module.exports = { rateLimit };
