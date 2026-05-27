import { useState, useEffect, useCallback } from 'react';
import { fetchStats, fetchHistory } from '../lib/api';

export function useStats(autoRefresh = true, interval = 5000) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([fetchStats(), fetchHistory(30)]);
      setStats(s.stats);
      setHistory(h.history || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, autoRefresh, interval]);

  return { stats, history, loading, error, refresh };
}