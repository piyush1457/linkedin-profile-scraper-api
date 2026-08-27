const fs = require("fs");
const path = require("path");
const { cookieHeaderToStorageState } = require("./services/session");

function loadStorageState() {
  // 0. Cookie header from env (link-pasted, no browser required)
  const cookieHeader = process.env.LINKEDIN_COOKIE_HEADER;
  if (cookieHeader && cookieHeader.trim()) {
    const state = cookieHeaderToStorageState(cookieHeader);
    if (state.cookies.length) return state;
  }

  // 1. Try inline JSON env var (LINKEDIN_STORAGE_STATE, legacy PLAYWRIGHT_STORAGE_STATE)
  const raw = process.env.LINKEDIN_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // might be a file path
    }
  }

  // 2. Try file path from env var
  const filePath =
    process.env.LINKEDIN_STORAGE_STATE_FILE ||
    process.env.PLAYWRIGHT_STORAGE_STATE_FILE ||
    (raw && !raw.startsWith("{") ? raw : null);
  if (filePath) {
    try {
      const resolved = path.resolve(filePath);
      if (fs.existsSync(resolved)) {
        return JSON.parse(fs.readFileSync(resolved, "utf-8"));
      }
    } catch {
      // fall through
    }
  }

  // 3. Try storageState.json in project root
  const defaultPath = path.join(__dirname, "..", "storageState.json");
  if (fs.existsSync(defaultPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
    } catch {
      // fall through
    }
  }

  return null;
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,

  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 10800,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  },

  scrape: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SCRAPES, 10) || 2,
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 45000,
  },

  get storageState() {
    return loadStorageState();
  },
};

module.exports = config;
