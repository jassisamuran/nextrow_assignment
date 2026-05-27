import React, { useState, useEffect } from "react";
import ChatPage from "./components/ChatPage";
import StatsPage from "./components/statsPage";
import CachePage from "./components/CachePage";
import { fetchHealth } from "./lib/api";

export default function App() {
  const [page, setPage] = useState("chat");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth();
        setHealth(h.status);
      } catch {
        setHealth("error");
      }
    };

    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  const navBtn = (id) =>
    `px-4 py-2 rounded-md text-sm font-medium transition ${
      page === id
        ? "bg-blue-500 text-white"
        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    }`;

  return (
    <div className=" flex flex-col bg-gray-50">

      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex gap-2">
          <button onClick={() => setPage("chat")} className={navBtn("chat")}>
            Chat
          </button>
          <button onClick={() => setPage("stats")} className={navBtn("stats")}>
            Dashboard
          </button>
          <button onClick={() => setPage("cache")} className={navBtn("cache")}>
            Cache
          </button>
        </div>

        <div className="text-sm text-gray-600">
          API Status:{" "}
          <span
            className={
              health === "ok"
                ? "text-green-600"
                : health === "error"
                ? "text-red-600"
                : "text-gray-400"
            }
          >
            {health || "checking"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {page === "chat" && <ChatPage />}
        {page === "stats" && <StatsPage />}
        {page === "cache" && <CachePage />}
      </div>
      
    </div>
  );
}