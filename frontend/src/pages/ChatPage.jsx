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
    bottomRef.current?.scrollIntoView();
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
    <div>
      <div>
        <button onClick={clearChat}>Clear</button>
      </div>

      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <div>{msg.role}</div>

            <div>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message..."
          disabled={streaming}
        />

        {streaming ? (
          <button type="button" onClick={handleStop}>
            Stop
          </button>
        ) : (
          <button type="submit">Send</button>
        )}
      </form>
    </div>
  );
}