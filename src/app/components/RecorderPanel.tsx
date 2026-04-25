"use client";
import { formatDuration } from "./utils";

type Status = "idle" | "recording" | "processing" | "done" | "error";

interface Props {
  status: Status;
  elapsed: number;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export default function RecorderPanel({ status, elapsed, error, onStart, onStop }: Props) {
  const isRecording = status === "recording";
  const isProcessing = status === "processing";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <p className="text-[10px] font-bold tracking-[0.25em] text-[#94a3b8] uppercase select-none">
        Voice Capture
      </p>

      {/* Button area */}
      {isRecording ? (
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* Pulse rings */}
          <div
            className="absolute rounded-full border-2 border-red-300"
            style={{
              inset: 0,
              animation: "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <div
            className="absolute rounded-full border-2 border-red-200"
            style={{
              inset: 0,
              animation: "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) 0.5s infinite",
            }}
          />
          <button
            onClick={onStop}
            className="relative z-10 w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 transition-all duration-150 flex flex-col items-center justify-center gap-0.5"
          >
            <span className="text-sm leading-none font-bold">■</span>
            <span className="font-mono text-xs font-bold">{formatDuration(elapsed)}</span>
          </button>
        </div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center gap-4 h-32 justify-center">
          <div className="flex items-end gap-1 h-10">
            {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
              <div
                key={i}
                className="w-2 rounded-sm"
                style={{
                  height: "100%",
                  background: "linear-gradient(to top, #5b21b6, #a78bfa)",
                  animation: `bar-wave 0.8s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-[#64748b]">Analyzing audio…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 h-32 justify-center">
          <button
            onClick={onStart}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5b21b6] to-[#4f46e5] text-white shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:from-[#4c1d95] hover:to-[#4338ca] transition-all duration-200 flex items-center justify-center"
          >
            <span className="text-[11px] font-bold tracking-widest uppercase">
              {isDone ? "New" : isError ? "Retry" : "Rec"}
            </span>
          </button>
          {(isDone || isError) && (
            <p className="text-[10px] text-[#94a3b8]">
              {isDone ? "Start a new session" : "Try again"}
            </p>
          )}
        </div>
      )}

      {/* Recording status */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-red-500 block"
            style={{ animation: "rec-blink 1s ease-in-out infinite" }}
          />
          <span className="text-xs text-red-500 font-medium">Recording in progress</span>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 leading-relaxed text-center max-w-[220px]">
          {error}
        </div>
      )}
    </div>
  );
}
