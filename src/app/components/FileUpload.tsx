"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  onUpload: (file: File) => Promise<void>;
  disabled: boolean;
}

const ACCEPTED = ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/ogg", "audio/flac", "audio/x-m4a"];

function isAudioFile(file: File): boolean {
  return ACCEPTED.includes(file.type) || /\.(mp3|wav|webm|m4a|ogg|flac)$/i.test(file.name);
}

export default function FileUpload({ onUpload, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [formatError, setFormatError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear file name once processing finishes (disabled goes false)
  useEffect(() => {
    if (!disabled) {
      setFileName(null);
      setFormatError(false);
    }
  }, [disabled]);

  const handleFile = async (file: File) => {
    if (!isAudioFile(file)) {
      setFormatError(true);
      return;
    }
    setFormatError(false);
    setFileName(file.name);
    await onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-150 select-none",
          disabled
            ? "opacity-40 cursor-not-allowed border-[#e2e8f2]"
            : dragging
            ? "border-[#6d28d9] bg-[#f5f3ff] cursor-copy"
            : "border-[#e2e8f2] hover:border-[#c4b5fd] hover:bg-[#faf9ff] cursor-pointer",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.webm,.m4a,.ogg,.flac,audio/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {fileName ? (
          /* Uploading — show filename */
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-end gap-[3px] h-4 mb-1">
              {[0, 0.1, 0.2].map((delay, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm bg-[#6d28d9]"
                  style={{ height: "100%", animation: `bar-wave 0.7s ease-in-out ${delay}s infinite` }}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-[#6d28d9] truncate max-w-full px-2">
              {fileName}
            </p>
            <p className="text-[10px] text-[#94a3b8]">Uploading…</p>
          </div>
        ) : dragging ? (
          /* Drag-over state */
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🎵</span>
            <p className="text-xs font-semibold text-[#6d28d9]">Drop to upload</p>
          </div>
        ) : (
          /* Default state */
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-lg text-[#94a3b8]">↑</span>
            <p className="text-xs font-medium text-[#64748b]">
              Drop audio file or <span className="text-[#6d28d9]">browse</span>
            </p>
            <p className="text-[10px] text-[#94a3b8]">mp3 · wav · webm · m4a · ogg</p>
          </div>
        )}
      </div>

      {formatError && (
        <p className="text-[10px] text-red-500 mt-1.5 text-center">
          Unsupported file type. Please upload an audio file.
        </p>
      )}
    </div>
  );
}
