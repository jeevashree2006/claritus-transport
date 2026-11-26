/**
 * Helpers for turning setting values into editable drafts, comparing them, and describing
 * them in words for the "In force" / "Default" lines.
 */

const LIST_SEPARATOR = ' · ';

/** Value as the form edits it: numbers become strings, lists become text with one line each. */
export function toDraft(setting, value) {
  switch (setting.type) {
    case 'number':
      return value === null || value === undefined ? '' : String(value);
    case 'list':
      return (value || []).join('\n');
    case 'fields':
      return fieldsToDraft(setting.fields, value);
    case 'groups':
      return Object.fromEntries(setting.groups.map((g) => [g.key, fieldsToDraft(g.fields, value?.[g.key])]));
    case 'multi':
    case 'checklist':
      return [...(value || [])];
    default:
      return value;
  }
}

function fieldsToDraft(fields, value = {}) {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === 'number' ? String(value?.[f.key] ?? '') : Boolean(value?.[f.key])]),
  );
}

/** Draft as sent to the API. Numbers stay as typed; the server validates and converts them. */
export function fromDraft(setting, draft) {
  if (setting.type === 'list') return draft.split(/\r?\n/);
  return draft;
}

/** True when the draft differs from the value in force (ignores order of ticked boxes). */
export function isChanged(setting, draft) {
  return comparable(setting, draft) !== comparable(setting, toDraft(setting, setting.value));
}

function comparable(setting, draft) {
  if (setting.type === 'list') {
    return JSON.stringify(
      draft
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }
  if (setting.type === 'number') return String(draft).trim();
  if (setting.type === 'multi' || setting.type === 'checklist') return JSON.stringify([...draft].sort());
  if (setting.type === 'fields' || setting.type === 'groups') return JSON.stringify(trimNumbers(draft));
  return JSON.stringify(draft);
}

function trimNumbers(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, trimNumbers(value[k])]),
    );
  }
  return value;
}

// ---- Describing values in words -------------------------------------------

const optionLabel = (options, v) => options.find((o) => o.value === v)?.label ?? v;
const withUnit = (n, unit) => (unit ? `${n} ${unit}` : String(n));

function describeFields(fields, value = {}) {
  return fields
    .map((f) => {
      const v = value?.[f.key];
      if (f.type === 'boolean') {
        if (Array.isArray(f.summary)) return v ? f.summary[0] : f.summary[1];
        return `${lowerFirst(f.label)}: ${v ? 'on' : 'off'}`;
      }
      if (f.summary) return f.summary.replace('{v}', v);
      return `${lowerFirst(f.label)} ${withUnit(v, f.unit)}`;
    })
    .join(', ');
}

function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** "30 minutes", "On", "Block the payment", "Excel · PDF", ... */
export function describeValue(setting, value) {
  switch (setting.type) {
    case 'number':
      return withUnit(value, setting.unit);
    case 'boolean':
      return value ? 'On' : 'Off';
    case 'select':
      return optionLabel(setting.options, value);
    case 'multi':
      return value?.length ? value.map((v) => optionLabel(setting.options, v)).join(LIST_SEPARATOR) : 'None';
    case 'list':
      return value?.length ? value.join(LIST_SEPARATOR) : 'None';
    case 'checklist': {
      const total = setting.groups.reduce((sum, g) => sum + g.items.length, 0);
      return `${value?.length || 0} of ${total} items mandatory`;
    }
    case 'fields':
      return describeFields(setting.fields, value);
    case 'groups':
      return setting.groups
        .map((g) => `${lowerFirst(g.label)}: ${describeFields(g.fields, value?.[g.key])}`)
        .join('; ');
    default:
      return String(value ?? '');
  }
}

/** "minutes · 0 – 1440" */
export function numberHint(def) {
  const range = def.min !== undefined && def.max !== undefined ? `${def.min} – ${def.max}` : '';
  return [def.unit, range].filter(Boolean).join(' · ');
}

/** "26 Nov 2026, 10:55 am" in the browser's time zone. */
export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
