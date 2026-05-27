require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { getRedisClient } = require("./redisClient");
const rateLimit = require("express-rate-limit");
const { WebSocketServer } = require("ws");
const chatRouter = require("./chat");
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10kb" }));
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/chat", limiter);
app.use("/api/chat", chatRouter);

app.get("/api/health", async (req, res) => {
  console.log("Now");
  let redisStatus = "ok";
  try {
    const client = await getRedisClient();
    await client.ping();
  } catch (err) {
    redisStatus = "error";
  }

  const health = redisStatus === "ok";
  return res.status(health ? 200 : 503).json({
    status: health ? "Ok" : "degraded",
    services: { redis: redisStatus, api: "ok" },
    uptime: process.uptime().toFixed(1) + "s",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, _next) => {
  console.error("[Unhandled]", err);
  res.status(500).json({ error: "Unexpected server error" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  const connId = uuidv4().slice(0, 8);
  console.log(
    `[WS] Client connected [${connId}] from ${req.socket.remoteAddress}`,
  );

  const send = (type, payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  };

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send("error", { message: "Invalid JSON message" });
    }

    if (msg.type !== "chat") {
      return send("error", { message: `Unknown message type: ${msg.type}` });
    }

    const { query, history = [], requestId = uuidv4() } = msg;

    if (!query || typeof query !== "string" || !query.trim()) {
      return send("error", { message: "query is required", requestId });
    }

    if (query.length > 2000) {
      return send("error", {
        message: "query too long (max 2000 chars)",
        requestId,
      });
    }

    send("start", { requestId, query: query.trim() });

    try {
      const meta = await routeStream(query.trim(), history, (chunk) => {
        send("chunk", { requestId, text: chunk });
      });

      send("done", { requestId, meta });
    } catch (err) {
      console.error(`[WS][${connId}] Error:`, err);
      send("error", {
        requestId,
        message: err?.message || "Stream error",
      });
    }
  });

  ws.on("close", (code, reason) => {
    console.log(
      `[WS] Client disconnected [${connId}] code=${code} reason=${reason || "none"}`,
    );
  });

  ws.on("error", (err) => {
    console.error(`[WS][${connId}] Socket error:`, err.message);
  });

  send("connected", {
    message: "Connected to AI Support Agent",
    connId,
    timestamp: new Date().toISOString(),
  });
});
async function start() {
  try {
    await getRedisClient();
    console.log("Redis connected");
  } catch (err) {
    console.log("Redis connection failed", err.message);
    process.exit(1);
  }
  server.listen(PORT, () => {
    console.log(`server is connected ${PORT}`);
  });
}

start().catch((err) => {
  console.log("starting error", err);
  process.exit(1);
});
