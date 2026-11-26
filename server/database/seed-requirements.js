/**
 * Sample requirements for development and demos (Requirements module).
 *
 *   node database/seed-requirements.js        (run from the server folder)
 *
 * Creates 10 requirements spread across all 8 stages, going through the same
 * service functions the app uses, so every stage table and the history are filled
 * exactly as real use would fill them. Timestamps are then spread over the last
 * few days so the timeline looks realistic.
 *
 * Safe to run again: it does nothing if the demo requirements already exist
 * (they are marked with a sales order reference starting with "DEMO-").
 */
import { pool } from '../src/config/db.js';
import * as service from '../src/modules/requirements/requirements.service.js';

// Location ids: 1 Chennai, 2 Bengaluru, 3 Hosur, 4 Coimbatore, 5 Madurai, 6 Kochi,
// 7 Hyderabad, 8 Visakhapatnam, 9 Mumbai, 10 Pune
// Vehicle type ids: 1 LCV 14 ft, 2 Truck 17 ft, 3 Truck 19 ft, 4 32 ft SA, 5 32 ft MA
// Transporter ids: 1 Sri Murugan, 2 Annai, 3 Vel Freight, 4 Kaveri, 5 Deccan, 6 Western Ghats

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * `upTo` = how far to take it: 1 created, 2 enquiry, 3 quotations, 4 rate approved,
 * 5 booked, 6 trip (with `milestones`), 7 delivered, 8 paid and closed.
 * `ageHours` = how long ago it was created; `stepHours` = gap between stages.
 */
