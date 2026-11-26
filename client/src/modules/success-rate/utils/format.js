/** Display helpers for the Success rate screen. */

/** "82%" or "–" when there is nothing to measure. */
export const formatPercent = (value) => (value === null || value === undefined ? '–' : `${value}%`);

/** "7.9 h", "45 min" or "–". */
export function formatHours(hours) {
  if (hours === null || hours === undefined) return '–';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours} h`;
}

/** "30 minutes", "2 hours", "1 hour 30 minutes". */
export function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m || !h) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/** Badge tone for a transporter's participation label (reply behaviour, not a score). */
export const PARTICIPATION_TONES = {
  active: 'success',
  occasional: 'warning',
  no_replies: 'danger',
  not_asked: 'neutral',
  deactivated: 'neutral',
};
