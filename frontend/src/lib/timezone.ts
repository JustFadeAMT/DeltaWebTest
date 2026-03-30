/**
 * Timezone utilities for the Delta-Neutral Trading app.
 *
 * The backend stores all timestamps as naive UTC (no timezone suffix).
 * JavaScript's `new Date("2026-03-29T04:15:00")` treats strings without
 * a timezone indicator as LOCAL time, which breaks timezone conversion.
 *
 * This module provides a `parseUTC` helper that forces naive timestamps
 * to be interpreted as UTC before any timezone conversion.
 */

export const TIMEZONE = 'Asia/Bangkok';

/**
 * Parse a timestamp string as UTC.
 *
 * If the string has no timezone indicator (Z, +, or -offset),
 * appends 'Z' so `new Date()` treats it as UTC.
 *
 * @example
 * parseUTC("2026-03-29T04:15:00")   // → Date representing UTC 04:15
 * parseUTC("2026-03-29T04:15:00Z")  // → same (already has Z)
 */
export function parseUTC(timestamp: string): Date {
  const trimmed = timestamp.trim();
  // Already has timezone info — leave as-is
  if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  // Append Z to force UTC interpretation
  return new Date(trimmed + 'Z');
}
