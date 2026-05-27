import React, { useState, useEffect, useCallback } from "react";
import { fetchCacheEntries, clearCache } from "../lib/api";

export default function CachePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchCacheEntries();
      setEntries(data.entries || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = async () => {
    if (!window.confirm("Clear all cache entries?")) return;

    setClearing(true);

    await clearCache();
    await load();

    setClearing(false);
  };

  return (
    <div>
      <h2>Semantic Cache</h2>

      <button onClick={load}>Refresh</button>

      {entries.length > 0 && (
        <button onClick={handleClear} disabled={clearing}>
          {clearing ? "Clearing..." : "Clear All"}
        </button>
      )}

      {loading && <p>Loading cache...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p>No cache entries found.</p>
      )}

      {!loading &&
        !error &&
        entries.length > 0 &&
        entries.map((entry) => (
          <div key={entry.key}>
            <p>
              <strong>Query:</strong> {entry.query}
            </p>

            <p>
              <strong>Cached At:</strong>{" "}
              {new Date(entry.cachedAt).toLocaleString()}
            </p>

            <p>
              <strong>TTL:</strong> {entry.ttlSeconds}s
            </p>

            <p>{entry.key}</p>

            <hr />
          </div>
        ))}
    </div>
  );
}