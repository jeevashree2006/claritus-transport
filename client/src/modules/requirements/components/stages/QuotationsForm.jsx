/**
 * Stage 3 - record the quote from each transporter who replied.
 */
import { useState } from 'react';
import { IndianRupee, Save } from 'lucide-react';
import { Alert, Button, Input } from '../../../../components/ui-kit';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import './StageForms.css';

export default function QuotationsForm({ requirement, onSaved }) {
  const asked = requirement.enquiry?.transporters || [];
  const [amounts, setAmounts] = useState({});
  const { submitting, error, setError, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  const handleChange = (id, value) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[`q_${id}`] || fieldErrors.quotes) setFieldErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    const quotes = [];
    asked.forEach((t) => {
      const raw = amounts[t.id];
      if (raw === undefined || raw === '') return;
      if (!(Number(raw) > 0)) errors[`q_${t.id}`] = 'Enter a valid amount';
      else quotes.push({ transporterId: t.id, amount: Number(raw) });
    });
    if (!quotes.length && !Object.keys(errors).length) {
      setError('Enter at least one quotation.');
      return undefined;
    }
    if (Object.keys(errors).length) return setFieldErrors(errors);
    return submit(() => requirementsService.recordQuotations(requirement.requirementNo, { quotes }));
  };

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <p className="stage-form__intro">
        Enter each quote for {requirement.vehicleType.name}, including all charges. Leave it blank if the transporter
        didn’t reply.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="stage-form__grid">
        {asked.map((t) => (
          <Input
            key={t.id}
            label={t.name}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            icon={IndianRupee}
            placeholder="Amount in ₹"
            value={amounts[t.id] ?? ''}
            onChange={(e) => handleChange(t.id, e.target.value)}
            error={fieldErrors[`q_${t.id}`]}
            hint={t.city}
            disabled={submitting}
          />
        ))}
      </div>

      <div className="stage-form__actions">
        <Button type="submit" icon={Save} loading={submitting}>
          Save quotations
        </Button>
      </div>
    </form>
  );
}
