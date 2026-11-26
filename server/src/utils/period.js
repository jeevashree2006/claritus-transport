/**
 * Report periods and business time-zone helpers, shared by the Dashboard and Success rate.
 *
 *   const { from } = periodRange('this_month', { timeZone: 'Asia/Kolkata', fyStartMonth: 4 });
 *
 * `from` is the UTC instant the period starts (null = all time). Periods are worked out in
 * the business time zone (Settings › General › Time zone), so "this month" starts at local
 * midnight on the 1st, not at UTC midnight.
 */

export const PERIODS = Object.freeze([
  { value: 'this_month', label: 'This month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_financial_year', label: 'This financial year' },
  { value: 'all', label: 'All time' },
]);

/** Offset of `timeZone` from UTC at `date`, in minutes (e.g. +330 for Asia/Kolkata). */
export function zoneOffsetMinutes(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name || '');
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/** Calendar parts of `date` as seen in `timeZone`. */
function zonedParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** UTC instant of local midnight on year-month-day in `timeZone` (month is 1-12, may overflow). */
function zonedMidnight(year, month, day, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60000);
}

export function periodRange(period, { timeZone, fyStartMonth }, now = new Date()) {
  const { year, month, day } = zonedParts(now, timeZone);
  switch (period) {
    case 'this_month':
      return { from: zonedMidnight(year, month, 1, timeZone), to: null };
    case 'last_30_days':
      return { from: zonedMidnight(year, month, day - 29, timeZone), to: null };
    case 'this_quarter': {
      const startMonth = month - ((month - 1) % 3);
      return { from: zonedMidnight(year, startMonth, 1, timeZone), to: null };
    }
    case 'this_financial_year': {
      const startYear = month >= fyStartMonth ? year : year - 1;
      return { from: zonedMidnight(startYear, fyStartMonth, 1, timeZone), to: null };
    }
    default:
      return { from: null, to: null };
  }
}

/**
 * The booking form saves "expected reporting time" as the local wall-clock time typed by
 * the user (a DATETIME with no zone). Everything else is UTC. Adding this many minutes to
 * `expected_reporting_at` in SQL turns it into UTC and applies the late threshold in one step:
 *
 *   m.occurred_at > bk.expected_reporting_at + INTERVAL ? MINUTE    -- param: lateShiftMinutes(...)
 */
export function lateShiftMinutes(delayMinutes, timeZone, now = new Date()) {
  return Number(delayMinutes) - zoneOffsetMinutes(now, timeZone);
}
