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
    return <p className="p-6 text-gray-600">Loading stats...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-500">{error}</p>;
  }

  const s = stats || {};

  const pieData = [
    { name: "Rules", value: s.rulesRouted || 0 },
    { name: "Cache", value: s.cacheHits || 0 },
    { name: "LLM", value: s.llmRouted || 0 },
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
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stats Dashboard</h2>

        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Refresh
          </button>

          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear Cache"}
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {resetting ? "Resetting..." : "Reset Stats"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500 text-sm">Total Requests</p>
          <p className="text-xl font-bold">{s.totalRequests || 0}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500 text-sm">Rules Routed</p>
          <p className="text-xl font-bold">{s.rulesRouted || 0}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500 text-sm">Cache Hits</p>
          <p className="text-xl font-bold">{s.cacheHits || 0}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500 text-sm">LLM Routed</p>
          <p className="text-xl font-bold">{s.llmRouted || 0}</p>
        </div>

        <div className="bg-white p-4 rounded shadow col-span-2 md:col-span-4">
          <p className="text-gray-500 text-sm">Total Cost</p>
          <p className="text-xl font-bold">${s.totalCostUSD || 0}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Route Distribution</h3>

          <PieChart width={300} height={300}>
            <Pie
              data={pieData}
              cx={150}
              cy={150}
              outerRadius={100}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Requests By Hour</h3>

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
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Recent Requests</h3>

        {history.length === 0 ? (
          <p className="text-gray-500">No requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Route</th>
                  <th className="p-2 border">Query</th>
                  <th className="p-2 border">Latency</th>
                  <th className="p-2 border">Tokens</th>
                  <th className="p-2 border">Cost</th>
                </tr>
              </thead>

              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="text-center hover:bg-gray-50">
                    <td className="p-2 border">{h.routeType}</td>
                    <td className="p-2 border text-left">{h.query}</td>
                    <td className="p-2 border">{h.latencyMs}ms</td>
                    <td className="p-2 border">{h.tokens}</td>
                    <td className="p-2 border">${h.costUSD?.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}