/**
 * Success rate: how the transport flow and the transporters are performing, worked out
 * only from real records (FRD FR-TR-009 / AC-22: figures from trip records only, no AI
 * score, no automatic ranking or rejection).
 *
 * Read only. Sources:
 *   requirements, requirement_enquiry_recipients, requirement_quotations,
 *   requirement_rate_approvals, requirement_bookings, requirement_milestones,
 *   requirement_deliveries, requirement_payments   (Requirements module)
 *   transporters                                   (Transporters module)
 *   app_settings via getSetting / getSection       (Settings module)
 *
 * Every figure is limited to requirements created in the chosen period.
 */
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { PERIODS, lateShiftMinutes, periodRange } from '../../utils/period.js';
import { STAGES } from '../requirements/requirements.stages.js';
import { getSetting } from '../settings/settings.service.js';

const round1 = (n) => Math.round(n * 10) / 10;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null);
const toCode = (id) => `TR${String(id).padStart(4, '0')}`;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Participation label shown next to each transporter. It describes reply behaviour in
 * the period only; it is not a reliability score and never blocks a transporter.
 */
function participation(row) {
  if (!row.isActive) return { key: 'deactivated', label: 'Deactivated' };
  if (row.enquiries === 0) return { key: 'not_asked', label: 'Not asked yet' };
  if (row.quotes === 0) return { key: 'no_replies', label: 'No replies' };
  if (row.replyRate >= 75) return { key: 'active', label: 'Active' };
  return { key: 'occasional', label: 'Occasional' };
}

