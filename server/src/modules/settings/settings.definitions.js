/**
 * Every admin-editable setting, in one place ("Configure, do not hardcode").
 * The API, the validation and the Settings page are all driven by this file.
 *
 * Only settings that some part of the application actually reads are listed here.
 * Add a setting at the same time as the code that uses it - never ahead of it.
 *
 * Setting fields
 *   key         unique id, '<section>.<name>'. Never rename a key once saved values exist.
 *   section     tab it belongs to (see SECTIONS)
 *   label/help  text shown on the page (sentence case)
 *   frd         FRD / BRD reference shown as a pill
 *   tbc         true = "TBC with client" pill (rule not yet confirmed)
 *   usedBy      short note naming the screen or code that reads the setting
 *   type        number | boolean | select | multi | list | text | checklist | fields | groups
 *   default     value in force when no admin has changed it
 *
 * Type-specific fields
 *   number      min, max, unit, integer (default true), step
 *   select      options [{ value, label }]
 *   multi       options [{ value, label }], minItems        value: array of option values
 *   list        maxItems, maxLength                         value: array of lines (one per line)
 *   text        maxLength                                   value: string
 *   checklist   groups [{ label, items: [{ value, label }] }]  value: array of ticked item values
 *   fields      fields [{ key, label, type: number|boolean, summary, ... }]  value: { [key]: v }
 *   groups      groups [{ key, label, fields: [...] }]      value: { [groupKey]: { [key]: v } }
 */

export const SECTIONS = Object.freeze([
  {
    key: 'trips',
    title: 'Trips & Follow-up',
    description: 'When a vehicle counts as reported late.',
  },
  {
    key: 'reports',
    title: 'Reports',
    description: 'The period reports open with and when the financial year starts.',
  },
  {
    key: 'general',
    title: 'General',
    description: 'The time zone used to work out where a month, quarter or year starts.',
  },
]);

export const SETTINGS = Object.freeze([
  // ---- Trips & Follow-up --------------------------------------------------
  {
    key: 'trips.delayThresholdMinutes',
    section: 'trips',
    label: 'Count a vehicle as late when it is loaded more than',
    help: 'Compared with the expected reporting time entered at booking. Shown in the "Reported late" column of the Success rate page.',
    frd: 'FR-TR-078',
    usedBy: 'Success rate page: "Reported late" column',
    type: 'number',
    unit: 'minutes',
    min: 0,
    max: 1440,
    default: 30,
  },

  // ---- Reports ------------------------------------------------------------
  {
    key: 'reports.defaultPeriod',
    section: 'reports',
    label: 'Default date filter',
    help: 'Period the Success rate page opens with. Users can still change it on the page.',
    frd: 'FR-TR-112',
    usedBy: 'Success rate page: period it opens with',
    type: 'select',
    options: [
      { value: 'this_month', label: 'This month' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'this_quarter', label: 'This quarter' },
      { value: 'this_financial_year', label: 'This financial year' },
    ],
    default: 'this_month',
  },
  {
    key: 'reports.financialYearStartMonth',
    section: 'reports',
    label: 'Financial year starts in',
    help: 'Decides what the "This financial year" filter covers.',
    frd: 'FR-TR-111',
    usedBy: 'Success rate page: "This financial year" filter',
    type: 'select',
    options: [
      { value: '1', label: 'January' },
      { value: '4', label: 'April' },
      { value: '7', label: 'July' },
      { value: '10', label: 'October' },
    ],
    default: '4',
  },

  // ---- General ------------------------------------------------------------
  {
    key: 'general.timeZone',
    section: 'general',
    label: 'Time zone',
    help: 'Screens show times in the browser’s time zone. Reports use this zone for where a month, quarter or financial year starts.',
    frd: 'FR-CM (general)',
    usedBy: 'Success rate page: start of month, quarter and year',
    type: 'select',
    options: [
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai' },
      { value: 'Asia/Singapore', label: 'Asia/Singapore' },
      { value: 'UTC', label: 'UTC' },
    ],
    default: 'Asia/Kolkata',
  },
]);

export const SETTINGS_BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));
export const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key));

// Fail fast at start-up if this file is edited into an inconsistent state.
for (const s of SETTINGS) {
  if (!SECTION_KEYS.has(s.section)) throw new Error(`[settings] ${s.key}: unknown section "${s.section}"`);
  if (!s.key.startsWith(`${s.section}.`)) throw new Error(`[settings] ${s.key}: key must start with "${s.section}."`);
}
