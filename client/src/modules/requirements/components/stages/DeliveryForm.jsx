/**
 * Stage 7 - record the signed received copy (POD) and any damage or shortage.
 */
import { useState } from 'react';
import { FileCheck2, IndianRupee, MessageSquare } from 'lucide-react';
import { Alert, Button, Input } from '../../../../components/ui-kit';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import { formatMoney } from '../../utils/format';
import './StageForms.css';

export default function DeliveryForm({ requirement, onSaved }) {
  const rate = requirement.rateApproval.approvedRate;
  const [values, setValues] = useState({ podNumber: '', damageAmount: '', damageNote: '' });
  const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const damage = values.damageAmount === '' ? 0 : Number(values.damageAmount);
    const errors = {};
    if (!values.podNumber.trim()) errors.podNumber = 'Enter the POD number';
    if (!(damage >= 0)) errors.damageAmount = 'Enter 0 or more';
    else if (damage >= rate) errors.damageAmount = `Must be less than the freight, ${formatMoney(rate)}`;
    if (damage > 0 && !values.damageNote.trim()) errors.damageNote = 'Describe the damage or shortage';
    if (Object.keys(errors).length) return setFieldErrors(errors);
    return submit(() =>
      requirementsService.recordDelivery(requirement.requirementNo, {
        podNumber: values.podNumber.trim(),
        damageAmount: damage,
        damageNote: values.damageNote.trim(),
      })
    );
  };

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <p className="stage-form__intro">
        Record the signed and stamped received copy and any damage or shortage. Damage is deducted from the payment.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}

      <Input
        label="POD number"
        name="podNumber"
        icon={FileCheck2}
        placeholder="POD-88412"
        maxLength={40}
        value={values.podNumber}
        onChange={handleChange}
        error={fieldErrors.podNumber}
        disabled={submitting}
      />
      <div className="stage-form__grid">
        <Input
          label="Damage or shortage (₹)"
          name="damageAmount"
          type="number"
          min="0"
          step="1"
          icon={IndianRupee}
          placeholder="0 if none"
          value={values.damageAmount}
          onChange={handleChange}
          error={fieldErrors.damageAmount}
          disabled={submitting}
        />
        <Input
          label="Damage note"
          name="damageNote"
          icon={MessageSquare}
          placeholder="Needed if there’s damage"
          maxLength={300}
          value={values.damageNote}
          onChange={handleChange}
          error={fieldErrors.damageNote}
          disabled={submitting}
        />
      </div>

      <div className="stage-form__actions">
        <Button type="submit" icon={FileCheck2} loading={submitting}>
          Verify POD
        </Button>
      </div>
    </form>
  );
}