export async function getReport({ period } = {}) {
  const [timeZone, fyStart, defaultPeriod, delayMinutes] = await Promise.all([
    getSetting('general.timeZone'),
    getSetting('reports.financialYearStartMonth'),
    getSetting('reports.defaultPeriod'),
    getSetting('trips.delayThresholdMinutes'),
  ]);

  const chosen = period || defaultPeriod;
  const periodDef = PERIODS.find((p) => p.value === chosen);
  if (!periodDef) throw new AppError('Choose one of the listed periods.', 400);
  const { from } = periodRange(chosen, { timeZone, fyStartMonth: Number(fyStart) });
  // Expected reporting time is stored as local wall-clock time; shift it to UTC and add the threshold.
  const lateShift = lateShiftMinutes(delayMinutes, timeZone);

  // Requirements in the period (a derived table every query joins against).
  const inPeriod = from
    ? { sql: 'SELECT id FROM requirements WHERE created_at >= ?', params: [from] }
    : { sql: 'SELECT id FROM requirements', params: [] };

  const [[totals]] = await pool.query(
    `SELECT COUNT(*)                                     AS requirements,
            SUM(r.status = 'open')                       AS open,
            SUM(r.status = 'closed')                     AS closed,
            SUM(r.status = 'cancelled')                  AS cancelled
       FROM requirements r
      WHERE r.id IN (${inPeriod.sql})`,
    inPeriod.params,
  );

  // Furthest stage reached per requirement (current_stage is the next stage waiting;
  // 9 = closed after payment), for the conversion funnel.
  const [stageRows] = await pool.query(
    `SELECT r.current_stage AS stage, r.status, COUNT(*) AS n
       FROM requirements r
      WHERE r.id IN (${inPeriod.sql})
      GROUP BY r.current_stage, r.status`,
    inPeriod.params,
  );

  // Per transporter: enquiries, replies, reply time, trips won, late reporting, damage.
  const [transporterRows] = await pool.query(
    `SELECT t.id, t.name, t.city, t.is_active,
            COALESCE(e.enquiries, 0)       AS enquiries,
            COALESCE(e.quotes, 0)          AS quotes,
            e.avg_reply_minutes            AS avgReplyMinutes,
            COALESCE(w.won, 0)             AS tripsWon,
            COALESCE(w.routes, 0)          AS routesServed,
            COALESCE(b.booked, 0)          AS booked,
            COALESCE(b.late, 0)            AS late,
            COALESCE(d.delivered, 0)       AS delivered,
            COALESCE(d.damage_claims, 0)   AS damageClaims
       FROM transporters t
       LEFT JOIN (
         SELECT er.transporter_id,
                COUNT(*)                                                  AS enquiries,
                COUNT(q.id)                                               AS quotes,
                AVG(CASE WHEN q.id IS NOT NULL
                         THEN GREATEST(TIMESTAMPDIFF(MINUTE, er.sent_at, q.received_at), 0) END) AS avg_reply_minutes
           FROM requirement_enquiry_recipients er
           LEFT JOIN requirement_quotations q
                  ON q.requirement_id = er.requirement_id AND q.transporter_id = er.transporter_id
          WHERE er.requirement_id IN (${inPeriod.sql})
          GROUP BY er.transporter_id
       ) e ON e.transporter_id = t.id
       LEFT JOIN (
         SELECT a.transporter_id, COUNT(*) AS won,
                COUNT(DISTINCT CONCAT(r.from_location_id, '-', r.to_location_id)) AS routes
           FROM requirement_rate_approvals a
           JOIN requirements r ON r.id = a.requirement_id AND r.status <> 'cancelled'
          WHERE a.requirement_id IN (${inPeriod.sql})
          GROUP BY a.transporter_id
       ) w ON w.transporter_id = t.id
       LEFT JOIN (
         SELECT bk.transporter_id,
                COUNT(*) AS booked,
                SUM(bk.expected_reporting_at IS NOT NULL AND (
                      (m.id IS NOT NULL AND m.occurred_at > bk.expected_reporting_at + INTERVAL ? MINUTE)
                   OR (m.id IS NULL AND UTC_TIMESTAMP() > bk.expected_reporting_at + INTERVAL ? MINUTE)
                )) AS late
           FROM requirement_bookings bk
           JOIN requirements r ON r.id = bk.requirement_id AND r.status <> 'cancelled'
           LEFT JOIN requirement_milestones m ON m.requirement_id = bk.requirement_id AND m.milestone = 'loaded'
          WHERE bk.requirement_id IN (${inPeriod.sql})
          GROUP BY bk.transporter_id
       ) b ON b.transporter_id = t.id
       LEFT JOIN (
         SELECT bk.transporter_id, COUNT(*) AS delivered, SUM(dl.damage_amount > 0) AS damage_claims
           FROM requirement_deliveries dl
           JOIN requirement_bookings bk ON bk.requirement_id = dl.requirement_id
          WHERE dl.requirement_id IN (${inPeriod.sql})
          GROUP BY bk.transporter_id
       ) d ON d.transporter_id = t.id
      ORDER BY enquiries DESC, quotes DESC, t.name`,
    [...inPeriod.params, ...inPeriod.params, lateShift, lateShift, ...inPeriod.params, ...inPeriod.params],
  );

  const transporters = transporterRows.map((r) => {
    const row = {
      id: r.id,
      code: toCode(r.id),
      name: r.name,
      city: r.city,
      isActive: Boolean(r.is_active),
      enquiries: Number(r.enquiries),
      quotes: Number(r.quotes),
      awaitingReply: Number(r.enquiries) - Number(r.quotes),
      replyRate: pct(Number(r.quotes), Number(r.enquiries)),
      avgReplyHours: r.avgReplyMinutes === null ? null : round1(Number(r.avgReplyMinutes) / 60),
      avgReplyMinutes: r.avgReplyMinutes === null ? null : Number(r.avgReplyMinutes),
      tripsWon: Number(r.tripsWon),
      routesServed: Number(r.routesServed),
      booked: Number(r.booked),
      lateReporting: Number(r.late),
      delivered: Number(r.delivered),
      damageClaims: Number(r.damageClaims),
    };
    return { ...row, participation: participation(row) };
  });

  // ---- Headline figures --------------------------------------------------
  const sum = (key) => transporters.reduce((s, t) => s + t[key], 0);
  const enquiries = sum('enquiries');
  const quotes = sum('quotes');
  const booked = sum('booked');
  const late = sum('lateReporting');
  const activeTransporters = transporters.filter((t) => t.isActive);
  const quotingTransporters = activeTransporters.filter((t) => t.quotes > 0).length;
  // Average over all replies (each transporter's average weighted by its number of replies).
  const avgReplyHours = quotes
    ? round1(transporters.reduce((s, t) => s + (t.avgReplyMinutes ?? 0) * t.quotes, 0) / quotes / 60)
    : null;

  // ---- Conversion funnel: requirements that reached each stage -----------
  const requirements = Number(totals.requirements || 0);
  const reached = (stageNo) =>
    stageRows.reduce((s, r) => {
      // current_stage = next stage waiting, so a stage is done when current_stage > its number.
      const done = Number(r.stage) > stageNo;
      return s + (done ? Number(r.n) : 0);
    }, 0);
  const funnel = STAGES.map((stage) => {
    const count = stage.no === 1 ? requirements : reached(stage.no);
    return { no: stage.no, key: stage.key, label: stage.label, count, rate: pct(count, requirements) };
  });

  return {
    period: { value: chosen, label: periodDef.label, from, timeZone },
    periodOptions: PERIODS,
    lateAfterMinutes: delayMinutes,
    totals: {
      requirements,
      open: Number(totals.open || 0),
      closed: Number(totals.closed || 0),
      cancelled: Number(totals.cancelled || 0),
      enquiries,
      quotes,
      replyRate: pct(quotes, enquiries),
      avgReplyHours,
      transportersQuoting: quotingTransporters,
      transportersActive: activeTransporters.length,
      booked,
      onTimeReporting: pct(booked - late, booked),
      lateReporting: late,
    },
    funnel,
    transporters,
  };
}
