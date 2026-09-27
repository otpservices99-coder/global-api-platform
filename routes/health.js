const express = require("express");

const router = express.Router();

/**
 * GET /health
 * Cloudflare Worker / uptime health check
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "global-api-platform",
    status: "ok",
    platform: "cloudflare-workers",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
