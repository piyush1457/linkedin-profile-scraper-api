const { scrapeProfile } = require("./linkedin");
const { profileCache } = require("./cache");
const config = require("../config");
const { log } = require("../utils/logging");

let activeScrapes = 0;
const scrapeQueue = [];

function processQueue() {
  if (scrapeQueue.length === 0) return;
  if (activeScrapes >= config.scrape.maxConcurrent) return;

  const { normalizedUrl, storageState, resolve, reject } = scrapeQueue.shift();
  activeScrapes++;

  scrapeProfile(normalizedUrl, storageState)
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeScrapes--;
      processQueue();
    });
}

function enqueueScrape(normalizedUrl, storageState) {
  return new Promise((resolve, reject) => {
    scrapeQueue.push({ normalizedUrl, storageState, resolve, reject });
    processQueue();
  });
}

async function getProfile(normalizedUrl, storageState) {
  const cached = profileCache.get(normalizedUrl);
  if (cached) {
    log.info("Cache hit", { url: normalizedUrl });
    return { ...cached, meta: { ...cached.meta, cached: true } };
  }

  if (activeScrapes >= config.scrape.maxConcurrent) {
    log.warn("Concurrency limit reached, queuing", { url: normalizedUrl, active: activeScrapes });
  }

  const startTime = Date.now();
  const result = await enqueueScrape(normalizedUrl, storageState);
  const duration = Date.now() - startTime;

  if (result.state === "OK" && result.profile) {
    const response = {
      success: true,
      profile: result.profile,
      meta: {
        sourceUrl: normalizedUrl,
        cached: false,
        scrapedAt: new Date().toISOString(),
      },
      error: null,
    };

    profileCache.set(normalizedUrl, response);
    log.info("Scrape successful", { url: normalizedUrl, duration });
    return response;
  }

  const errorMap = {
    LOGIN_WALL: { code: "AUTHENTICATION_REQUIRED", httpStatus: 401 },
    AUTH_WALL: { code: "AUTHENTICATION_REQUIRED", httpStatus: 401 },
    CHALLENGE: { code: "CHALLENGE_DETECTED", httpStatus: 403 },
    NOT_FOUND: { code: "PROFILE_NOT_FOUND", httpStatus: 404 },
    RATE_LIMITED: { code: "RATE_LIMITED", httpStatus: 429 },
  };

  const mapped = errorMap[result.state] || { code: "SCRAPE_FAILED", httpStatus: 502 };

  log.warn("Scrape failed", { url: normalizedUrl, state: result.state, duration });

  return {
    success: false,
    profile: null,
    meta: {
      sourceUrl: normalizedUrl,
      cached: false,
      scrapedAt: null,
    },
    error: { code: mapped.code, message: `Profile extraction failed: ${result.state}` },
    httpStatus: mapped.httpStatus,
  };
}

module.exports = { getProfile };
