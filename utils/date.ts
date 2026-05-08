/** Returns the user's current IANA timezone when the device exposes it. */
export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * Returns a time-based greeting (Good morning, etc.) using the user's device time.
 */
export function getGreeting(): string {
  const now = new Date();
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Formats a date to a long string (e.g., Monday, October 5) using device local time.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns a YYYY-MM-DD string using the user's device local date boundary.
 */
export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date as YYYY-MM-DD in the user's device timezone. */
export function todayString(): string {
  return toDateString(new Date());
}

/** Get current date and time in the user's device timezone. */
export function getLocalTime(): Date {
  return new Date();
}

/**
 * Format time in 12-hour format using the user's device timezone.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
