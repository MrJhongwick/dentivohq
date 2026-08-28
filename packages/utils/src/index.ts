export type TimeRange = { start: Date; end: Date };

export function rangesOverlap(a: TimeRange, b: TimeRange) {
  return a.start < b.end && b.start < a.end;
}

export function calculateSlots(input: {
  window: TimeRange;
  durationMinutes: number;
  intervalMinutes: number;
  unavailable: TimeRange[];
}) {
  const slots: TimeRange[] = [];
  const durationMs = input.durationMinutes * 60_000;
  const intervalMs = input.intervalMinutes * 60_000;
  for (let startMs = input.window.start.getTime(); startMs + durationMs <= input.window.end.getTime(); startMs += intervalMs) {
    const candidate = { start: new Date(startMs), end: new Date(startMs + durationMs) };
    if (!input.unavailable.some((range) => rangesOverlap(candidate, range))) slots.push(candidate);
  }
  return slots;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function localDateTimeToUtc(date: string, minuteOfDay: number, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day || minuteOfDay < 0 || minuteOfDay > 1440) throw new Error("INVALID_LOCAL_DATE_TIME");
  const hour = Math.floor(minuteOfDay / 60); const minute = minuteOfDay % 60;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(target)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const represented = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!);
  const first = new Date(target - (represented - target));
  const correctedParts = Object.fromEntries(formatter.formatToParts(first).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const corrected = Date.UTC(correctedParts.year!, correctedParts.month! - 1, correctedParts.day!, correctedParts.hour!, correctedParts.minute!);
  return new Date(first.getTime() - (corrected - target));
}

export function weekdayInZone(date: string, timeZone: string) {
  const noon = localDateTimeToUtc(date, 12 * 60, timeZone);
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}
