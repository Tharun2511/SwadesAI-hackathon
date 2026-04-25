"use client";
import type { TranscriptSegment } from "@/entity/Transcription";
import HistoryEntry from "./HistoryEntry";

type HistoryRecord = {
  id: string;
  title: string | null;
  summary: string | null;
  duration: number;
  segments: TranscriptSegment[];
  createdAt: string;
};

interface Props {
  history: HistoryRecord[];
  loading: boolean;
  loaded: boolean;
  onDelete: (id: string) => void;
  onSegmentsUpdate: (id: string, segments: TranscriptSegment[]) => void;
  onTitleUpdate: (id: string, title: string | null) => void;
  onSummaryUpdate: (id: string, summary: string | null) => void;
}

export default function SessionHistory({
  history,
  loading,
  loaded,
  onDelete,
  onSegmentsUpdate,
  onTitleUpdate,
  onSummaryUpdate,
}: Props) {
  if (!loading && !loaded) return null;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-[#94a3b8] uppercase flex-shrink-0">
          Session Archive
        </h2>
        <div className="flex-1 h-px bg-[#e2e8f2]" />
        {!loading && (
          <span className="text-[10px] text-[#94a3b8] flex-shrink-0">
            {history.length} {history.length === 1 ? "session" : "sessions"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-end gap-1 h-8">
            {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
              <div
                key={i}
                className="w-1.5 rounded-sm bg-[#ddd6fe]"
                style={{
                  height: "100%",
                  animation: `bar-wave 0.8s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="border-2 border-dashed border-[#e2e8f2] rounded-xl p-10 text-center">
          <p className="text-[#94a3b8] text-sm">
            No sessions recorded yet.
          </p>
          <p className="text-[#94a3b8] text-xs mt-1">
            Hit record in the sidebar to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((record) => (
            <HistoryEntry
              key={record.id}
              record={record}
              onDelete={onDelete}
              onSegmentsUpdate={onSegmentsUpdate}
              onTitleUpdate={onTitleUpdate}
              onSummaryUpdate={onSummaryUpdate}
            />
          ))}
        </div>
      )}
    </section>
  );
}
