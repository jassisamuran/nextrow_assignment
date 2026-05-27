# Mini AI Support Agent

Full-stack AI support agent with smart routing, semantic caching, SSE streaming, WebSocket, and a React dashboard.

---

## Project Structure

```
mini-ai-support-agent/
├── backend/
│   ├── index.js              ← Express + WebSocket server
│   ├── chat.js               ← POST /api/chat + /api/chat/stream
│   ├── aiRouter.js           ← Smart routing: rules → cache → LLM
│   ├── openaiService.js      ← OpenAI chat + embeddings
│   ├── semanticCache.js      ← Cosine similarity cache in Redis
│   ├── statsService.js       ← Cost/routing stats in Redis
│   ├── redisClient.js        ← Redis singleton
│   ├── rules.js              ← Rules-based routing definitions
│   ├── stats.js              ← GET /api/stats routes
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.js            ← Sidebar layout + health polling
│   │   ├── lib/api.js        ← fetch / SSE / WebSocket helpers
│   │   ├── hooks/useStats.js ← Auto-polling stats hook
│   │   ├── components/
│   │   │   ├── ChatPage.js   ← SSE streaming chat UI
│   │   │   ├── StatsPage.js  ← Recharts dashboard
│   │   │   ├── CachePage.js  ← Cache inspector
│   │   └── index.css
│   ├── public/index.html
│   └── package.json
│
└── docker-compose.yml        ← Runs everything together
```

---

## How Routing Works

```
Incoming query
      │
      ▼
┌─────────────────────────────────────┐
│           Smart Router              │
│                                     │
│  1. Rules match?  ──YES──▶ instant reply   ($0, ~0ms)
│         │                           │
│         NO                          │
│         ▼                           │
│  2. Cache hit?    ──YES──▶ cached reply    (~$0, ~50ms)
│         │                           │
│         NO                          │
│         ▼                           │
│  3. Call OpenAI   ─────▶ fresh reply + cache it (~$0.001, ~800ms)
└─────────────────────────────────────┘
```

| Route | Trigger | Cost | Latency |
|-------|---------|------|---------|
| Rules-based | Regex pattern match | $0 | ~0ms |
| Semantic cache | Embedding similarity ≥ threshold | ~$0.00002 | ~50ms |
| LLM | No match found | ~$0.001 | ~800ms |

---

## Prerequisites

- Node.js v20+
- Redis
- OpenAI API key

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

> **Important:** Must use Express 4, not Express 5.
```bash
npm install express@4.19.2
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
REDIS_URL=redis://localhost:6379
PORT=3000
CACHE_SIMILARITY_THRESHOLD=0.92
CACHE_TTL=3600
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
COST_INPUT_PER_1K=0.00015
COST_OUTPUT_PER_1K=0.00060
COST_EMBEDDING_PER_1K=0.00002
```

### 3. Start Redis

```bash
sudo systemctl start redis-server

# Verify
redis-cli ping    # must return PONG
```

### 4. Start the server

```bash
node index.js
```

Expected output:
```
[Boot] Redis connected
[Boot] Server running on http://localhost:3000
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# REACT_APP_API_URL=http://localhost:3000
```

### 3. Start

```bash
npm start
# Opens http://localhost:3001
```

---

## Docker — Run Everything with One Command

Docker Compose starts all three services (frontend, backend, Redis) together. The **frontend is served on `http://localhost/` (port 80)** via an Nginx container — no port number needed in the browser.

### 1. Copy and configure the root `.env`

```bash
# From the project root
cp backend/.env.example .env
```

Open `.env` and set your key:

```env
OPENAI_API_KEY=sk-your-key-here
```

All other variables have sensible defaults and don't need to be changed to get started.

### 2. Build and start

```bash
docker compose up --build
```

On subsequent runs (no code changes):

```bash
docker compose up
```

### 3. Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | **http://localhost/** | React app served by Nginx on port 80 |
| Backend API | http://localhost:3000 | Express + WebSocket |
| Redis | localhost:6379 | Internal only; not exposed publicly |

> The frontend container proxies `/api/*` and `/ws` requests to the backend automatically, so you never need to think about CORS in production.

### 4. Tear down

```bash
# Stop containers (keeps volumes/data)
docker compose down

# Stop and wipe all data (Redis cache, stats)
docker compose down -v
```

### 5. View logs per service

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f redis
```

### Difference between local dev and Docker

| | Local dev | Docker |
|-|-----------|--------|
| Frontend URL | http://localhost:3001 | **http://localhost/** |
| Backend URL | http://localhost:3000 | http://localhost:3000 |
| Redis | Must be running locally | Managed automatically |
| Hot reload | ✅ Yes | ❌ Requires rebuild |

---

## API Reference

### POST `/api/chat`

Standard request/response.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "hello"}'
```

