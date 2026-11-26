/**
 * Audit logs (FRD FR-CM-004): who did what and when, with the previous and new values.
 *
 * Two sources are read together:
 *   - audit_logs           append-only table written by recordAudit() (sign-ins, transporters, ...)
 *   - requirement_history  timeline written by the Requirements module (read only here)
 *
 * Other modules write entries with:
 *   import { recordAudit } from '../audit-logs/audit-logs.service.js';
 *   await recordAudit({ req, module: 'transporters', action: 'updated', summary: 'Edited transporter',
 *                       recordType: 'transporters', recordId: id, recordLabel: name,
 *                       oldValues: {...}, newValues: {...} });
 *
 * There is intentionally no update or delete here; the table's triggers refuse both.
 */
import { pool } from '../../config/db.js';
import { STAGES } from '../requirements/requirements.stages.js';

const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10000;

const STAGE_LABELS = Object.fromEntries(STAGES.map((s) => [s.no, s.label]));

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

function clientIp(req) {
  if (!req) return null;
  const ip = req.ip || req.socket?.remoteAddress || null;
  return ip ? String(ip).slice(0, 45) : null;
}

function toJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function cut(value, max) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Appends one audit entry. Never throws: a failed audit write is logged to the console
 * and must not undo or block the business action that triggered it.
 *
 * @param {object} entry
 * @param {object} [entry.req]          Express request (for IP, user agent and req.user)
 * @param {object} [entry.user]         { id, name, role } - defaults to req.user
 * @param {object} [entry.conn]         connection to write inside an open transaction
 * @param {string} entry.module         e.g. 'auth', 'transporters'
 * @param {string} entry.action         e.g. 'sign_in', 'created', 'bank_approved'
 * @param {string} entry.summary        sentence shown in the log
 */
