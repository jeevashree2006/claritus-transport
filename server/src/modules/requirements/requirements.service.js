/**
 * Requirements data access. All SQL uses ? placeholders.
 * Every stage action runs in a transaction, locks the requirement row, checks the
 * requirement is at the expected stage, saves the stage data, moves the stage on
 * and writes a history entry.
 */
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { STAGE, STAGE_CLOSED, STAGES } from './requirements.stages.js';

export const MILESTONES = Object.freeze([
  { key: 'loaded', label: 'Loaded' },
  { key: 'departed', label: 'Departed' },
  { key: 'reached', label: 'Reached destination' },
  { key: 'unloaded', label: 'Unloaded' },
]);

/* ---------------------------------------------------------------- helpers */

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (v) => (v === null || v === undefined ? null : Number(v));
const stageLabel = (no) => STAGES.find((s) => s.no === no)?.label || (no >= STAGE_CLOSED ? 'Closed' : `stage ${no}`);

/**
 * Road distance estimate from coordinates (great-circle x 1.22 road factor).
 * Placeholder until a routing service is chosen (FRD FR-TR-011, TBC).
 */
function estimateKm(a, b) {
  const rad = (x) => (Number(x) * Math.PI) / 180;
  const dLat = rad(b.latitude) - rad(a.latitude);
  const dLng = rad(b.longitude) - rad(a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.22);
}

