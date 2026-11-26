/**
 * Settings: admin-editable business rules ("Configure, do not hardcode").
 *
 * Defaults live in settings.definitions.js. The app_settings table holds a row only for a
 * setting whose value differs from its default. Every save and reset is written to the
 * audit log with the previous and new values (FRD FR-CM-004).
 *
 * Other modules read settings with:
 *   import { getSetting, getSection } from '../settings/settings.service.js';
 *   const minutes = await getSetting('trips.delayThresholdMinutes');      // 30
 *   const pod = await getSection('pod');  // { rejectionReasons: [...], quantityToleranceTonnes: 0 }
 * When you start reading a setting, set its `usedBy` in settings.definitions.js so the
 * page stops showing "Stored – not used yet".
 */
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { recordAudit } from '../audit-logs/audit-logs.service.js';
import { SECTIONS, SECTION_KEYS, SETTINGS, SETTINGS_BY_KEY } from './settings.definitions.js';
import { sameValue, validateSetting } from './settings.validation.js';

// Every default must pass its own validation; catch a bad edit to the definitions at start-up.
for (const def of SETTINGS) {
  const { value, error } = validateSetting(def, def.default);
  if (error || !sameValue(value, def.default)) {
    throw new Error(`[settings] Default of ${def.key} is not valid: ${JSON.stringify(error || value)}`);
  }
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function parseJson(raw) {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== 'string') return raw; // MySQL 8 JSON column is already parsed
  try {
    return JSON.parse(raw); // MariaDB returns JSON as text
  } catch {
    return undefined;
  }
}

/**
 * A stored value that no longer passes validation (e.g. an option was removed from the
 * definitions) is ignored, so the default is used instead of a broken value.
 */
function storedOrDefault(def, raw) {
  const stored = parseJson(raw);
  if (stored === undefined) return { value: clone(def.default), overridden: false };
  const { value, error } = validateSetting(def, stored);
  if (error) return { value: clone(def.default), overridden: false };
  return { value, overridden: true };
}

async function readRows(db, section = null) {
  const [rows] = section
    ? await db.query('SELECT setting_key, value_json FROM app_settings WHERE section = ?', [section])
    : await db.query('SELECT setting_key, value_json FROM app_settings');
  return new Map(rows.map((r) => [r.setting_key, r.value_json]));
}

// ---------------------------------------------------------------------------
// Read helpers for other modules
// ---------------------------------------------------------------------------

/** Value in force for one setting. Throws for an unknown key (a typo should fail loudly). */
export async function getSetting(key) {
  const def = SETTINGS_BY_KEY.get(key);
  if (!def) throw new Error(`[settings] Unknown setting "${key}"`);
  const [rows] = await pool.query('SELECT value_json FROM app_settings WHERE setting_key = ?', [key]);
  return storedOrDefault(def, rows[0]?.value_json).value;
}

