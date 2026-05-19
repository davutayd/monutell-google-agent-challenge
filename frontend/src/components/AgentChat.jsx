import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2 } from "lucide-react";
import { t } from "../translations";
import { getCategoryEmoji } from "../utils/categoryEmoji";

/* ── Constants ──────────────────────────────────────────────────────────── */
const STORAGE_KEY = "monutell_chat_history";

function defaultGreeting(language) {
  return [{ id: 0, role: "assistant", content: t("agent_greeting", language) }];
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

/** 2-column grid of monument cards */
function MonumentCard({ m }) {
  const emoji = getCategoryEmoji(m.category);
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImage = m.imageUrl && !imgFailed;

  return (
    <div style={styles.monumentCard}>
      {showImage ? (
        <img
          src={m.imageUrl}
          alt={m.name}
          style={styles.monumentImg}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div style={styles.monumentPlaceholder}>
          <span style={{ fontSize: "2.5rem" }}>{emoji}</span>
        </div>
      )}
      <div style={styles.monumentInfo}>
        <p style={styles.monumentName}>{m.name}</p>
        {m.distance != null && (
          <p style={styles.monumentDistance}>{m.distance.toFixed(2)} km</p>
        )}
      </div>
    </div>
  );
}

function MonumentGrid({ monuments }) {
  const items = monuments.slice(0, 4);
  return (
    <div style={styles.monumentGrid}>
      {items.map((m) => <MonumentCard key={m.id} m={m} />)}
    </div>
  );
}

/** Styled numbered route list */
function RouteList({ route }) {
  if (!route?.route || !route?.summary) return null;
  return (
    <div style={styles.routeContainer}>
      {route.route.map((stop, idx) => {
        const emoji = getCategoryEmoji(stop.category);
        return (
          <div key={stop.id ?? idx} style={styles.routeItem}>
            <div style={styles.routeNumber}>{idx + 1}</div>
            <div style={styles.routeMiddle}>
              <span style={styles.routeName}>{stop.name}</span>
              {stop.distanceFromPreviousKm != null && (
                <span style={styles.routeDist}>
                  +{stop.distanceFromPreviousKm} km
                </span>
              )}
            </div>
            <span style={{ fontSize: "1.25rem" }}>{emoji}</span>
          </div>
        );
      })}
      <div style={styles.routeSummary}>
        🗺️ {route.summary.totalDistanceKm} km &nbsp;·&nbsp; ⏱️{" "}
        {route.summary.estimatedWalkingMinutes} dk
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function AgentChat({ location, language = "tr" }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultGreeting(language);
    } catch {
      return defaultGreeting(language);
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Persist (skip ephemeral agent-step messages) */
  useEffect(() => {
    try {
      const toSave = messages.filter((m) => m.role !== "agent-step");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* quota */ }
  }, [messages]);

  /* Sync greeting on language change */
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return defaultGreeting(language);
      }
      return prev;
    });
  }, [language]);

  /* Clear */
  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages(defaultGreeting(language));
  };

  /* Send + SSE stream */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: userMessage },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          language,          // top-level — server uses this to enforce language in system prompt
          context: {
            ...(location ? { lat: location.lat, lng: location.lng } : {}),
          },
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let data;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }

          if (data.type === "step") {
            setMessages((prev) => [
              ...prev,
              { id: Date.now() + Math.random(), role: "agent-step", content: data.message },
            ]);
          }

          if (data.type === "result") {
            setMessages((prev) => [
              ...prev.filter((m) => m.role !== "agent-step"),
              {
                id: Date.now(),
                role: "assistant",
                content: data.response,
                monuments: data.monuments ?? null,
                route: data.route ?? null,
              },
            ]);
            setIsLoading(false);
          }

          if (data.type === "error") {
            setMessages((prev) => [
              ...prev.filter((m) => m.role !== "agent-step"),
              { id: Date.now(), role: "error", content: t("error_message", language) },
            ]);
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      console.error("Chat SSE error:", err);
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "agent-step"),
        { id: Date.now(), role: "error", content: t("error_message", language) },
      ]);
      setIsLoading(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={styles.root}>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>{t("agent_title", language)}</span>
        <button onClick={clearHistory} style={styles.clearBtn} title="Sohbeti Temizle">
          <Trash2 size={13} />
          <span>Sohbeti Temizle</span>
        </button>
      </div>

      {/* Message list */}
      <div style={styles.messageList} className="chatScrollArea">
        {messages.map((msg) => {
          const isUser  = msg.role === "user";
          const isStep  = msg.role === "agent-step";
          const isError = msg.role === "error";
          const isRich  = !!(msg.monuments || msg.route);

          return (
            <div key={msg.id} style={{ ...styles.messageRow, justifyContent: isUser ? "flex-end" : "flex-start" }}>

              {/* Agent-step: italic progress */}
              {isStep ? (
                <div className="agentStep">
                  {msg.content}<span className="stepDot" />
                </div>
              ) : (
                <div
                  style={{
                    ...styles.bubble,
                    ...(isUser  ? styles.bubbleUser  : {}),
                    ...(isError ? styles.bubbleError : {}),
                    ...(isRich  ? styles.bubbleRich  : {}),
                    maxWidth: isUser ? "75%" : "90%",
                  }}
                >
                  {/* Monument grid */}
                  {msg.monuments && msg.monuments.length > 0 && (
                    <div style={styles.sectionBlock}>
                      <div style={styles.sectionLabel}>
                        <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>📍</span>
                      </div>
                      <MonumentGrid monuments={msg.monuments} />
                    </div>
                  )}

                  {/* Route list */}
                  {msg.route && (
                    <div style={styles.sectionBlock}>
                      <RouteList route={msg.route} />
                    </div>
                  )}

                  {/* Text content */}
                  {msg.content && (
                    <p style={{
                      ...styles.bubbleText,
                      ...(isUser ? { color: "#1a1a2e" } : {}),
                    }}>
                      {msg.content}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Fallback spinner before first step event */}
        {isLoading && !messages.some((m) => m.role === "agent-step") && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div className="agentStep">
              ⚙️ {t("agent_thinking", language)}<span className="stepDot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        <div style={styles.inputWrap}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("placeholder_message", language)}
            disabled={isLoading}
            style={styles.input}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={styles.sendBtn}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inline styles (CSS Modules yerine JS object — Tailwind bağımlılığı yok) */
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--color-ai-bg)",
    fontFamily: "inherit",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    fontSize: "0.7rem",
    color: "var(--color-text-muted, #94a3b8)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 600,
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.75rem",
    color: "var(--color-text-muted, #94a3b8)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    transition: "color 0.2s",
  },

  /* Message list */
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    scrollBehavior: "smooth",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },

  /* Bubbles */
  bubble: {
    borderRadius: 18,
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "var(--color-ai-text)",
    lineHeight: 1.5,
  },
  bubbleUser: {
    background: "var(--gold-gradient)",
    color: "#0f172a",
    fontWeight: 500,
    borderBottomRightRadius: 4,
  },
  bubbleError: {
    background: "#7f1d1d",
    color: "#fecaca",
  },
  bubbleRich: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: "12px",
    width: "100%",
  },
  bubbleText: {
    margin: 0,
    fontSize: "0.9rem",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    color: "var(--color-ai-text)",
  },

  /* Section block (inside rich bubble) */
  sectionBlock: {
    marginBottom: 10,
  },
  sectionLabel: {
    marginBottom: 6,
  },

  /* Monument grid */
  monumentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  monumentCard: {
    backgroundColor: "rgb(15, 23, 42)",
    border: "1px solid #2a2a3e",
    borderRadius: 12,
    overflow: "hidden",
  },
  monumentImg: {
    width: "100%",
    height: 120,
    objectFit: "cover",
    display: "block",
  },
  monumentPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#2a2a3e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  monumentInfo: {
    padding: "6px 8px 8px",
  },
  monumentName: {
    margin: 0,
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "var(--color-ai-text)",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: 1.3,
  },
  monumentDistance: {
    margin: "3px 0 0",
    fontSize: "0.75rem",
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
    display: "inline-block",
  },

  /* Route list */
  routeContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  routeItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  routeNumber: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--gold-gradient)",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  routeMiddle: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  routeName: {
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "var(--color-ai-text)",
  },
  routeDist: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  routeSummary: {
    marginTop: 10,
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#fbbf24",
    textAlign: "center",
    letterSpacing: "0.03em",
  },

  /* Input */
  inputBar: {
    padding: "10px 12px",
    background: "var(--color-ai-bg)",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    padding: "6px 6px 6px 16px",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--color-ai-text)",
    fontSize: "0.9rem",
  },
  sendBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#fbbf24",
    padding: "6px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
};