async function findActiveLocations(conn, ids) {
  const [rows] = await conn.query(
    'SELECT id, name, latitude, longitude FROM locations WHERE id IN (?) AND is_active = 1',
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

const refWhere = (ref) => {
  const byNo = /^REQ-\d+$/i.test(String(ref));
  return { sql: byNo ? 'r.requirement_no = ?' : 'r.id = ?', param: byNo ? String(ref).toUpperCase() : Number(ref) };
};

async function addHistory(conn, requirementId, stage, action, message, userId) {
  await conn.query(
    'INSERT INTO requirement_history (requirement_id, stage, action, message, created_by) VALUES (?, ?, ?, ?, ?)',
    [requirementId, stage, action, message, userId]
  );
}

async function setStage(conn, requirementId, stage, status = 'open') {
  await conn.query('UPDATE requirements SET current_stage = ?, status = ? WHERE id = ?', [stage, status, requirementId]);
}

/** Runs one stage action safely; returns the refreshed requirement. */
async function runStage(ref, expectedStage, work) {
  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    const where = refWhere(ref);
    const [rows] = await conn.query(
      `SELECT r.id, r.requirement_no, r.current_stage, r.status, r.from_location_id, r.to_location_id
         FROM requirements r WHERE ${where.sql} FOR UPDATE`,
      [where.param]
    );
    const req = rows[0];
    if (!req) throw new AppError('Requirement not found.', 404);
    if (req.status !== 'open') throw new AppError('This requirement is already closed.', 409);
    if (req.current_stage !== expectedStage) {
      throw new AppError(
        `This requirement is at ${stageLabel(req.current_stage)}, not ${stageLabel(expectedStage)}. Reload the page.`,
        409
      );
    }
    id = req.id;
    await work(conn, req);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  return getRequirement(id);
}

/* ---------------------------------------------------------------- shapes */

const LIST_COLUMNS = `
  r.id, r.requirement_no, r.sales_order_ref,
  r.from_location_id, fl.name AS from_name,
  r.to_location_id,   tl.name AS to_name,
  r.distance_km, r.material, r.quantity_tonnes,
  r.vehicle_type_id, vt.name AS vehicle_name, vt.capacity_tonnes AS vehicle_capacity,
  DATE_FORMAT(r.loading_date, '%Y-%m-%d')  AS loading_date,
  DATE_FORMAT(r.delivery_date, '%Y-%m-%d') AS delivery_date,
  r.current_stage, r.status, r.created_at, r.updated_at,
  cu.name AS created_by_name, co.name AS coordinator_name
`;

const LIST_JOINS = `
  FROM requirements r
  JOIN locations fl     ON fl.id = r.from_location_id
  JOIN locations tl     ON tl.id = r.to_location_id
  JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
  JOIN users cu         ON cu.id = r.created_by
  LEFT JOIN users co    ON co.id = r.coordinator_id
`;

function toRequirement(row) {
  return {
    id: row.id,
    requirementNo: row.requirement_no,
    salesOrderRef: row.sales_order_ref,
    from: { id: row.from_location_id, name: row.from_name },
    to: { id: row.to_location_id, name: row.to_name },
    distanceKm: row.distance_km,
    material: row.material,
    quantityTonnes: Number(row.quantity_tonnes),
    vehicleType: { id: row.vehicle_type_id, name: row.vehicle_name, capacityTonnes: Number(row.vehicle_capacity) },
    loadingDate: row.loading_date,
    deliveryDate: row.delivery_date,
    currentStage: row.current_stage,
    status: row.status,
    createdBy: row.created_by_name,
    coordinator: row.coordinator_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUpdate: row.last_message ? { message: row.last_message, at: row.last_at } : null,
  };
}

/* ---------------------------------------------------------------- lookups */

export async function getLookups() {
  const [locations] = await pool.query('SELECT id, name, state FROM locations WHERE is_active = 1 ORDER BY name');
  const [vehicleTypes] = await pool.query(
    'SELECT id, name, capacity_tonnes AS capacityTonnes FROM vehicle_types WHERE is_active = 1 ORDER BY sort_order, name'
  );
  const [transporters] = await pool.query(
    'SELECT id, name, city, contact_person AS contactPerson, whatsapp FROM transporters WHERE is_active = 1 ORDER BY name'
  );
  return {
    locations,
    vehicleTypes: vehicleTypes.map((v) => ({ ...v, capacityTonnes: Number(v.capacityTonnes) })),
    transporters,
  };
}

export async function getDistance(fromId, toId) {
  const found = await findActiveLocations(pool, [fromId, toId]);
  const from = found.get(fromId);
  const to = found.get(toId);
  if (!from || !to) throw new AppError('Choose a valid loading location and destination.', 400);
  return { fromId, toId, distanceKm: estimateKm(from, to), method: 'estimate' };
}

/* ---------------------------------------------------------------- queries */

export async function listRequirements({ status = 'open' } = {}) {
  const where = status === 'open' ? "WHERE r.status = 'open'" : status === 'closed' ? "WHERE r.status <> 'open'" : '';

  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS},
            (SELECT h.message    FROM requirement_history h WHERE h.requirement_id = r.id ORDER BY h.created_at DESC, h.id DESC LIMIT 1) AS last_message,
            (SELECT h.created_at FROM requirement_history h WHERE h.requirement_id = r.id ORDER BY h.created_at DESC, h.id DESC LIMIT 1) AS last_at
     ${LIST_JOINS}
     ${where}
     ORDER BY r.created_at DESC, r.id DESC`
  );

  const [countRows] = await pool.query(
    "SELECT SUM(status = 'open') AS open, SUM(status <> 'open') AS closed, COUNT(*) AS total FROM requirements"
  );
  const c = countRows[0];

  return {
    items: rows.map(toRequirement),
    counts: { open: Number(c.open || 0), closed: Number(c.closed || 0), all: Number(c.total || 0) },
  };
}

/** Full requirement with every stage's data. `ref` is REQ-0001 or the numeric id. */
export async function getRequirement(ref) {
  const where = refWhere(ref);
  const [rows] = await pool.query(`SELECT ${LIST_COLUMNS} ${LIST_JOINS} WHERE ${where.sql} LIMIT 1`, [where.param]);
  if (!rows[0]) throw new AppError('Requirement not found.', 404);
  const base = toRequirement(rows[0]);
  const id = base.id;

  const [
    [history],
    [recipients],
    [quotes],
    [approvals],
    [bookings],
    [milestoneRows],
    [deliveries],
    [payments],
    [lastRates],
  ] = await Promise.all([
    pool.query(
      `SELECT h.id, h.stage, h.action, h.message, h.created_at AS createdAt, u.name AS createdBy
         FROM requirement_history h LEFT JOIN users u ON u.id = h.created_by
        WHERE h.requirement_id = ? ORDER BY h.created_at DESC, h.id DESC`,
      [id]
    ),
    pool.query(
      `SELECT e.transporter_id AS id, t.name, t.city, t.whatsapp, e.sent_at AS sentAt, u.name AS sentBy
         FROM requirement_enquiry_recipients e
         JOIN transporters t ON t.id = e.transporter_id
         JOIN users u ON u.id = e.sent_by
        WHERE e.requirement_id = ? ORDER BY t.name`,
      [id]
    ),
    pool.query(
      `SELECT q.transporter_id AS transporterId, t.name AS transporterName, q.amount, q.received_at AS receivedAt
         FROM requirement_quotations q JOIN transporters t ON t.id = q.transporter_id
        WHERE q.requirement_id = ? ORDER BY q.amount, t.name`,
      [id]
    ),
    pool.query(
      `SELECT a.transporter_id AS transporterId, t.name AS transporterName, a.quoted_amount AS quotedAmount,
              a.approved_rate AS approvedRate, a.note, u.name AS approvedBy, a.approved_at AS approvedAt
         FROM requirement_rate_approvals a
         JOIN transporters t ON t.id = a.transporter_id
         JOIN users u ON u.id = a.approved_by
        WHERE a.requirement_id = ?`,
      [id]
    ),
    pool.query(
      `SELECT b.transporter_id AS transporterId, t.name AS transporterName, b.vehicle_no AS vehicleNo,
              b.driver_name AS driverName, b.driver_mobile AS driverMobile,
              DATE_FORMAT(b.expected_reporting_at, '%Y-%m-%dT%H:%i') AS expectedReportingAt,
              u.name AS bookedBy, b.booked_at AS bookedAt
         FROM requirement_bookings b
         JOIN transporters t ON t.id = b.transporter_id
         JOIN users u ON u.id = b.booked_by
        WHERE b.requirement_id = ?`,
      [id]
    ),
    pool.query(
      `SELECT m.milestone, m.note, m.occurred_at AS at, u.name AS recordedBy
         FROM requirement_milestones m JOIN users u ON u.id = m.recorded_by
        WHERE m.requirement_id = ?`,
      [id]
    ),
    pool.query(
      `SELECT d.pod_number AS podNumber, d.damage_amount AS damageAmount, d.damage_note AS damageNote,
              u.name AS verifiedBy, d.verified_at AS verifiedAt
         FROM requirement_deliveries d JOIN users u ON u.id = d.verified_by
        WHERE d.requirement_id = ?`,
      [id]
    ),
    pool.query(
      `SELECT p.id, p.payment_type AS type, p.amount, p.utr, u.name AS recordedBy, p.paid_at AS paidAt
         FROM requirement_payments p JOIN users u ON u.id = p.recorded_by
        WHERE p.requirement_id = ? ORDER BY p.paid_at, p.id`,
      [id]
    ),
    // Last approved rate on the same route (either direction), excluding this requirement
    pool.query(
      `SELECT a.approved_rate AS rate, r2.requirement_no AS requirementNo, a.approved_at AS at, t.name AS transporterName
         FROM requirement_rate_approvals a
         JOIN requirements r2 ON r2.id = a.requirement_id
         JOIN transporters t ON t.id = a.transporter_id
        WHERE r2.id <> ?
          AND ((r2.from_location_id = ? AND r2.to_location_id = ?) OR (r2.from_location_id = ? AND r2.to_location_id = ?))
        ORDER BY a.approved_at DESC LIMIT 1`,
      [id, base.from.id, base.to.id, base.to.id, base.from.id]
    ),
  ]);

  const approval = approvals[0]
    ? { ...approvals[0], quotedAmount: num(approvals[0].quotedAmount), approvedRate: num(approvals[0].approvedRate) }
    : null;
  const delivery = deliveries[0] ? { ...deliveries[0], damageAmount: num(deliveries[0].damageAmount) } : null;
  const paymentList = payments.map((p) => ({ ...p, amount: num(p.amount) }));

  // Settlement is plain software arithmetic (BR rule 9): payable = rate - approved damage.
  const approvedRate = approval?.approvedRate || 0;
  const deduction = delivery?.damageAmount || 0;
  const payable = Math.max(approvedRate - deduction, 0);
  const paid = paymentList.reduce((sum, p) => sum + p.amount, 0);

  const milestones = Object.fromEntries(milestoneRows.map((m) => [m.milestone, { at: m.at, note: m.note, recordedBy: m.recordedBy }]));

  return {
    ...base,
    history,
    enquiry: recipients.length
      ? { sentAt: recipients[0].sentAt, sentBy: recipients[0].sentBy, transporters: recipients.map(({ id: tid, name, city, whatsapp }) => ({ id: tid, name, city, whatsapp })) }
      : null,
    quotations: quotes.map((q) => ({ ...q, amount: num(q.amount) })),
    rateApproval: approval,
    booking: bookings[0] || null,
    milestones,
    nextMilestone: MILESTONES.find((m) => !milestones[m.key])?.key || null,
    delivery,
    payments: paymentList,
    settlement: approval ? { approvedRate, deduction, payable, paid, balance: Math.max(payable - paid, 0) } : null,
    lastApprovedRate: lastRates[0] ? { ...lastRates[0], rate: num(lastRates[0].rate) } : null,
  };
}

/* ---------------------------------------------------------------- stage 1: create */

export async function createRequirement(input, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const locations = await findActiveLocations(conn, [input.fromLocationId, input.toLocationId]);
    const from = locations.get(input.fromLocationId);
    const to = locations.get(input.toLocationId);
    if (!from || !to) throw new AppError('Choose a valid loading location and destination.', 400);

    const [vt] = await conn.query('SELECT id FROM vehicle_types WHERE id = ? AND is_active = 1', [input.vehicleTypeId]);
    if (!vt[0]) throw new AppError('Choose a valid vehicle type.', 400);

    const distanceKm = estimateKm(from, to);

    const [result] = await conn.query(
      `INSERT INTO requirements
         (sales_order_ref, from_location_id, to_location_id, distance_km, material, quantity_tonnes,
          vehicle_type_id, loading_date, delivery_date, current_stage, status, coordinator_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        input.salesOrderRef,
        input.fromLocationId,
        input.toLocationId,
        distanceKm,
        input.material,
        input.quantityTonnes,
        input.vehicleTypeId,
        input.loadingDate,
        input.deliveryDate,
        STAGE.ENQUIRY,
        userId,
        userId,
      ]
    );

    const requirementNo = `REQ-${String(result.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE requirements SET requirement_no = ? WHERE id = ?', [requirementNo, result.insertId]);
    await addHistory(conn, result.insertId, STAGE.REQUIREMENT, 'created', `Requirement created: ${from.name} to ${to.name}, ${distanceKm} km`, userId);

    await conn.commit();
    return getRequirement(result.insertId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/* ---------------------------------------------------------------- stage 2: enquiry */

export function sendEnquiry(ref, { transporterIds }, userId) {
  return runStage(ref, STAGE.ENQUIRY, async (conn, req) => {
    const [found] = await conn.query('SELECT id FROM transporters WHERE id IN (?) AND is_active = 1', [transporterIds]);
    if (found.length !== transporterIds.length) throw new AppError('One of the chosen transporters is not available.', 400);

    await conn.query(
      'INSERT INTO requirement_enquiry_recipients (requirement_id, transporter_id, sent_by) VALUES ?',
      [transporterIds.map((tid) => [req.id, tid, userId])]
    );
    await setStage(conn, req.id, STAGE.QUOTATIONS);
    const n = transporterIds.length;
    await addHistory(conn, req.id, STAGE.ENQUIRY, 'enquiry_sent', `Enquiry sent to ${n} transporter${n > 1 ? 's' : ''}`, userId);
  });
}

/* ---------------------------------------------------------------- stage 3: quotations */

export function recordQuotations(ref, { quotes }, userId) {
  return runStage(ref, STAGE.QUOTATIONS, async (conn, req) => {
    const [asked] = await conn.query(
      `SELECT e.transporter_id AS id, t.name FROM requirement_enquiry_recipients e
         JOIN transporters t ON t.id = e.transporter_id WHERE e.requirement_id = ?`,
      [req.id]
    );
    const askedIds = new Set(asked.map((a) => a.id));
    if (quotes.some((q) => !askedIds.has(q.transporterId))) {
      throw new AppError('Quotes can only be recorded for transporters who were sent the enquiry.', 400);
    }

    await conn.query(
      'INSERT INTO requirement_quotations (requirement_id, transporter_id, amount, recorded_by) VALUES ?',
      [quotes.map((q) => [req.id, q.transporterId, q.amount, userId])]
    );
    await setStage(conn, req.id, STAGE.RATE_APPROVAL);

    const quotedIds = new Set(quotes.map((q) => q.transporterId));
    const noReply = asked.filter((a) => !quotedIds.has(a.id)).map((a) => a.name);
    const n = quotes.length;
    await addHistory(
      conn,
      req.id,
      STAGE.QUOTATIONS,
      'quotations_recorded',
      `${n} quotation${n > 1 ? 's' : ''} recorded${noReply.length ? `. No reply from ${noReply.join(', ')}` : ''}`,
      userId
    );
  });
}

/* ---------------------------------------------------------------- stage 4: rate approval */

export function approveRate(ref, { transporterId, approvedRate, note }, userId) {
  return runStage(ref, STAGE.RATE_APPROVAL, async (conn, req) => {
    // The system never picks a quote itself; the user's choice must be one of the quotes.
    const [quote] = await conn.query(
      `SELECT q.amount, t.name FROM requirement_quotations q JOIN transporters t ON t.id = q.transporter_id
        WHERE q.requirement_id = ? AND q.transporter_id = ?`,
      [req.id, transporterId]
    );
    if (!quote[0]) throw new AppError('Choose a transporter who sent a quotation.', 400);

    await conn.query(
      `INSERT INTO requirement_rate_approvals (requirement_id, transporter_id, quoted_amount, approved_rate, note, approved_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.id, transporterId, quote[0].amount, approvedRate, note, userId]
    );
    await setStage(conn, req.id, STAGE.BOOKING);
    const negotiated = Number(quote[0].amount) !== approvedRate ? ` (quoted ${money(quote[0].amount)})` : '';
    await addHistory(conn, req.id, STAGE.RATE_APPROVAL, 'rate_approved', `Rate ${money(approvedRate)} approved for ${quote[0].name}${negotiated}`, userId);
  });
}