/** Values in force for a whole section, keyed by the part after '<section>.'. */
export async function getSection(section) {
  if (!SECTION_KEYS.has(section)) throw new Error(`[settings] Unknown settings section "${section}"`);
  const rows = await readRows(pool, section);
  const result = {};
  for (const def of SETTINGS.filter((s) => s.section === section)) {
    result[def.key.slice(section.length + 1)] = storedOrDefault(def, rows.get(def.key)).value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

/** Definition without server-only details, plus value in force and default. */
function describe(def, rows) {
  const { value, overridden } = storedOrDefault(def, rows.get(def.key));
  const { section: _section, usedBy, ...meta } = def;
  return {
    ...meta,
    tbc: Boolean(def.tbc),
    notUsedYet: !usedBy,
    usedBy: usedBy || null,
    value,
    default: clone(def.default),
    overridden,
  };
}

/** Latest save / reset per section, read from the audit log (survives a reset). */
async function lastChanges() {
  try {
    const [rows] = await pool.query(
      `SELECT a.record_id AS section, a.action, a.created_at, COALESCE(u.name, a.user_name) AS user_name
         FROM audit_logs a
         JOIN (SELECT record_id, MAX(id) AS id
                 FROM audit_logs
                WHERE module = 'settings' AND record_type = 'app_settings'
                GROUP BY record_id) last ON last.id = a.id
         LEFT JOIN users u ON u.id = a.user_id`
    );
    return new Map(
      rows.map((r) => [r.section, { by: r.user_name || 'Unknown user', at: r.created_at, action: r.action }])
    );
  } catch (error) {
    console.error('[settings] Could not read last changes from the audit log:', error.message);
    return new Map();
  }
}

export async function listSections() {
  const [rows, changes] = await Promise.all([readRows(pool), lastChanges()]);
  return SECTIONS.map((section) => ({
    ...section,
    lastChanged: changes.get(section.key) || null,
    settings: SETTINGS.filter((s) => s.section === section.key).map((def) => describe(def, rows)),
  }));
}

export async function getSectionForPage(sectionKey) {
  const sections = await listSections();
  const section = sections.find((s) => s.key === sectionKey);
  if (!section) throw new AppError('Settings section not found.', 404);
  return section;
}

async function inTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function sectionMeta(sectionKey) {
  const section = SECTIONS.find((s) => s.key === sectionKey);
  if (!section) throw new AppError('Settings section not found.', 404);
  return section;
}

/**
 * Saves the given values of one section. Only keys of that section are accepted; keys not
 * sent keep their current value. A value equal to its default removes the stored row.
 * Throws 400 with { errors: { '<settingKey>' | '<settingKey>.<sub>': message } }.
 * Returns { changed: number, section }.
 */
export async function saveSection(sectionKey, values, req) {
  const section = sectionMeta(sectionKey);
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new AppError('Send the settings to save.', 400);
  }

  const errors = {};
  const valid = new Map();
  for (const [key, raw] of Object.entries(values)) {
    const def = SETTINGS_BY_KEY.get(key);
    if (!def || def.section !== sectionKey) {
      errors[key] = 'This setting is not part of this section';
      continue;
    }
    const { value, error } = validateSetting(def, raw);
    if (error && typeof error === 'object') {
      for (const [sub, msg] of Object.entries(error)) errors[`${key}.${sub}`] = msg;
    } else if (error) {
      errors[key] = error;
    } else {
      valid.set(key, value);
    }
  }
  if (Object.keys(errors).length) {
    throw new AppError('Some values are not valid. Check the highlighted fields.', 400, { errors });
  }

  const changed = await inTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT setting_key, value_json FROM app_settings WHERE section = ? FOR UPDATE',
      [sectionKey]
    );
    const stored = new Map(rows.map((r) => [r.setting_key, r.value_json]));
    const oldValues = {};
    const newValues = {};

    for (const [key, value] of valid) {
      const def = SETTINGS_BY_KEY.get(key);
      const current = storedOrDefault(def, stored.get(key)).value;
      if (sameValue(current, value)) continue;

      if (sameValue(value, def.default)) {
        await conn.query('DELETE FROM app_settings WHERE setting_key = ?', [key]);
      } else {
        await conn.query(
          `INSERT INTO app_settings (setting_key, section, value_json, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_by = VALUES(updated_by),
                                   updated_at = CURRENT_TIMESTAMP`,
          [key, sectionKey, JSON.stringify(value), req?.user?.id || null]
        );
      }
      oldValues[key] = current;
      newValues[key] = value;
    }

    const count = Object.keys(newValues).length;
    if (count > 0) {
      await recordAudit({
        req,
        conn,
        module: 'settings',
        action: 'updated',
        summary: `Changed ${count === 1 ? '1 setting' : `${count} settings`} in ${section.title}`,
        recordType: 'app_settings',
        recordId: sectionKey,
        recordLabel: section.title,
        oldValues,
        newValues,
      });
    }
    return count;
  });

  return { changed, section: await getSectionForPage(sectionKey) };
}

/** Puts every setting of a section back to its default. Returns { changed, section }. */
export async function resetSection(sectionKey, req) {
  const section = sectionMeta(sectionKey);

  const changed = await inTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT setting_key, value_json FROM app_settings WHERE section = ? FOR UPDATE',
      [sectionKey]
    );
    const oldValues = {};
    const newValues = {};
    for (const row of rows) {
      const def = SETTINGS_BY_KEY.get(row.setting_key);
      if (!def) continue; // row of a setting removed from the definitions - just delete it
      const current = storedOrDefault(def, row.value_json).value;
      if (sameValue(current, def.default)) continue;
      oldValues[row.setting_key] = current;
      newValues[row.setting_key] = clone(def.default);
    }
    await conn.query('DELETE FROM app_settings WHERE section = ?', [sectionKey]);

    const count = Object.keys(newValues).length;
    if (count > 0) {
      await recordAudit({
        req,
        conn,
        module: 'settings',
        action: 'reset',
        summary: `Reset ${section.title} settings to defaults (${count === 1 ? '1 setting' : `${count} settings`} changed)`,
        recordType: 'app_settings',
        recordId: sectionKey,
        recordLabel: section.title,
        oldValues,
        newValues,
      });
    }
    return count;
  });

  return { changed, section: await getSectionForPage(sectionKey) };
}
