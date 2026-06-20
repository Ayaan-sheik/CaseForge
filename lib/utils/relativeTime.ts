/** "3 days ago"-style relative timestamps for the dashboard. */
export function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';
  const seconds = Math.floor((Date.now() - ms) / 1000);

  // Clock skew / future dates read as "just now" rather than negative units.
  if (seconds < 60) return 'just now';

  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'year'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24 * 7, 'week'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ];

  for (const [unitSeconds, label] of units) {
    if (seconds >= unitSeconds) {
      const count = Math.floor(seconds / unitSeconds);
      return `${count} ${label}${count === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
}