const DEMO = [
  {
    so: 'DEMO-1001', from: 1, to: 5, material: 'Electrical panels', qty: 3, vehicle: 1, loading: 3,
    upTo: 1, ageHours: 3, stepHours: 1,
  },
  {
    so: 'DEMO-1002', from: 3, to: 7, material: 'Auto components', qty: 14, vehicle: 4, loading: 2,
    enquiry: [2, 4, 5], upTo: 2, ageHours: 20, stepHours: 2,
  },
  {
    so: 'DEMO-1003', from: 9, to: 10, material: 'Steel coils', qty: 18, vehicle: 5, loading: 1,
    enquiry: [6, 1, 2], quotes: { 6: 9800, 1: 11200 }, upTo: 3, ageHours: 30, stepHours: 4,
  },
  {
    so: 'DEMO-1004', from: 2, to: 1, material: 'Packaged FMCG goods', qty: 8, vehicle: 3, loading: 1,
    enquiry: [4, 2, 1], quotes: { 4: 23500, 2: 24100, 1: 23900 },
    approve: { t: 4, rate: 22900, note: 'Matched last rate on this route' }, upTo: 4, ageHours: 40, stepHours: 5,
  },
  {
    so: 'DEMO-1005', from: 4, to: 2, material: 'Textile rolls', qty: 6, vehicle: 2, loading: 0,
    enquiry: [3, 4], quotes: { 3: 16800, 4: 17500 }, approve: { t: 3, rate: 16200, note: 'Negotiated from ₹16,800' },
    booking: { vehicleNo: 'TN 38 BK 2290', driverName: 'Karthik R', driverMobile: '9787012345', reporting: '08:00' },
    upTo: 5, ageHours: 50, stepHours: 6,
  },
  {
    so: 'DEMO-1006', from: 7, to: 8, material: 'Pharma cartons', qty: 7, vehicle: 2, loading: -1,
    enquiry: [5, 6], quotes: { 5: 31500, 6: 34000 }, approve: { t: 5, rate: 30800, note: '' },
    booking: { vehicleNo: 'TS 09 UB 6618', driverName: 'Ramesh Yadav', driverMobile: '9849023311', reporting: '06:30' },
    milestones: [['loaded', ''], ['departed', 'Left Hyderabad at 9 am']], upTo: 6, ageHours: 60, stepHours: 6,
  },
  {
    so: 'DEMO-1007', from: 10, to: 9, material: 'Machinery parts', qty: 12, vehicle: 4, loading: -2,
    enquiry: [6, 1], quotes: { 6: 10500, 1: 12000 }, approve: { t: 6, rate: 10200, note: 'Regular route rate' },
    booking: { vehicleNo: 'MH 12 QW 4410', driverName: 'Sunil Jadhav', driverMobile: '9822045671', reporting: '07:00' },
    milestones: [['loaded', ''], ['departed', ''], ['reached', 'Waited 2 hours at gate'], ['unloaded', '']],
    upTo: 7, ageHours: 80, stepHours: 8,
  },
  {
    so: 'DEMO-1008', from: 1, to: 6, material: 'Tyres', qty: 9, vehicle: 3, loading: -3,
    enquiry: [1, 2, 3], quotes: { 1: 38500, 2: 37200, 3: 39900 }, approve: { t: 2, rate: 36800, note: 'Negotiated from ₹37,200' },
    booking: { vehicleNo: 'TN 29 AZ 7812', driverName: 'Senthil M', driverMobile: '9443056789', reporting: '05:30' },
    milestones: [['loaded', ''], ['departed', ''], ['reached', ''], ['unloaded', '']],
    delivery: { pod: 'POD-90215', damage: 0, note: '' }, upTo: 7, ageHours: 100, stepHours: 9,
  },
  {
    so: 'DEMO-1009', from: 5, to: 1, material: 'Rice bags', qty: 15, vehicle: 4, loading: -5,
    enquiry: [1, 2], quotes: { 1: 27800, 2: 28400 }, approve: { t: 1, rate: 27000, note: 'Negotiated from ₹27,800' },
    booking: { vehicleNo: 'TN 59 CC 1204', driverName: 'Pandian S', driverMobile: '9600112233', reporting: '06:00' },
    milestones: [['loaded', ''], ['departed', ''], ['reached', ''], ['unloaded', '']],
    delivery: { pod: 'POD-90188', damage: 0, note: '' }, payment: 'ICIC0R52026112001', upTo: 8, ageHours: 140, stepHours: 12,
  },
  {
    so: 'DEMO-1010', from: 6, to: 4, material: 'Spices', qty: 4, vehicle: 1, loading: -6,
    enquiry: [3, 1], quotes: { 3: 12900, 1: 13600 }, approve: { t: 3, rate: 12500, note: '' },
    booking: { vehicleNo: 'KL 07 BT 3345', driverName: 'Anil Joseph', driverMobile: '9446078901', reporting: '07:30' },
    milestones: [['loaded', ''], ['departed', ''], ['reached', ''], ['unloaded', 'Three bags torn']],
    delivery: { pod: 'POD-90140', damage: 750, note: 'Three bags torn, 18 kg spilled' },
    payment: 'SBIN0R52026111902', upTo: 8, ageHours: 160, stepHours: 14,
  },
];

