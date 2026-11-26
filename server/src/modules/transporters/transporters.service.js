/**
 * Transporters data access. All SQL uses ? placeholders.
 *
 * Uses the shared `transporters` table (created in 011, extended in 020) and READS the
 * Requirements module's tables for each transporter's history and balance. It never
 * writes to Requirements tables.
 *
 * Bank details (FRD FR-TR-003, FR-TR-007): new or changed details are saved as
 * pending_* values with bank_status = 'pending'. They only replace the live columns
 * (which payments use) after a different user approves them (FR-CM-005).
 *
 * Money is calculated here by fixed rules, never estimated (FR-TR-101, FR-TR-102):
 *   payable per trip = approved rate - damage deduction recorded at delivery
 *   balance          = payable - payments made
 */
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { diffValues, maskAccount as maskForAudit, recordAudit } from '../audit-logs/audit-logs.service.js';

/* ---------------------------------------------------------------- audit log (FR-CM-004) */

/** Fields written to the audit log. Account numbers are masked (last 4 digits only). */
function auditContact(row) {
  return {
    name: row.name,
    contactPerson: row.contact_person,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    city: row.city,
    address: row.address,
    regularRoutes: row.regular_routes,
  };
}

function auditBank(holder, bankName, accountNumber, ifsc) {
  return { accountHolder: holder ?? null, bankName: bankName ?? null, accountNumber: maskForAudit(accountNumber), ifsc: ifsc ?? null };
}

function auditTransporter(req, conn, id, name, action, summary, oldValues, newValues) {
  return recordAudit({
    req, conn, module: 'transporters', action, summary,
    recordType: 'transporters', recordId: toCode(id), recordLabel: name, oldValues, newValues,
  });
}

/* ---------------------------------------------------------------- helpers */

const num = (v) => (v === null || v === undefined ? null : Number(v));
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

/** 7 -> 'TR0007'. The code is derived from the id, so it never needs its own column. */
export const toCode = (id) => `TR${String(id).padStart(4, '0')}`;

