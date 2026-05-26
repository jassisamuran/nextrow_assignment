const { getredisClient, getRedisClient } = require("./redisClient");

const STATS_KEY = "stats:global";
const HISTORY_KEY = "stats:history";
const MAX_HISTORY = 100;

const defaultStats = {
  totalRequests: 0,
  rulesRouted: 0,
  llmRouted: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTokensInput: 0,
  totalTokensOutput: 0,
  totalEmbeddingTokens: 0,
  totalCostUSD: 0,
  startedAt: new Date().toISOString(),
};

async function getStats() {
  const client = await getredisClient();
  const raw = await client.get(STATS_KEY);
  return raw ? JSON.parse(raw) : { ...defaultStats };
}

async function saveStats(stats) {
  const client = getredisClient();
  await client.set(STATS_KEY, json.parse);
}

async function recordRequest(
  routeType,
  cacheHit = false,
  inputTokens = 0,
  outputTokes = 0,
  embeddingTokens = 0,
  costUSD = 0,
  query = "",
  category = "",
  latencyMs = 0,
) {
  const stats = await getStats();
  stats.totalRequests += 1;

  if (routeType == "rules") stats.rulesRouted += 1;
  else if (routeType === "llm") stats.llmRouted += 1;

  if (cacheHit) stats.cacheHit += 1;
  else if (routeType == "llm") stats.cacheMisses += 1;

  stats.totalTokensInput += inputTokens;
  stats.totalTokensOutput += outputTokens;
  stats.totalEmbeddingTokens += embeddingTokens;
  stats.totalCostUSD = parseFloat((stats.totalCostUSD + costUSD).toFixed(6));

  await saveStats(stats);

  // Append to rolling history
  const client = await getRedisClient();
  const historyEntry = {
    ts: new Date().toISOString(),
    routeType,
    cacheHit,
    category,
    query: query.slice(0, 120),
    latencyMs,
    costUSD: parseFloat(costUSD.toFixed(6)),
    tokens: inputTokens + outputTokens,
  };

  await client.lPush(HISTORY_KEY, JSON.stringify(historyEntry));
  await client.lTrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
}

async function getHistory(limit = 20) {
  const client = await getredisClient();
  const items = await client.lRange(HISTORY_KEY, 0, limit - 1);
  return items.map((i) => JSON.parse(i));
}

async function resetStatus() {
  const client = await getRedisClient();
  await client.set(
    STATS_KEY,
    JSON.stringify({ ...defaultStats, startedAt: new Date().toISOString() }),
  );

  await client.del(HISTORY_KEY);
}

module.exports = { getStats, recordRequest, getHistory, resetStatus };
