/**
 * Labels and formatting for audit log entries.
 */

export const MODULES = {
  auth: { label: 'Sign-in', tone: 'neutral' },
  requirements: { label: 'Requirements', tone: 'info' },
  transporters: { label: 'Transporters', tone: 'success' },
  audit_logs: { label: 'Audit log', tone: 'neutral' },
  settings: { label: 'Settings', tone: 'neutral' },
};

const ACTION_LABELS = {
  sign_in: 'Signed in',
  sign_in_failed: 'Failed sign-in',
  paid_closed: 'Paid and closed',
  pod_verified: 'POD verified',
  bank_requested: 'Bank details submitted',
  bank_approved: 'Bank details approved',
  bank_rejected: 'Bank details rejected',
  exported: 'Exported',
};

const FIELD_LABELS = {
  ifsc: 'IFSC',
  account_number: 'Account number',
  whatsapp: 'WhatsApp',
};

const ROLE_LABELS = { admin: 'Administrator', md: 'Managing Director' };

/** 'enquiry_sent' -> 'Enquiry sent' */
export function humanize(code) {
  if (!code) return '';
  const text = String(code).replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function moduleLabel(code) {
  return MODULES[code]?.label || humanize(code);
}

export function moduleTone(code) {
  return MODULES[code]?.tone || 'neutral';
}

export function actionLabel(code) {
  return ACTION_LABELS[code] || humanize(code);
}

export function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return humanize(key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
}

export function roleLabel(code) {
  return ROLE_LABELS[code] || humanize(code);
}

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** '26 Nov 2026, 11:28 am' in the viewer's time zone. */
export function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(v)}`)
      .join(' · ');
  }
  return String(value);
}

/** Where the record lives in the app, if it has a page of its own. */
export function recordHref(entry) {
  if (!entry.recordId) return null;
  const id = encodeURIComponent(entry.recordId);
  if (entry.recordType === 'requirements') return `/requirements?id=${id}`;
  if (entry.recordType === 'transporters') return `/transporters?id=${id}`;
  return null;
}

/** 'yyyy-mm-dd' (local) -> ISO time at the start or end of that local day. */
export function dayBoundary(day, end = false) {
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  const date = end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
