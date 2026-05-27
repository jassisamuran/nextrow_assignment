import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useStats } from "../hooks/useStats";
import { resetStats, clearCache } from "../lib/api";

const PIE_COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

export default function StatsPage() {
  const { stats, history, loading, error, refresh } = useStats(true, 6000);

  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleReset = async () => {
    if (!window.confirm("Reset all stats?")) return;

    setResetting(true);

    await resetStats();
    await refresh();

    setResetting(false);
  };

  const handleClearCache = async () => {
    if (!window.confirm("Clear semantic cache?")) return;

    setClearing(true);

    await clearCache();
    await refresh();

    setClearing(false);
  };

  if (loading) {
    return <p>Loading stats...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  const s = stats || {};

  const pieData = [
    {
      name: "Rules",
      value: s.rulesRouted || 0,
    },
    {
      name: "Cache",
      value: s.cacheHits || 0,
    },
    {
      name: "LLM",
      value: s.llmRouted || 0,
    },
  ];

  const hourBuckets = {};

  (history || []).forEach((h) => {
    const hr = new Date(h.ts).getHours();

    const key = `${hr}:00`;

    if (!hourBuckets[key]) {
      hourBuckets[key] = {
        hour: key,
        rules: 0,
        cache: 0,
        llm: 0,
      };
    }

    if (h.routeType === "rules") {
      hourBuckets[key].rules++;
    } else if (h.cacheHit || h.routeType === "cache") {
      hourBuckets[key].cache++;
    } else {
      hourBuckets[key].llm++;
    }
  });

  const barData = Object.values(hourBuckets);

  return (
    <div>
      <h2>Stats Dashboard</h2>

      <div>
        <button onClick={refresh}>Refresh</button>

        <button onClick={handleClearCache} disabled={clearing}>
          {clearing ? "Clearing..." : "Clear Cache"}
        </button>

        <button onClick={handleReset} disabled={resetting}>
          {resetting ? "Resetting..." : "Reset Stats"}
        </button>
      </div>

      <hr />

      <div>
        <p>Total Requests: {s.totalRequests || 0}</p>

        <p>Rules Routed: {s.rulesRouted || 0}</p>

        <p>Cache Hits: {s.cacheHits || 0}</p>

        <p>LLM Routed: {s.llmRouted || 0}</p>

        <p>Total Cost: ${s.totalCostUSD || 0}</p>

        <p>Input Tokens: {s.totalTokensInput || 0}</p>

        <p>Output Tokens: {s.totalTokensOutput || 0}</p>

        <p>Embedding Tokens: {s.totalEmbeddingTokens || 0}</p>
      </div>

      <hr />

      <h3>Route Distribution</h3>

      <PieChart width={300} height={300}>
        <Pie
          data={pieData}
          cx={150}
          cy={150}
          outerRadius={100}
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell
              key={index}
              fill={PIE_COLORS[index % PIE_COLORS.length]}
            />
          ))}
        </Pie>

        <Tooltip />
      </PieChart>

      <hr />

      <h3>Requests By Hour</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <XAxis dataKey="hour" />

          <YAxis />

          <Tooltip />

          <Bar dataKey="rules" fill="#8884d8" />

          <Bar dataKey="cache" fill="#82ca9d" />

          <Bar dataKey="llm" fill="#ffc658" />
        </BarChart>
      </ResponsiveContainer>

      <hr />

      <h3>Recent Requests</h3>

      {history.length === 0 ? (
        <p>No requests yet</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Route</th>
              <th>Query</th>
              <th>Latency</th>
              <th>Tokens</th>
              <th>Cost</th>
            </tr>
          </thead>

          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>
                  {h.routeType}
                </td>

                <td>{h.query}</td>

                <td>{h.latencyMs}ms</td>

                <td>{h.tokens}</td>

                <td>${h.costUSD?.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}