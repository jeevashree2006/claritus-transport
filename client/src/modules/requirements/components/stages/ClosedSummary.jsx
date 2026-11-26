/**
 * Shown when all 8 stages are done.
 */
import { formatDateTime } from '../../utils/format';
import Settlement from './Settlement';
import './StageForms.css';

export default function ClosedSummary({ requirement }) {
  const payment = requirement.payments[requirement.payments.length - 1];
  return (
    <div className="stage-form">
      <p className="stage-form__intro">
        All 8 stages are complete.
        {payment && ` Paid on ${formatDateTime(payment.paidAt)} by ${payment.recordedBy}, UTR ${payment.utr}.`}
      </p>
      <Settlement requirement={requirement} />
    </div>
  );
}
