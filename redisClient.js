const redis = require("redis");
let client = null;

async function getRedisClient() {
  if (client && client.isReady) return client;

  client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      reconnectStrategy: (redis) => Math.min(redis * 100, 3000),
    },
  });

  client.on("error", (err) => console.log("Redis error", error));
  client.on("connect", () => console.log("Redis connected"));
  client.on("reconnecting", () => console.log("Redis reconnecting..."));

  await client.connect();
  return client;
}

module.exports = { getRedisClient };
