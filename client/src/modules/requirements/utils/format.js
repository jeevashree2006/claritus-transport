/** Display helpers for the Requirements module (Indian locale). */

export const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');

/** 23200 -> '₹23,200' */
export const formatMoney = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatTonnes = (n) =>
  `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t`;

/** 'YYYY-MM-DD' -> '28 Nov 2026' */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
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

/** Today as 'YYYY-MM-DD' in local time (for date inputs). */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
