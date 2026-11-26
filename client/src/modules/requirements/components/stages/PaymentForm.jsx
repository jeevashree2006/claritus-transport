/**
 * Stage 8 - pay the transporter and close the trip.
 * Payable = approved rate - damage, calculated by the server (software logic, not AI).
 */
import { useState } from 'react';
import { Banknote, Hash, IndianRupee } from 'lucide-react';
import { Alert, Button, Input } from '../../../../components/ui-kit';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import { formatMoney } from '../../utils/format';
import Settlement from './Settlement';
import './StageForms.css';

const UTR_RE = /^[A-Z0-9]{10,22}$/;

export default function PaymentForm({ requirement, onSaved }) {
  const { settlement } = requirement;
  const [amount, setAmount] = useState(String(settlement.payable));
  const [utr, setUtr] = useState('');
  const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanUtr = utr.trim().toUpperCase();
    const errors = {};
    if (Number(amount) !== settlement.payable) errors.amount = `Must equal the payable amount, ${formatMoney(settlement.payable)}`;
    if (!UTR_RE.test(cleanUtr)) errors.utr = 'Enter the UTR: 10 to 22 letters and numbers';
    if (Object.keys(errors).length) return setFieldErrors(errors);
    return submit(() => requirementsService.recordPayment(requirement.requirementNo, { amount: Number(amount), utr: cleanUtr }));
  };

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <Settlement requirement={requirement} />
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="stage-form__grid">
        <Input
          label="Amount paid (₹)"
          type="number"
          min="0"
          step="1"
          icon={IndianRupee}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }));
          }}
          error={fieldErrors.amount}
          disabled={submitting}
        />
        <Input
          label="UTR (bank reference)"
          icon={Hash}
          placeholder="HDFCN52026111234"
          autoCapitalize="characters"
          maxLength={22}
          value={utr}
          onChange={(e) => {
            setUtr(e.target.value);
            if (fieldErrors.utr) setFieldErrors((p) => ({ ...p, utr: undefined }));
          }}
          error={fieldErrors.utr}
          disabled={submitting}
        />
      </div>

      <div className="stage-form__actions">
        <Button type="submit" icon={Banknote} loading={submitting}>
          Record payment and close trip
        </Button>
      </div>
    </form>
  );
}