/** Accepts 'TR0007', 'tr7' or '7'. Returns the numeric id or null. */
export function parseRef(ref) {
  const match = /^(?:TR)?0*(\d+)$/i.exec(String(ref || '').trim());
  const id = match ? Number(match[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** 'XXXX1234' style mask for an account number shown in lists. */
const maskAccount = (acc) => (acc ? `•••• ${String(acc).slice(-4)}` : null);

const STAGE_LABELS = {
  2: 'Enquiry',
  3: 'Quotations',
  4: 'Rate approval',
  5: 'Booking',
  6: 'Trip follow-up',
  7: 'Delivery',
  8: 'Payment',
  9: 'Closed',
};

/** Per-transporter trip money, from bookings (one row per booked requirement). */
const MONEY_SQL = `
  SELECT b.transporter_id                          AS transporterId,
         COUNT(*)                                  AS trips,
         SUM(r.status = 'open')                    AS openTrips,
         SUM(a.approved_rate)                      AS agreed,
         SUM(COALESCE(d.damage_amount, 0))         AS deductions,
         SUM(COALESCE(p.paid, 0))                  AS paid
    FROM requirement_bookings b
    JOIN requirements r               ON r.id = b.requirement_id AND r.status <> 'cancelled'
    JOIN requirement_rate_approvals a ON a.requirement_id = b.requirement_id
    LEFT JOIN requirement_deliveries d ON d.requirement_id = b.requirement_id
    LEFT JOIN (SELECT requirement_id, SUM(amount) AS paid FROM requirement_payments GROUP BY requirement_id) p
           ON p.requirement_id = b.requirement_id`;

function moneySummary(row) {
  const agreed = round2(row?.agreed);
  const deductions = round2(row?.deductions);
  const paid = round2(row?.paid);
  const payable = round2(agreed - deductions);
  return {
    trips: Number(row?.trips || 0),
    openTrips: Number(row?.openTrips || 0),
    agreed,
    deductions,
    payable,
    paid,
    balance: round2(payable - paid),
  };
}

function mapListRow(row, money) {
  return {
    id: row.id,
    code: toCode(row.id),
    name: row.name,
    contactPerson: row.contact_person,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    city: row.city,
    isActive: Boolean(row.is_active),
    bankStatus: row.bank_status,
    hasBankDetails: Boolean(row.account_number),
    trips: money.trips,
    balance: money.balance,
  };
}

/** Bank block: live (approved) details plus any change waiting for approval. */
function mapBank(row) {
  const live = row.account_number
    ? { accountHolder: row.account_holder, bankName: row.bank_name, accountNumber: row.account_number, ifsc: row.ifsc }
    : null;
  const pending =
    row.bank_status === 'pending' || row.bank_status === 'rejected'
      ? {
          accountHolder: row.pending_account_holder,
          bankName: row.pending_bank_name,
          accountNumber: row.pending_account_number,
          ifsc: row.pending_ifsc,
        }
      : null;
  return {
    status: row.bank_status,
    live,
    liveMasked: maskAccount(row.account_number),
    pending,
    requestedBy: row.bank_requested_by ? { id: row.bank_requested_by, name: row.requested_by_name } : null,
    requestedAt: row.bank_requested_at,
    reviewedBy: row.bank_reviewed_by ? { id: row.bank_reviewed_by, name: row.reviewed_by_name } : null,
    reviewedAt: row.bank_reviewed_at,
    reviewNote: row.bank_review_note,
  };
}

const sameBank = (a, b) =>
  Boolean(a && b) &&
  a.accountHolder === b.accountHolder &&
  a.bankName === b.bankName &&
  a.accountNumber === b.accountNumber &&
  a.ifsc === b.ifsc;

/** Turns a duplicate-name insert/update into a field error the form can show. */
function rethrowDuplicate(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new AppError('A transporter with this company name already exists.', 409, {
      errors: { name: 'This company name is already in the list' },
    });
  }
  throw error;
}

async function lockTransporter(conn, id) {
  const [[row]] = await conn.query('SELECT * FROM transporters WHERE id = ? FOR UPDATE', [id]);
  if (!row) throw new AppError('Transporter not found.', 404);
  return row;
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

/* ---------------------------------------------------------------- list */

/**
 * @param {{ search?: string, status?: 'active'|'inactive'|'all', bank?: 'pending'|'' }} filters
 * @returns {{ items, counts: { active, inactive, all, bankPending } }}
 */
export async function listTransporters({ search = '', status = 'all', bank = '' } = {}) {
  const where = [];
  const params = [];

  if (status === 'active') where.push('t.is_active = 1');
  if (status === 'inactive') where.push('t.is_active = 0');
  if (bank === 'pending') where.push("t.bank_status = 'pending'");

  const term = search.trim();
  if (term) {
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = term.replace(/\D/g, '');
    const codeId = /^tr\d+$/i.test(term) ? parseRef(term) : null;
    const parts = ['t.name LIKE ?', 't.city LIKE ?', 't.contact_person LIKE ?'];
    params.push(like, like, like);
    if (digits.length >= 3) {
      parts.push('t.mobile LIKE ?', 't.whatsapp LIKE ?');
      params.push(`%${digits}%`, `%${digits}%`);
    }
    if (codeId) {
      parts.push('t.id = ?');
      params.push(codeId);
    }
    where.push(`(${parts.join(' OR ')})`);
  }

  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.contact_person, t.mobile, t.whatsapp, t.city, t.is_active,
            t.bank_status, t.account_number
       FROM transporters t
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.id`,
    params
  );

  const [moneyRows] = await pool.query(`${MONEY_SQL} GROUP BY b.transporter_id`);
  const moneyById = new Map(moneyRows.map((m) => [m.transporterId, moneySummary(m)]));

  const [[counts]] = await pool.query(
    `SELECT COUNT(*) AS allCount, SUM(is_active = 1) AS active, SUM(is_active = 0) AS inactive,
            SUM(bank_status = 'pending') AS bankPending
       FROM transporters`
  );

  return {
    items: rows.map((r) => mapListRow(r, moneyById.get(r.id) || moneySummary(null))),
    counts: {
      all: Number(counts.allCount || 0),
      active: Number(counts.active || 0),
      inactive: Number(counts.inactive || 0),
      bankPending: Number(counts.bankPending || 0),
    },
  };
}

/* ---------------------------------------------------------------- detail */

/** Full transporter profile with history, balance and performance (FR-TR-006, FR-TR-009). */
export async function getTransporter(ref) {
  const id = parseRef(ref);
  if (!id) throw new AppError('Transporter not found.', 404);

  const [[row]] = await pool.query(
    `SELECT t.*, rq.name AS requested_by_name, rv.name AS reviewed_by_name, cb.name AS created_by_name
       FROM transporters t
       LEFT JOIN users rq ON rq.id = t.bank_requested_by
       LEFT JOIN users rv ON rv.id = t.bank_reviewed_by
       LEFT JOIN users cb ON cb.id = t.created_by
      WHERE t.id = ?`,
    [id]
  );
  if (!row) throw new AppError('Transporter not found.', 404);

  const [[moneyRow], [trips], [quotations], [rates], [payments], [[enquiryStats]]] = await Promise.all([
    pool.query(`${MONEY_SQL} WHERE b.transporter_id = ? GROUP BY b.transporter_id`, [id]),
    pool.query(
      `SELECT r.id AS requirementId, r.requirement_no AS requirementNo, r.status, r.current_stage AS stage,
              lf.name AS fromName, lt.name AS toName, r.distance_km AS distanceKm, r.material,
              b.vehicle_no AS vehicleNo, b.driver_name AS driverName, b.booked_at AS bookedAt,
              b.expected_reporting_at AS expectedReportingAt,
              a.approved_rate AS agreed, COALESCE(d.damage_amount, 0) AS deduction, d.damage_note AS deductionNote,
              d.pod_number AS podNumber, COALESCE(p.paid, 0) AS paid,
              (SELECT m.milestone FROM requirement_milestones m WHERE m.requirement_id = r.id
                ORDER BY m.occurred_at DESC, m.id DESC LIMIT 1) AS lastMilestone
         FROM requirement_bookings b
         JOIN requirements r               ON r.id = b.requirement_id
         JOIN locations lf                 ON lf.id = r.from_location_id
         JOIN locations lt                 ON lt.id = r.to_location_id
         JOIN requirement_rate_approvals a ON a.requirement_id = b.requirement_id
         LEFT JOIN requirement_deliveries d ON d.requirement_id = b.requirement_id
         LEFT JOIN (SELECT requirement_id, SUM(amount) AS paid FROM requirement_payments GROUP BY requirement_id) p
                ON p.requirement_id = b.requirement_id
        WHERE b.transporter_id = ?
        ORDER BY b.booked_at DESC, r.id DESC`,
      [id]
    ),
    pool.query(
      `SELECT q.id, r.requirement_no AS requirementNo, lf.name AS fromName, lt.name AS toName,
              vt.name AS vehicleType, q.amount, q.received_at AS receivedAt,
              (a.transporter_id = q.transporter_id) AS selected
         FROM requirement_quotations q
         JOIN requirements r   ON r.id = q.requirement_id
         JOIN locations lf     ON lf.id = r.from_location_id
         JOIN locations lt     ON lt.id = r.to_location_id
         JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
         LEFT JOIN requirement_rate_approvals a ON a.requirement_id = q.requirement_id
        WHERE q.transporter_id = ?
        ORDER BY q.received_at DESC, q.id DESC`,
      [id]
    ),
    pool.query(
      `SELECT r.requirement_no AS requirementNo, lf.name AS fromName, lt.name AS toName,
              vt.name AS vehicleType, a.quoted_amount AS quoted, a.approved_rate AS approved,
              a.note, u.name AS approvedBy, a.approved_at AS approvedAt
         FROM requirement_rate_approvals a
         JOIN requirements r   ON r.id = a.requirement_id
         JOIN locations lf     ON lf.id = r.from_location_id
         JOIN locations lt     ON lt.id = r.to_location_id
         JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
         LEFT JOIN users u     ON u.id = a.approved_by
        WHERE a.transporter_id = ?
        ORDER BY a.approved_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT p.id, r.requirement_no AS requirementNo, p.payment_type AS type, p.amount, p.utr,
              p.paid_at AS paidAt, u.name AS recordedBy
         FROM requirement_payments p
         JOIN requirement_bookings b ON b.requirement_id = p.requirement_id
         JOIN requirements r         ON r.id = p.requirement_id
         LEFT JOIN users u           ON u.id = p.recorded_by
        WHERE b.transporter_id = ?
        ORDER BY p.paid_at DESC, p.id DESC`,
      [id]
    ),
    pool.query(
      `SELECT COUNT(*) AS enquiries,
              SUM(EXISTS (SELECT 1 FROM requirement_quotations q
                           WHERE q.requirement_id = e.requirement_id AND q.transporter_id = e.transporter_id)) AS replied,
              SUM(NOT EXISTS (SELECT 1 FROM requirement_quotations q
                               WHERE q.requirement_id = e.requirement_id AND q.transporter_id = e.transporter_id)
                  AND r.current_stage = 3 AND r.status = 'open') AS awaitingReply
         FROM requirement_enquiry_recipients e
         JOIN requirements r ON r.id = e.requirement_id
        WHERE e.transporter_id = ?`,
      [id]
    ),
  ]);

  const tripItems = trips.map((t) => {
    const agreed = round2(t.agreed);
    const deduction = round2(t.deduction);
    const paid = round2(t.paid);
    return {
      requirementNo: t.requirementNo,
      route: { from: t.fromName, to: t.toName },
      distanceKm: num(t.distanceKm),
      material: t.material,
      vehicleNo: t.vehicleNo,
      driverName: t.driverName,
      bookedAt: t.bookedAt,
      status: t.status,
      stageLabel: t.status === 'cancelled' ? 'Cancelled' : STAGE_LABELS[t.stage] || '',
      lastMilestone: t.lastMilestone,
      podNumber: t.podNumber,
      agreed,
      deduction,
      deductionNote: t.deductionNote,
      paid,
      balance: t.status === 'cancelled' ? 0 : round2(agreed - deduction - paid),
    };
  });

  // Performance view: real trip records only. No score, no ranking (FR-TR-009, AC-22).
  const routeMap = new Map();
  for (const t of tripItems) {
    if (t.status === 'cancelled') continue;
    const key = `${t.route.from} → ${t.route.to}`;
    const r = routeMap.get(key) || { route: key, trips: 0, totalRate: 0, lastRate: null, lastAt: null };
    r.trips += 1;
    r.totalRate += t.agreed;
    if (!r.lastAt || new Date(t.bookedAt) > new Date(r.lastAt)) {
      r.lastAt = t.bookedAt;
      r.lastRate = t.agreed;
    }
    routeMap.set(key, r);
  }
  const routesServed = [...routeMap.values()]
    .map((r) => ({ route: r.route, trips: r.trips, averageRate: round2(r.totalRate / r.trips), lastRate: r.lastRate }))
    .sort((a, b) => b.trips - a.trips || a.route.localeCompare(b.route));

  const damageTrips = tripItems.filter((t) => t.deduction > 0);

  return {
    id: row.id,
    code: toCode(row.id),
    name: row.name,
    contactPerson: row.contact_person,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    city: row.city,
    address: row.address,
    regularRoutes: row.regular_routes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    createdBy: row.created_by_name || null,
    updatedAt: row.updated_at,
    bank: mapBank(row),
    summary: moneySummary(moneyRow[0]),
    performance: {
      routesServed,
      enquiriesReceived: Number(enquiryStats?.enquiries || 0),
      quotationsGiven: Number(enquiryStats?.replied || 0),
      awaitingReply: Number(enquiryStats?.awaitingReply || 0),
      tripsWon: tripItems.filter((t) => t.status !== 'cancelled').length,
      damageClaims: damageTrips.length,
      damageAmount: round2(damageTrips.reduce((s, t) => s + t.deduction, 0)),
    },
    trips: tripItems,
    quotations: quotations.map((q) => ({
      id: q.id,
      requirementNo: q.requirementNo,
      route: { from: q.fromName, to: q.toName },
      vehicleType: q.vehicleType,
      amount: round2(q.amount),
      receivedAt: q.receivedAt,
      selected: Boolean(q.selected),
    })),
    rates: rates.map((r) => ({
      requirementNo: r.requirementNo,
      route: { from: r.fromName, to: r.toName },
      vehicleType: r.vehicleType,
      quoted: round2(r.quoted),
      approved: round2(r.approved),
      note: r.note,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      requirementNo: p.requirementNo,
      type: p.type,
      amount: round2(p.amount),
      utr: p.utr,
      paidAt: p.paidAt,
      recordedBy: p.recordedBy,
    })),
  };
}

/* ---------------------------------------------------------------- create / update */

/**
 * @param input  { name, contactPerson, mobile, whatsapp, city, address, regularRoutes, bank: {...} | null }
 */
export async function createTransporter(input, userId, req = null) {
  try {
    const [result] = await pool.query(
      `INSERT INTO transporters
         (name, contact_person, mobile, whatsapp, city, address, regular_routes,
          bank_status, pending_account_holder, pending_bank_name, pending_account_number, pending_ifsc,
          bank_requested_by, bank_requested_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.contactPerson,
        input.mobile,
        input.whatsapp,
        input.city,
        input.address,
        input.regularRoutes,
        input.bank ? 'pending' : 'none',
        input.bank?.accountHolder ?? null,
        input.bank?.bankName ?? null,
        input.bank?.accountNumber ?? null,
        input.bank?.ifsc ?? null,
        input.bank ? userId : null,
        input.bank ? new Date() : null,
        userId,
      ]
    );
    await auditTransporter(req, null, result.insertId, input.name, 'created', `Added transporter ${input.name}`, null, {
      ...auditContact({
        name: input.name, contact_person: input.contactPerson, mobile: input.mobile, whatsapp: input.whatsapp,
        city: input.city, address: input.address, regular_routes: input.regularRoutes,
      }),
      ...(input.bank
        ? { pendingBank: auditBank(input.bank.accountHolder, input.bank.bankName, input.bank.accountNumber, input.bank.ifsc) }
        : {}),
    });
    return getTransporter(result.insertId);
  } catch (error) {
    return rethrowDuplicate(error);
  }
}

/**
 * Updates contact details. Bank details are only re-submitted for approval when they
 * differ from both the live and the pending values; empty bank fields mean "no change".
 * Returns { transporter, bankChangeRequested }.
 */
export async function updateTransporter(ref, input, userId, req = null) {
  const id = parseRef(ref);
  if (!id) throw new AppError('Transporter not found.', 404);

  let bankChangeRequested = false;
  try {
    await inTransaction(async (conn) => {
      const row = await lockTransporter(conn, id);

      await conn.query(
        `UPDATE transporters
            SET name = ?, contact_person = ?, mobile = ?, whatsapp = ?, city = ?, address = ?, regular_routes = ?
          WHERE id = ?`,
        [input.name, input.contactPerson, input.mobile, input.whatsapp, input.city, input.address, input.regularRoutes, id]
      );

      if (input.bank) {
        const { live, pending, status } = mapBank(row);
        const unchanged = (status === 'approved' && sameBank(input.bank, live)) || (status === 'pending' && sameBank(input.bank, pending));
        if (!unchanged) {
          await conn.query(
            `UPDATE transporters
                SET bank_status = 'pending', pending_account_holder = ?, pending_bank_name = ?,
                    pending_account_number = ?, pending_ifsc = ?, bank_requested_by = ?, bank_requested_at = ?,
                    bank_reviewed_by = NULL, bank_reviewed_at = NULL, bank_review_note = NULL
              WHERE id = ?`,
            [input.bank.accountHolder, input.bank.bankName, input.bank.accountNumber, input.bank.ifsc, userId, new Date(), id]
          );
          bankChangeRequested = true;
        }
      }

      const after = { ...row, name: input.name, contact_person: input.contactPerson, mobile: input.mobile,
        whatsapp: input.whatsapp, city: input.city, address: input.address, regular_routes: input.regularRoutes };
      const contact = diffValues(auditContact(row), auditContact(after));
      if (contact.changed) {
        await auditTransporter(req, conn, id, input.name, 'updated', `Edited transporter ${input.name}`,
          contact.oldValues, contact.newValues);
      }
      if (bankChangeRequested) {
        const pendingBefore = row.bank_status === 'pending'
          ? auditBank(row.pending_account_holder, row.pending_bank_name, row.pending_account_number, row.pending_ifsc)
          : null;
        await auditTransporter(req, conn, id, input.name, 'bank_requested',
          `Submitted bank details of ${input.name} for approval`,
          { bankStatus: row.bank_status, liveBank: auditBank(row.account_holder, row.bank_name, row.account_number, row.ifsc), pendingBank: pendingBefore },
          { bankStatus: 'pending', pendingBank: auditBank(input.bank.accountHolder, input.bank.bankName, input.bank.accountNumber, input.bank.ifsc) });
      }
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
  return { transporter: await getTransporter(id), bankChangeRequested };
}

/* ---------------------------------------------------------------- status */

/** Deactivate / reactivate (FR-TR-001). Deactivated transporters keep their history. */
export async function setActive(ref, isActive, req = null) {
  const id = parseRef(ref);
  if (!id) throw new AppError('Transporter not found.', 404);
  const [[before]] = await pool.query('SELECT name, is_active FROM transporters WHERE id = ?', [id]);
  const [result] = await pool.query('UPDATE transporters SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  if (result.affectedRows === 0) throw new AppError('Transporter not found.', 404);
  if (before && Boolean(before.is_active) !== Boolean(isActive)) {
    await auditTransporter(req, null, id, before.name, isActive ? 'activated' : 'deactivated',
      `${isActive ? 'Reactivated' : 'Deactivated'} transporter ${before.name}`,
      { isActive: Boolean(before.is_active) }, { isActive: Boolean(isActive) });
  }
  return getTransporter(id);
}

/* ---------------------------------------------------------------- bank approval */

/** Approves the pending bank details. The person who entered them cannot approve (FR-CM-005). */
export async function approveBank(ref, userId, req = null) {
  const id = parseRef(ref);
  if (!id) throw new AppError('Transporter not found.', 404);
  await inTransaction(async (conn) => {
    const row = await lockTransporter(conn, id);
    if (row.bank_status !== 'pending') throw new AppError('There are no bank details waiting for approval.', 409);
    if (row.bank_requested_by === userId) {
      throw new AppError('You entered these bank details, so someone else has to approve them.', 403);
    }
    await conn.query(
      `UPDATE transporters
          SET account_holder = pending_account_holder, bank_name = pending_bank_name,
              account_number = pending_account_number, ifsc = pending_ifsc,
              pending_account_holder = NULL, pending_bank_name = NULL, pending_account_number = NULL, pending_ifsc = NULL,
              bank_status = 'approved', bank_reviewed_by = ?, bank_reviewed_at = ?, bank_review_note = NULL
        WHERE id = ?`,
      [userId, new Date(), id]
    );
    await auditTransporter(req, conn, id, row.name, 'bank_approved', `Approved bank details of ${row.name}`,
      { bankStatus: 'pending', liveBank: auditBank(row.account_holder, row.bank_name, row.account_number, row.ifsc) },
      { bankStatus: 'approved', liveBank: auditBank(row.pending_account_holder, row.pending_bank_name, row.pending_account_number, row.pending_ifsc) });
  });
  return getTransporter(id);
}

/** Rejects the pending bank details with a reason. The live details (if any) stay in use. */
export async function rejectBank(ref, note, userId, req = null) {
  const id = parseRef(ref);
  if (!id) throw new AppError('Transporter not found.', 404);
  await inTransaction(async (conn) => {
    const row = await lockTransporter(conn, id);
    if (row.bank_status !== 'pending') throw new AppError('There are no bank details waiting for approval.', 409);
    if (row.bank_requested_by === userId) {
      throw new AppError('You entered these bank details, so someone else has to review them.', 403);
    }
    await conn.query(
      `UPDATE transporters
          SET bank_status = 'rejected', bank_reviewed_by = ?, bank_reviewed_at = ?, bank_review_note = ?
        WHERE id = ?`,
      [userId, new Date(), note, id]
    );
    await auditTransporter(req, conn, id, row.name, 'bank_rejected', `Rejected bank details of ${row.name}`,
      { bankStatus: 'pending', pendingBank: auditBank(row.pending_account_holder, row.pending_bank_name, row.pending_account_number, row.pending_ifsc) },
      { bankStatus: 'rejected', reason: note });
  });
  return getTransporter(id);
}
