/**
 * One line per completed stage: what was decided and by whom.
 */
import { MILESTONES } from '../config/stages';
import { formatMoney } from '../utils/format';
import './DoneSoFar.css';

export default function DoneSoFar({ requirement: r }) {
  const rows = [];
  if (r.enquiry) rows.push(['Enquiry', `Sent to ${r.enquiry.transporters.length}: ${r.enquiry.transporters.map((t) => t.name).join(', ')}`]);
  if (r.quotations.length) rows.push(['Quotations', `${r.quotations.length} received, lowest ${formatMoney(r.quotations[0].amount)}`]);
  if (r.rateApproval) {
    const a = r.rateApproval;
    rows.push(['Rate approved', `${a.transporterName}, ${formatMoney(a.approvedRate)}${a.approvedRate !== a.quotedAmount ? ` (quoted ${formatMoney(a.quotedAmount)})` : ''} · ${a.approvedBy}`]);
  }
  if (r.booking) rows.push(['Vehicle', `${r.booking.vehicleNo}, ${r.booking.driverName} (${r.booking.driverMobile})`]);
  const doneMilestones = MILESTONES.filter((m) => r.milestones[m.key]);
  if (doneMilestones.length) rows.push(['Trip', doneMilestones.map((m) => m.label).join(' → ')]);
  if (r.delivery) {
    rows.push(['POD', `${r.delivery.podNumber}${r.delivery.damageAmount ? `, damage ${formatMoney(r.delivery.damageAmount)}` : ', no damage'}`]);
  }
  r.payments.forEach((p) => rows.push(['Paid', `${formatMoney(p.amount)}, UTR ${p.utr}`]));

  if (!rows.length) return <p className="done-so-far__empty">Only the requirement is created so far.</p>;

  return (
    <dl className="done-so-far">
      {rows.map(([label, value]) => (
        <div key={label + value} className="done-so-far__row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
