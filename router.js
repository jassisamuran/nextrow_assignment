

const { RULES } = require("../config/rules");
const semanticCache = require("./semanticCache");
const openaiService = require("./openaiService");
const statsService = require("./statsService");


function matchRule(query) {
  const trimmed = query.trim();
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) return rule;
    }
  }
  return null;
}


async function route(query, conversationHistory = []) {
  const start = Date.now();

  const matchedRule = matchRule(query);
  if (matchedRule) {
    const latencyMs = Date.now() - start;
    await statsService.recordRequest({
      routeType: "rules",
      cacheHit: false,
      query,
      category: matchedRule.category,
      latencyMs,
    });

    return {
      response: matchedRule.response,
      routeType: "rules",
      cacheHit: false,
      ruleId: matchedRule.id,
      category: matchedRule.category,
      latencyMs,
      costUSD: 0,
      tokens: 0,
    };
  }

  const cacheResult = await semanticCache.findCachedResponse(query);
  const embeddingTokens = cacheResult.embeddingTokens || 0;

  if (cacheResult.response) {
    const latencyMs = Date.now() - start;
    const embeddingCost =
      (embeddingTokens / 1000) *
      parseFloat(process.env.COST_EMBEDDING_PER_1K || "0.00002");

    await statsService.recordRequest({
      routeType: "cache",
      cacheHit: true,
      embeddingTokens,
      costUSD: embeddingCost,
      query,
      latencyMs,
    });

    return {
      response: cacheResult.response,
      routeType: "cache",
      cacheHit: true,
      similarity: cacheResult.similarity,
      originalQuery: cacheResult.originalQuery,
      latencyMs,
      costUSD: embeddingCost,
      tokens: embeddingTokens,
    };
  }

  const { response, inputTokens, outputTokens, costUSD, model } =
    await openaiService.chat(query, conversationHistory);

  semanticCache
    .cacheResponse(query, response, cacheResult.embedding)
    .catch((err) => console.error("[Cache] Failed to store:", err));

  const embeddingCost =
    (embeddingTokens / 1000) *
    parseFloat(process.env.COST_EMBEDDING_PER_1K || "0.00002");

  const latencyMs = Date.now() - start;

  await statsService.recordRequest({
    routeType: "llm",
    cacheHit: false,
    inputTokens,
    outputTokens,
    embeddingTokens,
    costUSD: costUSD + embeddingCost,
    query,
    latencyMs,
  });

  return {
    response,
    routeType: "llm",
    cacheHit: false,
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    costUSD: costUSD + embeddingCost,
    tokens: inputTokens + outputTokens,
  };
}


async function routeStream(query, conversationHistory = [], onChunk) {
  const start = Date.now();

  const matchedRule = matchRule(query);
  if (matchedRule) {
    const words = matchedRule.response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((r) => setTimeout(r, 15)); 
    }

    const latencyMs = Date.now() - start;
    await statsService.recordRequest({
      routeType: "rules",
      cacheHit: false,
      query,
      category: matchedRule.category,
      latencyMs,
    });

    return {
      routeType: "rules",
      ruleId: matchedRule.id,
      category: matchedRule.category,
      latencyMs,
      costUSD: 0,
      tokens: 0,
    };
  }

  const cacheResult = await semanticCache.findCachedResponse(query);
  const embeddingTokens = cacheResult.embeddingTokens || 0;

  if (cacheResult.response) {
    const words = cacheResult.response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((r) => setTimeout(r, 10));
    }

    const embeddingCost =
      (embeddingTokens / 1000) *
      parseFloat(process.env.COST_EMBEDDING_PER_1K || "0.00002");
    const latencyMs = Date.now() - start;

    await statsService.recordRequest({
      routeType: "cache",
      cacheHit: true,
      embeddingTokens,
      costUSD: embeddingCost,
      query,
      latencyMs,
    });

    return {
      routeType: "cache",
      cacheHit: true,
      similarity: cacheResult.similarity,
      latencyMs,
      costUSD: embeddingCost,
      tokens: embeddingTokens,
    };
  }

  const { fullText, inputTokens, outputTokens, costUSD, model } =
    await openaiService.chatStream(query, conversationHistory, onChunk);

  semanticCache
    .cacheResponse(query, fullText, cacheResult.embedding)
    .catch((err) => console.error("[Cache] Failed to store:", err));

  const embeddingCost =
    (embeddingTokens / 1000) *
    parseFloat(process.env.COST_EMBEDDING_PER_1K || "0.00002");

  const latencyMs = Date.now() - start;

  await statsService.recordRequest({
    routeType: "llm",
    cacheHit: false,
    inputTokens,
    outputTokens,
    embeddingTokens,
    costUSD: costUSD + embeddingCost,
    query,
    latencyMs,
  });

  return {
    routeType: "llm",
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    costUSD: costUSD + embeddingCost,
    tokens: inputTokens + outputTokens,
  };
}

module.exports = { route, routeStream, matchRule };