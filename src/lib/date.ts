import { formatDistanceToNow } from "date-fns";

/**
 * Formats a date relative to now (e.g., "3 minutes ago", "yesterday").
 * Wrapper around date-fns formatDistanceToNow.
 * 
 * @param date - The date to format (Date object, timestamp number, or date string)
 * @returns Human readable relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: true });
}
