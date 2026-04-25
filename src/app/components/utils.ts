export const SPEAKER_COLORS = ["#6d28d9", "#0369a1", "#047857", "#b45309", "#9d174d"];

export function buildColorMap(speakers: string[]): Record<string, string> {
  return Object.fromEntries(
    speakers.map((sp, i) => [sp, SPEAKER_COLORS[i] ?? "#64748b"])
  );
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
