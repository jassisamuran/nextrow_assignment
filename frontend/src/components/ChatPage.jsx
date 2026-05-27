import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamChat } from "../lib/api";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildHistory = useCallback(
    () =>
      messages
        .filter((m) => m.role !== "system" && m.text)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text })),
    [messages]
  );

  const send = useCallback(
    async (query) => {
      if (!query.trim() || streaming) return;

      setInput("");
      setStreaming(true);

      const userMsg = {
        id: Date.now(),
        role: "user",
        text: query,
      };

      const botId = Date.now() + 1;
      const botMsg = {
        id: botId,
        role: "assistant",
        text: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);

      const cancel = streamChat(query, buildHistory(), {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId ? { ...m, text: m.text + chunk } : m
            )
          );
        },

        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId ? { ...m, streaming: false } : m
            )
          );
          setStreaming(false);
          cancelRef.current = null;
        },

        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? { ...m, text: String(err), streaming: false }
                : m
            )
          );
          setStreaming(false);
          cancelRef.current = null;
        },
      });

      cancelRef.current = cancel;
    },
    [streaming, buildHistory]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const handleStop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setStreaming(false);

    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  };

  const clearChat = () => {
    if (streaming) handleStop();
    setMessages([]);
  };

  return (
  <div className="flex flex-col h-screen bg-gray-100">

    <div className="flex items-center justify-between p-3 bg-white shadow sticky top-0 z-10">
      <h1 className="text-lg font-semibold">Chat</h1>

      <button
        onClick={clearChat}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
      >
        Clear
      </button>
    </div>

    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] px-4 py-2 rounded-lg text-sm shadow
            ${msg.role === "user"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-800"
            }`}
          >
            <div className="text-xs opacity-60 mb-1">
              {msg.role}
            </div>

            <ReactMarkdown>{msg.text}</ReactMarkdown>
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>

    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white border-t flex gap-2"
    >
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type message..."
        disabled={streaming}
        className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
      />

      {streaming ? (
        <button
          type="button"
          onClick={handleStop}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send
        </button>
      )}
    </form>

  </div>
);
}