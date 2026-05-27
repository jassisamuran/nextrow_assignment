const BASE =  'http://localhost:3000';


export async function sendChat(query, history = []) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(limit = 20) {
  const res = await fetch(`${BASE}/api/stats/history?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCacheEntries() {
  const res = await fetch(`${BASE}/api/stats/cache`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function clearCache() {
  const res = await fetch(`${BASE}/api/stats/cache/clear`, { method: 'POST' });
  return res.json();
}

export async function resetStats() {
  const res = await fetch(`${BASE}/api/stats/reset`, { method: 'POST' });
  return res.json();
}

export function streamChat(query, history = [], { onChunk, onDone, onError }) {
  const ctrl = new AbortController();
 
  fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
 
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
 
        const lines = buf.split('\n');
        buf = lines.pop();
 
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              if (data.text !== undefined) onChunk(data.text);
              if (data.meta !== undefined) onDone(data.meta);
            } catch {}
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message);
    });
 
  return () => ctrl.abort();
}
