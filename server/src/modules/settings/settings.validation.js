/**
 * Validation driven entirely by settings.definitions.js.
 *
 *   const { value, error } = validateSetting(definition, rawValue);
 *
 * `error` is a sentence for the whole setting, or an object { '<subKey>': sentence }
 * for settings made of several inputs (fields / groups). Values are normalised:
 * numbers become numbers, lists are trimmed, multi / checklist values follow option order.
 */

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function validateNumber(def, raw) {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    return { error: 'Enter a number' };
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return { error: 'Enter a number' };
  const integer = def.integer !== false;
  if (integer && !Number.isInteger(n)) return { error: 'Enter a whole number' };
  if (def.min !== undefined && n < def.min) return { error: `Enter ${def.min} or more` };
  if (def.max !== undefined && n > def.max) return { error: `Enter ${def.max} or less` };
  const value = integer ? n : Math.round(n * 100) / 100;
  return { value };
}

function validateBoolean(_def, raw) {
  if (typeof raw !== 'boolean') return { error: 'Choose on or off' };
  return { value: raw };
}

function validateSelect(def, raw) {
  const value = raw === null || raw === undefined ? '' : String(raw);
  if (!def.options.some((o) => o.value === value)) return { error: 'Choose one of the listed options' };
  return { value };
}

function validateMulti(def, raw, itemOptions) {
  if (!Array.isArray(raw)) return { error: 'Choose from the listed options' };
  const allowed = itemOptions.map((o) => o.value);
  const picked = new Set(raw.map(String));
  const unknown = [...picked].filter((v) => !allowed.includes(v));
  if (unknown.length) return { error: 'Choose only from the listed options' };
  const value = allowed.filter((v) => picked.has(v));
  if (def.minItems && value.length < def.minItems) {
    return { error: def.minItems === 1 ? 'Choose at least one' : `Choose at least ${def.minItems}` };
  }
  return { value };
}

function validateList(def, raw) {
  let lines = raw;
  if (typeof raw === 'string') lines = raw.split(/\r?\n/);
  if (!Array.isArray(lines)) return { error: 'Enter one value per line' };
  const value = [];
  const seen = new Set();
  for (const line of lines) {
    if (typeof line !== 'string') return { error: 'Enter one value per line' };
    const text = line.trim();
    if (!text) continue;
    if (def.maxLength && text.length > def.maxLength) {
      return { error: `Keep each line under ${def.maxLength} characters` };
    }
    const lower = text.toLowerCase();
    if (seen.has(lower)) return { error: `"${text}" is listed twice` };
    seen.add(lower);
    value.push(text);
  }
  if (value.length === 0) return { error: 'Enter at least one line' };
  if (def.maxItems && value.length > def.maxItems) return { error: `Keep it to ${plural(def.maxItems, 'line')}` };
  return { value };
}

function validateText(def, raw) {
  if (typeof raw !== 'string') return { error: 'Enter a value' };
  const value = raw.trim();
  if (!value) return { error: 'Enter a value' };
  if (def.maxLength && value.length > def.maxLength) return { error: `Keep it under ${def.maxLength} characters` };
  return { value };
}

/** Object of number / boolean inputs. Errors are keyed by field key. */
function validateFields(fields, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: Object.fromEntries(fields.map((f) => [f.key, 'Enter a value'])) };
  }
  const value = {};
  const errors = {};
  for (const field of fields) {
    const result = field.type === 'boolean' ? validateBoolean(field, raw[field.key]) : validateNumber(field, raw[field.key]);
    if (result.error) errors[field.key] = result.error;
    else value[field.key] = result.value;
  }
  return Object.keys(errors).length ? { error: errors } : { value };
}

function validateGroups(def, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Enter every value' };
  const value = {};
  const errors = {};
  for (const group of def.groups) {
    const result = validateFields(group.fields, raw[group.key]);
    if (result.error) {
      for (const [k, msg] of Object.entries(result.error)) errors[`${group.key}.${k}`] = msg;
    } else {
      value[group.key] = result.value;
    }
  }
  return Object.keys(errors).length ? { error: errors } : { value };
}

export function validateSetting(def, raw) {
  switch (def.type) {
    case 'number':
      return validateNumber(def, raw);
    case 'boolean':
      return validateBoolean(def, raw);
    case 'select':
      return validateSelect(def, raw);
    case 'multi':
      return validateMulti(def, raw, def.options);
    case 'checklist':
      return validateMulti(def, raw, def.groups.flatMap((g) => g.items));
    case 'list':
      return validateList(def, raw);
    case 'text':
      return validateText(def, raw);
    case 'fields':
      return validateFields(def.fields, raw);
    case 'groups':
      return validateGroups(def, raw);
    default:
      return { error: 'This setting cannot be changed' };
  }
}

/** Stable comparison of two normalised values. */
export function sameValue(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}
