"use client";
import { useState, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  userEmail: string | null;
  onSubmit: (email: string) => void;
  onClose: () => void;
}

export default function EmailGate({ open, userEmail, onSubmit, onClose }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(userEmail ?? "");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, userEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Enter a valid email address.");
      return;
    }
    onSubmit(trimmed);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="w-full max-w-md mx-4 bg-white border border-[#e2e8f2] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#5b21b6] to-[#4f46e5]" />

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1e1b4b]">
                {userEmail ? "Switch account" : "Welcome to Audia"}
              </h2>
              <p className="text-sm text-[#64748b] mt-1">
                {userEmail
                  ? "Enter a different email to switch accounts."
                  : "Enter your email to save and access your sessions from any device."}
              </p>
            </div>
            {userEmail && (
              <button
                onClick={onClose}
                className="text-[#94a3b8] hover:text-[#475569] transition-colors ml-4 mt-0.5 text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="email"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full border border-[#e2e8f2] focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 text-[#1e1b4b] placeholder-[#94a3b8] rounded-xl px-4 py-3 text-sm outline-none transition-all"
              />
              {error && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <span>⚠</span> {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-[#5b21b6] hover:bg-[#4c1d95] text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-sm"
            >
              Continue →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
