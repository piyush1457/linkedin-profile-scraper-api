const express = require("express");
const config = require("../config");
const { getSession } = require("../services/session");
const router = express.Router();

router.get("/health", (req, res) => {
  let session = null;
  try {
    const state = config.storageState;
    if (state) {
      const s = getSession(state);
      session = {
        present: true,
        valid: s.valid,
        hasLiAt: !!s.jar.get("li_at"),
        hasJsession: !!s.jar.get("JSESSIONID"),
        csrfPresent: !!s.csrfToken,
        cookieCount: s.jar.size,
      };
    } else {
      session = { present: false, valid: false };
    }
  } catch (e) {
    session = { present: false, valid: false, error: e.message };
  }
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    session,
  });
});

module.exports = router;