export async function recordAudit({
  req,
  user,
  conn,
  module,
  action,
  summary,
  recordType = null,
  recordId = null,
  recordLabel = null,
  oldValues = null,
  newValues = null,
}) {
  try {
    const actor = user || req?.user || {};
    const db = conn || pool;
    await db.query(
      `INSERT INTO audit_logs
         (user_id, user_name, user_role, module, action, summary, record_type, record_id, record_label,
          old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.id || null,
        cut(actor.name || actor.username, 120),
        cut(actor.role, 30),
        cut(module, 40),
        cut(action, 60),
        cut(summary, 500),
        cut(recordType, 60),
        recordId === null || recordId === undefined ? null : cut(recordId, 60),
        cut(recordLabel, 150),
        toJson(oldValues),
        toJson(newValues),
        clientIp(req),
        cut(req?.get?.('user-agent'), 255),
      ]
    );
  } catch (error) {
    console.error('[audit] Could not write audit entry:', error.message);
  }
}

/** 'XXXXXX1234' style: never store a full bank account number in the log. */
export function maskAccount(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).replace(/\s+/g, '');
  return text.length <= 4 ? '****' : `${'X'.repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}`;
}

/** JSON with object keys sorted, so { a, b } and { b, a } compare equal. */
function stableStringify(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k] ?? null)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Scalars compare as strings (so 5 equals '5'); objects, arrays and dates compare by content. */
function sameValue(a, b) {
  const isObj = (v) => v !== null && typeof v === 'object';
  if (isObj(a) || isObj(b)) return stableStringify(a) === stableStringify(b);
  return String(a) === String(b);
}

/** Returns only the keys whose values differ, as { old, new } objects. */
export function diffValues(before = {}, after = {}, keys = null) {
  const fields = keys || [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  const oldValues = {};
  const newValues = {};
  for (const key of fields) {
    const a = before?.[key] ?? null;
    const b = after?.[key] ?? null;
    if (!sameValue(a, b)) {
      oldValues[key] = a;
      newValues[key] = b;
    }
  }
  return { oldValues, newValues, changed: Object.keys(newValues).length > 0 };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

// Both sources mapped to the same columns. Collations are forced so the UNION never
// fails on "illegal mix of collations" between table columns and string literals.
const C = 'COLLATE utf8mb4_unicode_ci';
const UNIFIED_SOURCE = `
  SELECT CONCAT('a-', a.id) ${C}            AS uid,
         'audit_logs' ${C}                  AS source,
         a.created_at                       AS created_at,
         a.user_id                          AS user_id,
         COALESCE(u.name, a.user_name) ${C} AS user_name,
         COALESCE(r.code, a.user_role) ${C} AS user_role,
         a.module ${C}                      AS module,
         a.action ${C}                      AS action,
         a.summary ${C}                     AS summary,
         a.record_type ${C}                 AS record_type,
         a.record_id ${C}                   AS record_id,
         a.record_label ${C}                AS record_label,
         a.old_values                       AS old_values,
         a.new_values                       AS new_values,
         NULL                               AS stage,
         a.ip_address ${C}                  AS ip_address,
         a.id                               AS sort_id
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN roles r ON r.id = u.role_id
  UNION ALL
  SELECT CONCAT('r-', h.id) ${C},
         'requirement_history' ${C},
         h.created_at,
         h.created_by,
         u.name ${C},
         r.code ${C},
         'requirements' ${C},
         h.action ${C},
         h.message ${C},
         'requirements' ${C},
         COALESCE(q.requirement_no, CAST(h.requirement_id AS CHAR)) ${C},
         q.requirement_no ${C},
         NULL,
         NULL,
         h.stage,
         NULL,
         h.id
    FROM requirement_history h
    LEFT JOIN requirements q ON q.id = h.requirement_id
    LEFT JOIN users u ON u.id = h.created_by
    LEFT JOIN roles r ON r.id = u.role_id
`;

function parseDate(value) {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildWhere(filters = {}) {
  const clauses = [];
  const params = [];

  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (from) {
    clauses.push('x.created_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('x.created_at <= ?');
    params.push(to);
  }
  if (filters.userId && /^\d+$/.test(String(filters.userId))) {
    clauses.push('x.user_id = ?');
    params.push(Number(filters.userId));
  }
  if (filters.module) {
    clauses.push('x.module = ?');
    params.push(String(filters.module).slice(0, 40));
  }
  if (filters.action) {
    clauses.push('x.action = ?');
    params.push(String(filters.action).slice(0, 60));
  }
  const q = typeof filters.q === 'string' ? filters.q.trim().slice(0, 100) : '';
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    clauses.push('(x.record_id LIKE ? OR x.record_label LIKE ? OR x.summary LIKE ?)');
    params.push(like, like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Buffer.isBuffer(value)) return value; // MySQL 8 returns objects
  try {
    return JSON.parse(String(value)); // MariaDB returns JSON as text
  } catch {
    return null;
  }
}

function toEntry(row) {
  const stage = row.stage ? Number(row.stage) : null;
  return {
    id: row.uid,
    source: row.source,
    createdAt: row.created_at,
    user: row.user_id ? { id: row.user_id, name: row.user_name, role: row.user_role } : null,
    module: row.module,
    action: row.action,
    summary: row.summary,
    recordType: row.record_type,
    recordId: row.record_id,
    recordLabel: row.record_label,
    stage: stage ? { no: stage, label: STAGE_LABELS[stage] || `Stage ${stage}` } : null,
    oldValues: parseJson(row.old_values),
    newValues: parseJson(row.new_values),
    ip: row.ip_address,
  };
}

export async function listAuditLogs(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(filters.pageSize, 10) || 25));
  const { where, params } = buildWhere(filters);

  const [[rows], [[count]]] = await Promise.all([
    pool.query(
      `SELECT * FROM (${UNIFIED_SOURCE}) x ${where}
        ORDER BY x.created_at DESC, x.source, x.sort_id DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM (${UNIFIED_SOURCE}) x ${where}`, params),
  ]);

  return { entries: rows.map(toEntry), page, pageSize, total: Number(count.total) };
}

export async function exportAuditLogs(filters = {}) {
  const { where, params } = buildWhere(filters);
  const [rows] = await pool.query(
    `SELECT * FROM (${UNIFIED_SOURCE}) x ${where}
      ORDER BY x.created_at DESC, x.source, x.sort_id DESC
      LIMIT ?`,
    [...params, MAX_EXPORT_ROWS]
  );
  return rows.map(toEntry);
}

/** Users, modules and actions that appear in the log, for the filter dropdowns. */
export async function getFilterOptions() {
  const [[users], [actions]] = await Promise.all([
    pool.query(
      `SELECT u.id, u.name, r.code AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        ORDER BY u.name`
    ),
    pool.query(
      `SELECT x.module, x.action, COUNT(*) AS total
         FROM (${UNIFIED_SOURCE}) x
        GROUP BY x.module, x.action
        ORDER BY x.module, x.action`
    ),
  ]);

  const modules = [...new Set(actions.map((a) => a.module))];
  return {
    users,
    modules,
    actions: actions.map((a) => ({ module: a.module, action: a.action, total: Number(a.total) })),
  };
}
