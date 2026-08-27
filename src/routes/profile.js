const express = require("express");
const { getProfile } = require("../services/profileService");
const { validateLinkedInProfileUrl } = require("../utils/url");
const config = require("../config");

const router = express.Router();

router.get("/api/profile", async (req, res) => {
  const urlParam = req.query.url;

  if (!urlParam) {
    return res.status(400).json({
      success: false,
      profile: null,
      meta: { sourceUrl: "", cached: false, scrapedAt: null },
      error: { code: "INVALID_URL", message: "Missing required parameter: url" },
    });
  }

  const validation = validateLinkedInProfileUrl(urlParam);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      profile: null,
      meta: { sourceUrl: "", cached: false, scrapedAt: null },
      error: { code: validation.error, message: validation.message },
    });
  }

  const storageState = config.storageState;
  if (!storageState) {
    return res.status(500).json({
      success: false,
      profile: null,
      meta: { sourceUrl: validation.normalized, cached: false, scrapedAt: null },
      error: {
        code: "SERVER_CONFIGURATION_ERROR",
        message: "Authentication state not configured",
      },
    });
  }

  try {
    const result = await getProfile(validation.normalized, storageState);
    const httpStatus = result.httpStatus || (result.success ? 200 : 502);
    delete result.httpStatus;
    res.status(httpStatus).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      profile: null,
      meta: { sourceUrl: validation.normalized, cached: false, scrapedAt: null },
      error: { code: "SCRAPE_FAILED", message: "Internal scraping error" },
    });
  }
});

module.exports = router;
