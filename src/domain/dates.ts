const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

export function formatDeadline(deadline: string): string {
  const [year, month, day] = deadline.split("-");
  return `${day}.${month}.${year}`;
}

export function formatDate(isoTimestamp: string): string {
  return formatDeadline(localDateKey(new Date(isoTimestamp)));
}

export function formatRelative(then: Date, now: Date): string {
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE) return "gerade eben";
  if (elapsed < HOUR) return `vor ${Math.floor(elapsed / MINUTE)} Min.`;
  if (elapsed < DAY) return `vor ${Math.floor(elapsed / HOUR)} Std.`;
  const days = Math.floor(elapsed / DAY);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}

export function isOverdue(deadline: string, today: Date): boolean {
  return deadline < localDateKey(today);
}
