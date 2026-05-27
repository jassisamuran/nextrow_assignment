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