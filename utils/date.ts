/**
 * Returns a time-based greeting (Good morning, etc.)
 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Formats a date to a long string (e.g., Monday, October 5)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Returns a YYYY-MM-DD string using the device's LOCAL timezone.
 * Never use toISOString() for date-only strings — it returns UTC,
 * which breaks dates for any timezone offset from UTC (e.g. PKT = UTC+5).
 */
export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local date as YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date());
}