/* ---------------------------------------------------------------- stage 5: booking */

export function bookVehicle(ref, input, userId) {
  return runStage(ref, STAGE.BOOKING, async (conn, req) => {
    const [approval] = await conn.query('SELECT transporter_id FROM requirement_rate_approvals WHERE requirement_id = ?', [req.id]);
    if (!approval[0]) throw new AppError('A rate must be approved before booking.', 409);

    await conn.query(
      `INSERT INTO requirement_bookings
         (requirement_id, transporter_id, vehicle_no, driver_name, driver_mobile, expected_reporting_at, booked_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.id, approval[0].transporter_id, input.vehicleNo, input.driverName, input.driverMobile, input.expectedReportingAt, userId]
    );
    await setStage(conn, req.id, STAGE.TRIP_FOLLOWUP);
    await addHistory(conn, req.id, STAGE.BOOKING, 'vehicle_booked', `Vehicle ${input.vehicleNo} booked, driver ${input.driverName}`, userId);
  });
}

/* ---------------------------------------------------------------- stage 6: trip follow-up */

export function recordMilestone(ref, { milestone, note }, userId) {
  return runStage(ref, STAGE.TRIP_FOLLOWUP, async (conn, req) => {
    const [done] = await conn.query('SELECT milestone FROM requirement_milestones WHERE requirement_id = ?', [req.id]);
    const doneKeys = new Set(done.map((d) => d.milestone));
    const next = MILESTONES.find((m) => !doneKeys.has(m.key));
    if (!next) throw new AppError('All milestones are already recorded.', 409);
    if (next.key !== milestone) throw new AppError(`Milestones go in order. Mark "${next.label}" first.`, 409);

    await conn.query(
      'INSERT INTO requirement_milestones (requirement_id, milestone, note, recorded_by) VALUES (?, ?, ?, ?)',
      [req.id, milestone, note, userId]
    );
    await addHistory(conn, req.id, STAGE.TRIP_FOLLOWUP, `milestone_${milestone}`, note ? `${next.label}: ${note}` : next.label, userId);
    if (milestone === 'unloaded') await setStage(conn, req.id, STAGE.DELIVERY);
  });
}

/* ---------------------------------------------------------------- stage 7: delivery */

export function recordDelivery(ref, { podNumber, damageAmount, damageNote }, userId) {
  return runStage(ref, STAGE.DELIVERY, async (conn, req) => {
    const [approval] = await conn.query('SELECT approved_rate FROM requirement_rate_approvals WHERE requirement_id = ?', [req.id]);
    if (damageAmount >= Number(approval[0].approved_rate)) {
      throw new AppError('Damage can’t be equal to or more than the freight amount.', 400, {
        errors: { damageAmount: 'Must be less than the approved rate' },
      });
    }

    await conn.query(
      'INSERT INTO requirement_deliveries (requirement_id, pod_number, damage_amount, damage_note, verified_by) VALUES (?, ?, ?, ?, ?)',
      [req.id, podNumber, damageAmount, damageNote, userId]
    );
    await setStage(conn, req.id, STAGE.PAYMENT);
    await addHistory(
      conn,
      req.id,
      STAGE.DELIVERY,
      'pod_verified',
      `POD ${podNumber} verified${damageAmount ? `. Damage ${money(damageAmount)} recorded` : ''}`,
      userId
    );
  });
}

/* ---------------------------------------------------------------- stage 8: payment */

export function recordPayment(ref, { amount, utr }, userId) {
  return runStage(ref, STAGE.PAYMENT, async (conn, req) => {
    const [[approval]] = await conn.query('SELECT approved_rate FROM requirement_rate_approvals WHERE requirement_id = ?', [req.id]);
    const [[delivery]] = await conn.query('SELECT damage_amount FROM requirement_deliveries WHERE requirement_id = ?', [req.id]);
    const payable = Number(approval.approved_rate) - Number(delivery?.damage_amount || 0);

    if (Math.abs(amount - payable) > 0.001) {
      throw new AppError(`The amount paid must equal the payable amount, ${money(payable)}.`, 400, {
        errors: { amount: `Must be ${money(payable)}` },
      });
    }

    try {
      await conn.query(
        "INSERT INTO requirement_payments (requirement_id, payment_type, amount, utr, recorded_by) VALUES (?, 'final', ?, ?, ?)",
        [req.id, amount, utr, userId]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('This UTR is already recorded against another payment.', 409, { errors: { utr: 'UTR already used' } });
      }
      throw error;
    }

    await setStage(conn, req.id, STAGE_CLOSED, 'closed');
    await addHistory(conn, req.id, STAGE.PAYMENT, 'paid_closed', `Paid ${money(amount)} (UTR ${utr}). Trip closed.`, userId);
  });
}
