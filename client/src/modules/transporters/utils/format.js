/** Display helpers for the Transporters module (Indian locale). */

export const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');

/** 23200 -> '₹23,200' */
export const formatMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** ISO timestamp -> '28 Nov 2026' */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ISO timestamp -> '26 Nov, 2:30 pm' */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** '9840012345' -> '98400 12345' */
export function formatPhone(value) {
  const s = String(value || '');
  return /^\d{10}$/.test(s) ? `${s.slice(0, 5)} ${s.slice(5)}` : s;
}

/** '50100012345678' -> '•••• 5678' */
export const maskAccount = (acc) => (acc ? `•••• ${String(acc).slice(-4)}` : '');

export const PAYMENT_TYPE_LABELS = { advance: 'Advance', part: 'Part payment', final: 'Final balance' };

