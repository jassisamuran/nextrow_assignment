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

  return (
    <div>
      <div>
        <button onClick={() => setPage("chat")}>Chat</button>
        <button onClick={() => setPage("stats")}>Dashboard</button>
        <button onClick={() => setPage("cache")}>Cache</button>
      </div>

      <div>
        API Status: {health || "checking"}
      </div>

      <div>
        {page === "chat" && <ChatPage />}
        {page === "stats" && <StatsPage />}
        {page === "cache" && <CachePage />}
      </div>
    </div>
  );
}