/**
 * Dashboard: live figures for the transport flow, worked out from real records only.
 *
 * Read only. Sources:
 *   requirements, requirement_rate_approvals, requirement_bookings, requirement_milestones,
 *   requirement_deliveries, requirement_payments, locations, vehicle_types   (Requirements module)
 *   transporters                                                              (Transporters module)
 *   app_settings via getSetting                                               (Settings module)
 *
 * Period figures (cards, trip status, stages, recent list) cover requirements created in the
 * chosen period. Alerts are about what needs attention now, so they cover every open requirement.
 *
 * Trip state of a booked, non-cancelled requirement:
 *   delivered   unloaded (stage 7 or later, or closed)
 *   in transit  loaded but not yet unloaded
 *   delayed     not loaded, and the expected reporting time + late threshold has passed
 *   awaiting    booked, not loaded, still within time
 */
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { PERIODS, lateShiftMinutes, periodRange } from '../../utils/period.js';
import { STAGES, STAGE_CLOSED } from '../requirements/requirements.stages.js';
import { getSetting } from '../settings/settings.service.js';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const stageLabel = (no) => STAGES.find((s) => s.no === no)?.label || '';

/** Percentages that add up to exactly 100 (largest remainder), for the donut. */
function percentages(counts) {
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((s, v) => s + v, 0);
  raw
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (left > 0 && counts[i] > 0) {
        floors[i] += 1;
        left -= 1;
      }
    });
  return floors;
}

function tripState(r) {
  if (!r.booked || r.status === 'cancelled') return null;
  if (r.status === 'closed' || r.stage >= 7) return 'delivered';
  if (r.loaded) return 'in_transit';
  if (r.overdue) return 'delayed';
  return 'awaiting';
}