```json
{
  "success": true,
  "query": "hello",
  "response": "Hello! 👋 How can I help you today?",
  "meta": {
    "routeType": "rules",
    "cacheHit": false,
    "latencyMs": 2,
    "costUSD": 0,
    "tokens": 0,
    "ruleId": "greeting"
  }
}
```

`routeType` is one of: `"rules"` | `"cache"` | `"llm"`

---

### POST `/api/chat/stream`

Server-Sent Events streaming.

```bash
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "what is your refund policy?"}'
```

SSE events:

| Event | Payload | Description |
|-------|---------|-------------|
| `chunk` | `{ text: "..." }` | Token delta |
| `done` | `{ meta: {...} }` | Finished + metadata |
| `error` | `{ message: "..." }` | Error occurred |

JavaScript example:
```js
const res = await fetch('http://localhost:3000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'How does pricing work?' })
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const data = JSON.parse(line.slice(5));
      if (data.text) process.stdout.write(data.text);
    }
  }
}
```

---

### WebSocket `ws://localhost:3000/ws`

**Send:**
```json
{
  "type": "chat",
  "query": "What is your refund policy?",
  "history": [],
  "requestId": "abc-123"
}
```

**Receive sequence:**
```json
{ "type": "connected", "connId": "a1b2c3d4" }
{ "type": "start",     "requestId": "abc-123" }
{ "type": "chunk",     "requestId": "abc-123", "text": "We offer" }
{ "type": "chunk",     "requestId": "abc-123", "text": " a 30-day" }
{ "type": "done",      "requestId": "abc-123", "meta": { "routeType": "rules" } }
```

---

### GET `/api/stats`

```bash
curl http://localhost:3000/api/stats
```

```json
{
  "stats": {
    "totalRequests": 142,
    "rulesRouted": 58,
    "llmRouted": 31,
    "cacheHits": 53,
    "totalCostUSD": 0.003721,
    "derived": {
      "cacheHitRate": "37.3%",
      "llmRouteRate": "21.8%",
      "rulesRouteRate": "40.8%",
      "costFormattedUSD": "$0.0037",
      "avgCostPerLLMCall": "$0.000120"
    }
  }
}
```

### GET `/api/stats/history?limit=20`

Last N request entries.

### GET `/api/stats/cache`

All current semantic cache entries with TTL.

### POST `/api/stats/reset`

Reset all stats counters.

### POST `/api/stats/cache/clear`

Flush the entire semantic cache.

### GET `/api/health`

```json
{
  "status": "ok",
  "services": { "redis": "ok", "api": "ok" },
  "uptime": "183.4s"
}
```

---

## Add Custom Rules

Edit `backend/rules.js`:

```js
{
  id: "shipping",
  patterns: [/\b(shipping|delivery|ship|deliver|track)\b/i],
  response: "We ship worldwide! Standard delivery: 5–7 days. Express: 2–3 days.",
  category: "faq",
}
```

Rules are matched before any LLM or cache lookup — zero cost, instant response.

---

## Semantic Cache Tuning

Edit `CACHE_SIMILARITY_THRESHOLD` in `.env`:

| Value | Behavior |
|-------|----------|
| `0.95+` | Strict — only near-identical queries hit cache |
| `0.92` | Default — good balance |
| `0.85` | Aggressive — more hits, risk of false matches |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | required | OpenAI API key |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `PORT` | `3000` | Server port |
| `CACHE_SIMILARITY_THRESHOLD` | `0.92` | Cache hit threshold |
| `CACHE_TTL` | `4000` | Cache entry TTL (seconds) |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Chat model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `COST_INPUT_PER_1K` | `0.00015` | Input token cost |
| `COST_OUTPUT_PER_1K` | `0.00060` | Output token cost |
| `COST_EMBEDDING_PER_1K` | `0.00002` | Embedding token cost |

---

## Common Issues

**curl hangs on any endpoint**
```bash
# Kill all node processes and restart
pkill -9 node
sudo systemctl start redis-server
node index.js
```

**Express routes not matching (empty reply)**
```bash
# You have Express 5 installed — downgrade to 4
npm install express@4.19.2
```

**Redis connection timeout on startup**
```bash
redis-cli ping        # must return PONG
sudo systemctl start redis-server
```

**`ReferenceError: uuidv4 is not defined`**
```bash
npm install uuid
# Add to index.js: const { v4: uuidv4 } = require("uuid");
```

**Frontend shows blank page at `http://localhost/` in Docker**

The React build must complete before Nginx serves it. Check the build logs:
```bash
docker compose logs frontend
```
If the build failed, rebuild from scratch:
```bash
docker compose down
docker compose up --build
```

---

## Quick Test

```bash
# Health
curl http://localhost:3000/api/health

# Rules route (instant, $0)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"hello"}'

# LLM route
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"explain how neural networks learn"}'

# Same query again → cache hit
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"how do neural networks learn?"}'

# Stats
curl http://localhost:3000/api/stats
```