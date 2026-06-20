/** 95 → "1:35" */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return '0:00';
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
