"use client";

import { useEffect, useRef, useState } from "react";
import "./globals.css";

type RelevantChunk = { id?: number | string; text?: string; score?: number };

const API_BASE = "/api"; // Uses Next.js API routes now

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState<string>(
    "Choose file: pdf, txt, bxt, md, docx, pptx, png/jpg, mp3/mp4 (max 50MB)"
  );
  const [url, setUrl] = useState<string>("");
  const [submittingUrl, setSubmittingUrl] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; sources?: RelevantChunk[] }[]
  >([]);
  const [query, setQuery] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initializeSession();
    loadStats();
    checkAPIHealth();
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  async function initializeSession() {
    try {
      const res = await fetch(`${API_BASE}/session/new`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (e) {
      setStatus({ type: "error", message: "Failed to initialize session" });
    }
  }

  function onFileChange(file: File | null) {
    setSelectedFile(file);
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileLabel(`${file.name} (${sizeMB} MB)`);
    } else {
      setFileLabel("Choose file: pdf, txt, bxt, md, docx, pptx, png/jpg, mp3/mp4 (max 50MB)");
    }
  }

  async function upload() {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setStatus({ type: "success", message: `\u2713 ${data.message} Ready to chat!` });
      setChunkCount(data.total_chunks ?? 0);
      setSelectedFile(null);
      setFileLabel("Choose PDF or TXT file (max 50MB)");
    } catch (e: any) {
      setStatus({ type: "error", message: `Error: ${e.message}` });
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!query.trim() || !sessionId) return;
    const q = query.trim();
    setQuery("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, query: q, top_k: 5 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to get response");
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, sources: data.relevant_chunks }
      ]);
      setMessageCount((n) => n + 2);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  }

  async function clearAll() {
    if (!confirm("Are you sure you want to clear all documents and chat history?")) return;
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear data");
      setMessages([]);
      setQuery("");
      setChunkCount(0);
      setMessageCount(0);
      setStatus({ type: "success", message: "All data cleared successfully" });
      await initializeSession();
    } catch (e: any) {
      setStatus({ type: "error", message: `Error: ${e.message}` });
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        const total = data?.vector_store?.total_chunks ?? 0;
        if (total > 0) {
          setChunkCount(total);
        }
      }
    } catch {}
  }

  async function checkAPIHealth() {
    try {
      const res = await fetch(`${API_BASE}/`);
      if (!res.ok) throw new Error("API not responding");
    } catch {
      setStatus({
        type: "error",
        message: "Cannot connect to backend API. Make sure the server is running on http://localhost:8000",
      });
    }
  }

  const canChat = chunkCount > 0;

  return (
    <div className="container">
      <div className="header">
        <h1>AskAtlas</h1>
        <div className="stats">
          <div className="stat-item">
            <span>📄</span>
            <span id="chunkCount">{chunkCount} chunks</span>
          </div>
          <div className="stat-item">
            <span>💬</span>
            <span id="messageCount">{messageCount} messages</span>
          </div>
        </div>
      </div>

      {status && (
        <div className={`status-message ${status.type}`}>{status.message}</div>
      )}

      <div className="upload-section">
        <div className="upload-area">
          <div className="file-input-wrapper">
            <label htmlFor="fileInput" className="file-input-label" id="fileLabel">
              {fileLabel}
            </label>
            <input
              type="file"
              id="fileInput"
              accept=".pdf,.txt,.text,.bxt,.md,.markdown,.docx,.pptx,.png,.jpg,.jpeg,.mp3,.mp4,.wav,.m4a"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
          <button className="upload-btn" id="uploadBtn" disabled={!selectedFile || uploading} onClick={upload}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button className="clear-btn" id="clearBtn" onClick={clearAll}>Clear All</button>
        </div>
        <div className="url-upload">
          <input
            type="url"
            placeholder="Paste YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="upload-btn"
            disabled={!url.trim() || submittingUrl}
            onClick={async () => {
              const u = url.trim();
              if (!u) return;
              setSubmittingUrl(true);
              try {
                const res = await fetch(`${API_BASE}/upload/url`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: u })
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.detail || "URL processing failed");
                }
                const data = await res.json();
                setStatus({ type: "success", message: `\u2713 ${data.message} Ready to chat!` });
                setChunkCount((c) => c + (data.total_chunks ?? 0));
                setUrl("");
              } catch (e: any) {
                setStatus({ type: "error", message: `Error: ${e.message}` });
              } finally {
                setSubmittingUrl(false);
              }
            }}
          >
            {submittingUrl ? "Processing..." : "Add YouTube"}
          </button>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages" id="messages" ref={messagesRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>Welcome to ASK ATLAS ✨</h2>
              <p>Drop in docs, pics, vids, or a YouTube link. Then ask away.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                {m.role === "assistant" ? (
                  <>
                    <div className="message-avatar">AI</div>
                    <div className="message-content">
                      <div>{m.content}</div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="sources">
                          <strong>Sources:</strong> Referenced {m.sources.length} document chunk(s)
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="message-content">
                      <div>{m.content}</div>
                    </div>
                    <div className="message-avatar">You</div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="input-section">
        <div className="input-wrapper">
          <input
            type="text"
            id="queryInput"
            placeholder="Ask a question about your document..."
            disabled={!canChat || sending}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="send-btn" id="sendBtn" disabled={!canChat || sending || !query.trim()} onClick={send}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

