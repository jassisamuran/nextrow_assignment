const express = require("express");
const router = express.Router();
const { route, routeStream } = require("../services/router");

router.post("/", async (req, res) => {
  const { query, history = [] } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res
      .status(400)
      .json({ error: "query is required and must be a non-empty string" });
  }

  if (query.length > 2000) {
    return res
      .status(400)
      .json({ error: "query must be under 2000 characters" });
  }

  try {
    const result = await route(query.trim(), history);
    return res.json({
      success: true,
      query: query.trim(),
      response: result.response,
      meta: {
        routeType: result.routeType,
        cacheHit: result.cacheHit || false,
        latencyMs: result.latencyMs,
        costUSD: result.costUSD,
        tokens: result.tokens || 0,
        ...(result.ruleId && { ruleId: result.ruleId }),
        ...(result.similarity && { similarity: result.similarity }),
        ...(result.model && { model: result.model }),
      },
    });
  } catch (err) {
    console.error("[/api/chat] Error:", err);

    if (err?.status === 401) {
      return res.status(500).json({ error: "Invalid OpenAI API key" });
    }
    if (err?.status === 429) {
      return res
        .status(429)
        .json({ error: "OpenAI rate limit hit. Try again shortly." });
    }

    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message });
  }
});

router.post("/stream", async (req, res) => {
  const { query, history = [] } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const meta = await routeStream(query.trim(), history, (chunk) => {
      sendEvent("chunk", { text: chunk });
    });

    sendEvent("done", { meta });
    res.end();
  } catch (err) {
    console.error("[/api/chat/stream] Error:", err);
    sendEvent("error", { message: err.message || "Stream failed" });
    res.end();
  }
});

module.exports = router;
