// Business-day arithmetic, weekends-only (no holiday calendar — decided
// 2026-07-18; a task landing near a holiday just waits a day).
export function addBusinessDays(start: Date, n: number): Date {
  const d = new Date(start.getTime());
  let remaining = n;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  // A 0-add starting on a weekend still lands on the weekend; only shifts
  // when days are actually added — matches "3 business days after X".
  return d;
}
