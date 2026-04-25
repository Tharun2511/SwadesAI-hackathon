"use client";
import { useState } from "react";

interface Props {
  transcriptionId: string;
  initialSummary: string | null;
  onSaved: (summary: string | null) => void;
}

export default function SummaryBlock({ transcriptionId, initialSummary, onSaved }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const res = await fetch(`/api/transcriptions/${transcriptionId}/summary`, { method: "POST" });
    if (res.ok) {
      const { summary: s } = await res.json();
      setSummary(s);
      onSaved(s);
    }
    setGenerating(false);
  };

  const isShort = summary?.trim() === "Not enough conversation to summarize.";
  const bullets =
    summary && !isShort
      ? summary
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .map((l) => l.replace(/^([•\-*]|\d+[.)]) */, "").trim())
          .filter((l) => l.length > 0)
      : [];

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f2] overflow-hidden shadow-sm">
      {/* Gradient accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-[#5b21b6] via-[#6d28d9] to-[#4f46e5]" />

      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#6d28d9] uppercase">
              AI Summary
            </span>
          </div>
          {!summary && (
            <button
              onClick={generate}
              disabled={generating}
              className="text-xs px-3 py-1 border border-[#e2e8f2] rounded-lg text-[#64748b] hover:text-[#1e1b4b] hover:border-[#c4b5fd] transition-colors disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          )}
        </div>

        {generating && !summary && (
          <p className="text-xs text-[#94a3b8] italic">Analyzing conversation…</p>
        )}
        {isShort && (
          <p className="text-sm text-[#94a3b8] italic">Not enough content to summarize.</p>
        )}
        {bullets.length > 0 && (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <span className="text-[#6d28d9] text-xs mt-[3px] flex-shrink-0">▸</span>
                <span className="text-sm text-[#475569] leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        )}
        {!summary && !generating && (
          <p className="text-xs text-[#94a3b8] italic">No summary yet — click Generate to create one.</p>
        )}
      </div>
    </div>
  );
}