/** Spread one requirement's timestamps: created `ageHours` ago, `stepHours` between events. */
async function spreadTimes(conn, requirementId, ageHours, stepHours) {
  const [history] = await conn.query('SELECT id, action FROM requirement_history WHERE requirement_id = ? ORDER BY id', [requirementId]);
  for (const [i, h] of history.entries()) {
    const hoursAgo = Math.max(ageHours - i * stepHours, 0.25);
    await conn.query('UPDATE requirement_history SET created_at = UTC_TIMESTAMP() - INTERVAL ? MINUTE WHERE id = ?', [
      Math.round(hoursAgo * 60),
      h.id,
    ]);
  }

  // Copy each event's time onto the stage tables so every timestamp agrees with the history.
  const at = (action) => `(SELECT created_at FROM requirement_history WHERE requirement_id = ? AND action = '${action}' LIMIT 1)`;
  const updates = [
    [`UPDATE requirements SET created_at = ${at('created')} WHERE id = ?`, 'created'],
    [`UPDATE requirement_enquiry_recipients SET sent_at = ${at('enquiry_sent')} WHERE requirement_id = ?`, 'enquiry_sent'],
    [`UPDATE requirement_quotations SET received_at = ${at('quotations_recorded')} WHERE requirement_id = ?`, 'quotations_recorded'],
    [`UPDATE requirement_rate_approvals SET approved_at = ${at('rate_approved')} WHERE requirement_id = ?`, 'rate_approved'],
    [`UPDATE requirement_bookings SET booked_at = ${at('vehicle_booked')} WHERE requirement_id = ?`, 'vehicle_booked'],
    [`UPDATE requirement_deliveries SET verified_at = ${at('pod_verified')} WHERE requirement_id = ?`, 'pod_verified'],
    [`UPDATE requirement_payments SET paid_at = ${at('paid_closed')} WHERE requirement_id = ?`, 'paid_closed'],
  ];
  for (const [sql, action] of updates) {
    if (history.some((h) => h.action === action)) await conn.query(sql, [requirementId, requirementId]);
  }
  for (const m of ['loaded', 'departed', 'reached', 'unloaded']) {
    if (history.some((h) => h.action === `milestone_${m}`)) {
      await conn.query(
        `UPDATE requirement_milestones SET occurred_at = ${at(`milestone_${m}`)} WHERE requirement_id = ? AND milestone = ?`,
        [requirementId, requirementId, m]
      );
    }
  }
}

async function run() {
  const [[existing]] = await pool.query("SELECT COUNT(*) AS n FROM requirements WHERE sales_order_ref LIKE 'DEMO-%'");
  if (existing.n > 0) {
    console.log(`[seed-requirements] ${existing.n} demo requirements already exist - nothing to do.`);
    return;
  }

  const [[admin]] = await pool.query(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'admin' ORDER BY u.id LIMIT 1"
  );
  if (!admin) throw new Error('No admin user found. Run "npm run db:seed" first.');
  const uid = admin.id;

  for (const d of DEMO) {
    let r = await service.createRequirement(
      {
        salesOrderRef: d.so,
        fromLocationId: d.from,
        toLocationId: d.to,
        material: d.material,
        quantityTonnes: d.qty,
        vehicleTypeId: d.vehicle,
        loadingDate: day(d.loading),
        deliveryDate: null,
      },
      uid
    );
    const ref = r.requirementNo;

    if (d.upTo >= 2) r = await service.sendEnquiry(ref, { transporterIds: d.enquiry }, uid);
    if (d.upTo >= 3) {
      const quotes = Object.entries(d.quotes).map(([t, amount]) => ({ transporterId: Number(t), amount }));
      r = await service.recordQuotations(ref, { quotes }, uid);
    }
    if (d.upTo >= 4) r = await service.approveRate(ref, { transporterId: d.approve.t, approvedRate: d.approve.rate, note: d.approve.note || null }, uid);
    if (d.upTo >= 5) {
      const b = d.booking;
      r = await service.bookVehicle(
        ref,
        { vehicleNo: b.vehicleNo, driverName: b.driverName, driverMobile: b.driverMobile, expectedReportingAt: `${day(d.loading)} ${b.reporting}:00` },
        uid
      );
    }
    for (const [milestone, note] of d.milestones || []) {
      r = await service.recordMilestone(ref, { milestone, note: note || null }, uid);
    }
    if (d.delivery) r = await service.recordDelivery(ref, { podNumber: d.delivery.pod, damageAmount: d.delivery.damage, damageNote: d.delivery.note || null }, uid);
    if (d.payment) r = await service.recordPayment(ref, { amount: r.settlement.payable, utr: d.payment }, uid);

    const conn = await pool.getConnection();
    try {
      await spreadTimes(conn, r.id, d.ageHours, d.stepHours);
    } finally {
      conn.release();
    }

    console.log(`[seed-requirements] ${ref}  ${r.from.name} -> ${r.to.name}  stage ${r.currentStage}  ${r.status}`);
  }
  console.log(`[seed-requirements] Done. ${DEMO.length} demo requirements created.`);
}

run()
  .catch((error) => {
    console.error(`\n[seed-requirements] Failed: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
