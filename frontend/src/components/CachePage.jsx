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
    <div className="min-h-screen bg-gray-50 p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Semantic Cache</h2>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Refresh
          </button>

          {entries.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {clearing ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-gray-600">Loading cache...</p>
      )}

      {error && (
        <p className="text-red-500">{error}</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-gray-500">No cache entries found.</p>
      )}

      <div className="space-y-3">
        {!loading &&
          !error &&
          entries.length > 0 &&
          entries.map((entry) => (
            <div
              key={entry.key}
              className="bg-white p-4 rounded shadow hover:shadow-md transition"
            >
              <p className="text-sm text-gray-500">
                <strong>Query:</strong> {entry.query}
              </p>

              <p className="text-sm text-gray-500">
                <strong>Cached At:</strong>{" "}
                {new Date(entry.cachedAt).toLocaleString()}
              </p>

              <p className="text-sm text-gray-500">
                <strong>TTL:</strong> {entry.ttlSeconds}s
              </p>

              <p className="text-xs text-gray-400 mt-2 break-all">
                {entry.key}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}