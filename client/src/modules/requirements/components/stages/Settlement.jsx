/**
 * Settlement summary: approved rate - damage = payable, paid and balance.
 */
import { formatMoney } from '../../utils/format';
import './StageForms.css';

export default function Settlement({ requirement }) {
  const s = requirement.settlement;
  if (!s) return null;
  const closed = requirement.payments.length > 0;

  return (
    <dl className="settlement">
      <dt>Approved rate</dt>
      <dd>{formatMoney(s.approvedRate)}</dd>
      <dt>Damage deduction</dt>
      <dd>− {formatMoney(s.deduction)}</dd>
      <dt className="settlement__total">Payable to {requirement.rateApproval.transporterName}</dt>
      <dd className="settlement__total">{formatMoney(s.payable)}</dd>
      {closed && (
        <>
          <dt>Paid</dt>
          <dd>{formatMoney(s.paid)}</dd>
          <dt>Balance</dt>
          <dd>{formatMoney(s.balance)}</dd>
        </>
      )}
    </dl>
  );
}
