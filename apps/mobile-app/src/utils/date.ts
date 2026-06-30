export function formatEventTime(value: string): string {
  const date = new Date(value);
  const today = date.toDateString() === new Date().toDateString();
  return `${today ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatElapsed(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function getCustomDateTime(timeStr: string): Date | null {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d > new Date()) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function parseDurationHHMM(value: string): number | null {
  const parts = value.trim().split(':');
  if (parts.length !== 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 0 ? totalMinutes : null;
}
