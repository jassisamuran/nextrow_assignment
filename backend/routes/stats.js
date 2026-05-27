const express = require("express");
const router = express.Router();
const statsService = require("../statsService");
const semanticCache = require("../semanticCache");

router.get("/", async (req, res) => {
  try {
    const stats = await statsService.getStats();

    const cacheHitRate =
      stats.totalRequests > 0
        ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(1)
        : "0.0";

    const llmRouteRate =
      stats.totalRequests > 0
        ? ((stats.llmRouted / stats.totalRequests) * 100).toFixed(1)
        : "0.0";

    const rulesRouteRate =
      stats.totalRequests > 0
        ? ((stats.rulesRouted / stats.totalRequests) * 100).toFixed(1)
        : "0.0";

    return res.json({
      success: true,
      stats: {
        ...stats,
        derived: {
          cacheHitRate: `${cacheHitRate}%`,
          llmRouteRate: `${llmRouteRate}%`,
          rulesRouteRate: `${rulesRouteRate}%`,
          costFormattedUSD: `$${stats.totalCostUSD.toFixed(4)}`,
          avgCostPerLLMCall:
            stats.llmRouted > 0
              ? `$${(stats.totalCostUSD / stats.llmRouted).toFixed(6)}`
              : "$0.000000",
        },
      },
      thresholds: {
        cacheSimilarity: semanticCache.THRESHOLD,
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      },
    });
  } catch (err) {
    console.error("[/api/stats] Error:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  try {
    const history = await statsService.getHistory(limit);
    return res.json({ success: true, count: history.length, history });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/cache", async (req, res) => {
  try {
    const entries = await semanticCache.listCacheEntries();
    return res.json({
      success: true,
      count: entries.length,
      threshold: semanticCache.THRESHOLD,
      entries,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list cache entries" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    await statsService.resetStats();
    return res.json({ success: true, message: "Stats reset successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reset stats" });
  }
});

router.post("/cache/clear", async (req, res) => {
  try {
    const cleared = await semanticCache.clearCache();
    return res.json({
      success: true,
      message: `Cleared ${cleared} cache entries`,
      cleared,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to clear cache" });
  }
});

module.exports = router;