"use client";
import { useState, useRef, useEffect } from "react";
import type { TranscriptSegment } from "@/entity/Transcription";
import { formatDuration } from "./utils";
import TitleInput from "./TitleInput";

type Message = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const QUICK_PROMPTS = [
  "What were the action items?",
  "What key decisions were made?",
  "Summarize each speaker's points",
  "Were there any unresolved questions?",
];

interface Props {
  segments: TranscriptSegment[];
  /** When provided, renders a renameable transcript title in the panel header */
  transcriptionId?: string;
  currentTitle?: string | null;
  onTitleSave?: (title: string | null) => void;
}

function buildPrompt(segments: TranscriptSegment[], question: string): string {
  const transcript = segments
    .map((s) => `${s.speaker} (${formatDuration(s.start)}): ${s.text}`)
    .join("\n");
  return `You are a helpful assistant analyzing a conversation transcript. Answer the question concisely and clearly based only on what's in the transcript.\n\nTranscript:\n${transcript}\n\nQuestion: ${question}`;
}

export default function ChatPanel({ segments, transcriptionId, currentTitle, onTitleSave }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading || segments.length === 0) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", streaming: true },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(segments, question) }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snap } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "Something went wrong. Please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m))
      );
      setLoading(false);
    }
  };

  const questionCount = messages.filter((m) => m.role === "user").length;
  const noTranscript = segments.length === 0;

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f2] overflow-hidden shadow-sm">
      {/* Teal accent bar — distinct from the violet summary bar */}
      <div className="h-[3px] bg-gradient-to-r from-[#0369a1] via-[#0ea5e9] to-[#38bdf8]" />

      {/* Header: title (left) + chevron (right) */}
      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[#f8fafc] transition-colors">

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-center flex-shrink-0 text-[11px]">
            💬
          </div>

          {/* If transcriptionId is provided, show a renameable transcript title */}
          {transcriptionId && onTitleSave ? (
            <TitleInput
              transcriptionId={transcriptionId}
              initialTitle={currentTitle ?? null}
              fallback="Untitled — click to name"
              onSaved={onTitleSave}
            />
          ) : (
            <span className="text-sm font-semibold text-[#1e1b4b]">Ask about this transcript</span>
          )}

          {questionCount > 0 && (
            <span className="text-[10px] bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] rounded-full px-2 py-0.5 font-semibold flex-shrink-0">
              {questionCount}
            </span>
          )}
        </div>

        {/* Chevron — only thing that toggles open/close */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-2 p-1 text-[#94a3b8] hover:text-[#64748b] transition-colors flex-shrink-0"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <span
            className="text-sm select-none block transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </button>

      </div>

      {open && (
        <div className="border-t border-[#e2e8f2]">

          {/* Quick-prompt chips — only before first question */}
          {messages.length === 0 && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading || noTranscript}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#e2e8f2] text-[#475569] hover:border-[#7dd3fc] hover:text-[#0369a1] hover:bg-[#f0f9ff] transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Message thread */}
          {messages.length > 0 && (
            <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#0369a1] text-white rounded-tr-sm"
                        : "bg-[#f8fafc] border border-[#e2e8f2] text-[#334155] rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant" && msg.streaming && msg.content === "" ? (
                      <span className="inline-flex items-center gap-1 py-0.5">
                        {[0, 0.2, 0.4].map((delay, j) => (
                          <span
                            key={j}
                            className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1] block"
                            style={{ animation: `rec-blink 1.2s ease-in-out ${delay}s infinite` }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                        {msg.streaming && (
                          <span className="inline-block w-[2px] h-[14px] bg-current ml-0.5 align-middle opacity-60 animate-pulse" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input row */}
          <div className={`flex gap-2 px-4 py-3 ${messages.length > 0 ? "border-t border-[#e2e8f2]" : ""}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                noTranscript
                  ? "Record or upload a session first…"
                  : "Ask anything about this transcript…"
              }
              disabled={loading || noTranscript}
              className="flex-1 text-sm border border-[#e2e8f2] focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/10 rounded-xl px-3.5 py-2 outline-none text-[#1e1b4b] placeholder-[#94a3b8] disabled:opacity-50 transition-all bg-white"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading || noTranscript}
              className="px-4 py-2 bg-[#0369a1] hover:bg-[#0284c7] disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
            >
              Send
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