/** Same wording and colours as the Requirements list (client config/stages.js stageBadge). */
function stageBadge(r) {
  if (r.status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (r.status === 'closed' || r.stage >= STAGE_CLOSED) return { label: 'Closed', tone: 'success' };
  return { label: stageLabel(r.stage) || 'Unknown', tone: r.stage >= 5 ? 'info' : 'warning' };
}

export async function getDashboard({ period } = {}) {
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
  const lateShift = lateShiftMinutes(delayMinutes, timeZone);

  // One row per requirement: period rows for the figures, open rows for the alerts.
  const [rows] = await pool.query(
    `SELECT r.id, r.requirement_no AS requirementNo, r.status, r.current_stage AS stage, r.created_at AS createdAt,
            lf.name AS fromName, lt.name AS toName, vt.name AS vehicleType,
            COALESCE(tb.name, ta.name)                AS transporterName,
            b.vehicle_no                              AS vehicleNo,
            (b.requirement_id IS NOT NULL)            AS booked,
            (ml.id IS NOT NULL)                       AS loaded,
            (b.expected_reporting_at IS NOT NULL AND ml.id IS NULL
              AND UTC_TIMESTAMP() > b.expected_reporting_at + INTERVAL ? MINUTE) AS overdue,
            a.approved_rate                           AS approvedRate,
            d.damage_amount                           AS damageAmount
       FROM requirements r
       JOIN locations lf     ON lf.id = r.from_location_id
       JOIN locations lt     ON lt.id = r.to_location_id
       JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
       LEFT JOIN requirement_rate_approvals a ON a.requirement_id = r.id
       LEFT JOIN transporters ta              ON ta.id = a.transporter_id
       LEFT JOIN requirement_bookings b       ON b.requirement_id = r.id
       LEFT JOIN transporters tb              ON tb.id = b.transporter_id
       LEFT JOIN requirement_milestones ml    ON ml.requirement_id = r.id AND ml.milestone = 'loaded'
       LEFT JOIN requirement_deliveries d     ON d.requirement_id = r.id
      WHERE r.status = 'open' OR ${from ? 'r.created_at >= ?' : '1 = 1'}
      ORDER BY r.created_at DESC, r.id DESC`,
    from ? [lateShift, from] : [lateShift]
  );

  const all = rows.map((r) => ({
    ...r,
    booked: Boolean(r.booked),
    loaded: Boolean(r.loaded),
    overdue: Boolean(r.overdue),
    inPeriod: !from || new Date(r.createdAt) >= from,
  }));
  const inPeriod = all.filter((r) => r.inPeriod);
  const open = all.filter((r) => r.status === 'open');

  // ---- Cards -----------------------------------------------------------------
  const states = { delivered: 0, in_transit: 0, delayed: 0, awaiting: 0 };
  for (const r of inPeriod) {
    const s = tripState(r);
    if (s) states[s] += 1;
  }
  const trips = Object.values(states).reduce((s, n) => s + n, 0);

  const kpis = {
    requirements: inPeriod.length,
    inTransit: states.in_transit,
    delivered: states.delivered,
    delayed: states.delayed,
    closed: inPeriod.filter((r) => r.status === 'closed').length,
  };

  // ---- Trip status donut -------------------------------------------------------
  const segmentDefs = [
    { key: 'delivered', label: 'Delivered', tone: 'success' },
    { key: 'in_transit', label: 'In transit', tone: 'warning' },
    { key: 'awaiting', label: 'Awaiting vehicle', tone: 'info' },
    { key: 'delayed', label: 'Delayed', tone: 'danger' },
  ];
  const pcts = percentages(segmentDefs.map((s) => states[s.key]));
  const tripStatus = {
    total: trips,
    segments: segmentDefs.map((s, i) => ({ ...s, count: states[s.key], percent: pcts[i] })),
  };

  // ---- Requirements by stage (where each period requirement is now) -------------
  const byStage = STAGES.filter((s) => s.no >= 2).map((s) => ({
    no: s.no,
    stage: s.label,
    count: inPeriod.filter((r) => r.status === 'open' && r.stage === s.no).length,
  }));
  byStage.push({ no: '✓', stage: 'Closed', count: kpis.closed });

  // ---- Recent requirements ------------------------------------------------------
  const recentRequirements = inPeriod.slice(0, 6).map((r) => {
    const badge = stageBadge(r);
    return {
      id: r.requirementNo,
      route: `${r.fromName} → ${r.toName}`,
      transporter: r.transporterName || '–',
      vehicle: r.vehicleNo || r.vehicleType,
      stage: badge.label,
      stageTone: badge.tone,
    };
  });

  // ---- Alerts: what needs attention now (every open requirement) -----------------
  const [[bank]] = await pool.query("SELECT COUNT(*) AS n FROM transporters WHERE bank_status = 'pending'");
  const atStage = (no) => open.filter((r) => r.stage === no);
  const overdue = open.filter((r) => tripState(r) === 'delayed');
  const awaitingPayment = atStage(8);
  const payable = awaitingPayment.reduce((s, r) => s + Number(r.approvedRate || 0) - Number(r.damageAmount || 0), 0);

  const alerts = [
    overdue.length && {
      id: 'delayed',
      tone: 'danger',
      title: `${plural(overdue.length, 'vehicle', 'vehicles')} not reported on time`,
      detail: `Not loaded more than ${delayMinutes} minutes after the expected reporting time`,
      to: '/requirements',
    },
    atStage(7).length && {
      id: 'pod',
      tone: 'warning',
      title: `${plural(atStage(7).length, 'trip', 'trips')} waiting for POD`,
      detail: 'Unloaded – delivery proof not verified yet',
      to: '/requirements',
    },
    atStage(4).length && {
      id: 'rates',
      tone: 'info',
      title: `${plural(atStage(4).length, 'rate', 'rates')} waiting for approval`,
      detail: 'Quotations received – final rate not approved yet',
      to: '/requirements',
    },
    awaitingPayment.length && {
      id: 'payments',
      tone: 'info',
      title: `${plural(awaitingPayment.length, 'payment', 'payments')} due`,
      detail: `POD verified – ${money(round2(payable))} to pay in total`,
      to: '/requirements',
    },
    atStage(3).length && {
      id: 'quotes',
      tone: 'info',
      title: `${plural(atStage(3).length, 'enquiry', 'enquiries')} waiting for quotations`,
      detail: 'Sent to transporters – no quotation recorded yet',
      to: '/requirements',
    },
    Number(bank.n) && {
      id: 'bank',
      tone: 'warning',
      title: `${plural(Number(bank.n), 'transporter', 'transporters')} with bank details to approve`,
      detail: 'Needs a second person’s approval before payments can use them',
      to: '/transporters',
    },
  ].filter(Boolean);

  return {
    period: { value: chosen, label: periodDef.label, from },
    periodOptions: PERIODS,
    lateAfterMinutes: delayMinutes,
    generatedAt: new Date(),
    kpis,
    tripStatus,
    requirementsByStage: byStage,
    recentRequirements,
    alerts,
  };
}
