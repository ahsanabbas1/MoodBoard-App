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
 * Returns YYYY-MM-DD string for a date
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
