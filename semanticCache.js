const { getRedisClient } = require("./redisClient");
const openaiService = require("./openaiService");
const CACHE_PREFIX = "semantic_cache";

const THRESHOLD = parseFloat(process.env.CACHE_SIMILARITY_THRESHOLD || "0.92");
const TTL = parseInt(process.env.CACHE_TTL || "3600", 10);

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findCachedResponse(query) {
  const { embedding, tokens } = await openaiService.getEmbedding(query);
  const client = await getRedisClient();
  const keys = await client.keys(`${CACHE_PREFIX}`);

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const key of keys) {
    const raw = await client.get(key);
    if (!raw) continue;
    const entry = JSON.parse(raw);
    const sim = cosineSimilarity(embedding, entry.embedding);
    if (sim > THRESHOLD && sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = entry;
    }
  }
  if (bestMatch) {
    return {
      response: bestMatch.response,
      similarity: bestSimilarity,
      embeddingTokens: tokens,
      originalQuery: bestMatch.query,
    };
  }

  return { hit: false, embedding, embeddingTokens: tokens };
}

async function cacheResponse(query, response, embedding) {
  const client = await getRedisClient();
  const key = `${CACHE_PREFIX}${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  await client.setEx(
    key,
    TTL,
    JSON.stringify({
      query,
      response,
      embedding,
      cachedAt: new Date().toISOString(),
    }),
  );
}

async function listCacheEntries() {
  const client = await getRedisClient();
  const keys = await client.keys(`${CACHE_PREFIX}*`);
  const entries = [];

  for (const key of keys) {
    const raw = await client.get(key);
    if (!raw) continue;
    const { query, cachedAt } = JSON.parse(raw);
    const ttl = await client.ttl(key);
    entries.push({ key, query, cachedAt, ttlSeconds: ttl });
  }

  return entries;
}

async function clearCache() {
  const client = await getRedisClient();
  const keys = await client.keys(`${CACHE_PREFIX}*`);
  if (keys.length) await client.del(keys);
  return keys.length;
}

module.exports = {
  findCachedResponse,
  cacheResponse,
  listCacheEntries,
  clearCache,
  THRESHOLD,
};
