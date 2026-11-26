/**
 * Stage 4 - compare the quotes and approve the final rate.
 * The lowest quote is highlighted but never selected automatically (BRD rule 1, FR-TR-036).
 */
import { useState } from 'react';
import { CheckCircle2, IndianRupee, MessageSquare } from 'lucide-react';
import { Alert, Badge, Button, Input, Table } from '../../../../components/ui-kit';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import { formatDate, formatMoney } from '../../utils/format';
import './StageForms.css';

export default function RateApprovalForm({ requirement, onSaved }) {
  const quotes = requirement.quotations; // sorted lowest first by the API
  const lowest = quotes[0]?.amount;
  const last = requirement.lastApprovedRate;
  const [pick, setPick] = useState(null);
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  const choose = (quote) => {
    setPick(quote.transporterId);
    setRate(String(quote.amount)); // start from the quoted amount; edit after negotiation
    setFieldErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!pick) errors.transporterId = 'Choose a transporter';
    if (!(Number(rate) > 0)) errors.approvedRate = 'Enter the final rate';
    if (Object.keys(errors).length) return setFieldErrors(errors);
    return submit(() =>
      requirementsService.approveRate(requirement.requirementNo, {
        transporterId: pick,
        approvedRate: Number(rate),
        note: note.trim(),
      })
    );
  };

  const columns = [
    {
      key: 'pick',
      header: <span className="sr-only">Choose</span>,
      render: (q) => (
        <input
          type="radio"
          name="rate-pick"
          className="quote-table__radio"
          checked={pick === q.transporterId}
          onChange={() => choose(q)}
          aria-label={`Choose ${q.transporterName}`}
          disabled={submitting}
        />
      ),
    },
    {
      key: 'transporterName',
      header: 'Transporter',
      render: (q) => (
        <>
          {q.transporterName} {q.amount === lowest && <Badge tone="success">Lowest</Badge>}
        </>
      ),
    },
    { key: 'amount', header: 'Quote', align: 'right', render: (q) => formatMoney(q.amount) },
    {
      key: 'diff',
      header: 'vs lowest',
      align: 'right',
      render: (q) => (q.amount === lowest ? '–' : `+${formatMoney(q.amount - lowest)}`),
    },
  ];
  if (last) {
    columns.push({
      key: 'vsLast',
      header: 'vs last rate',
      align: 'right',
      render: (q) => {
        const d = q.amount - last.rate;
        if (d === 0) return '±0';
        return (
          <span className={d > 0 ? 'quote-table__diff--up' : 'quote-table__diff--down'}>
            {d > 0 ? '+' : '−'}
            {formatMoney(Math.abs(d))}
          </span>
        );
      },
    });
  }

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <p className="stage-form__intro">
        All quotes are for {requirement.vehicleType.name}. Choose the transporter yourself; the lowest quote isn’t picked
        automatically.
      </p>
      {last && (
        <Alert tone="info">
          Last approved rate on this route: <strong>{formatMoney(last.rate)}</strong> ({last.transporterName},{' '}
          {last.requirementNo}, {formatDate(String(last.at).slice(0, 10))})
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}

      <Table
        className="quote-table"
        columns={columns}
        data={quotes}
        rowKey="transporterId"
        caption="Quotations"
        onRowClick={submitting ? undefined : choose}
      />
      {fieldErrors.transporterId && <p className="stage-form__error">{fieldErrors.transporterId}</p>}

      <div className="stage-form__grid">
        <Input
          label="Final rate after negotiation (₹)"
          type="number"
          min="0"
          step="1"
          icon={IndianRupee}
          value={rate}
          onChange={(e) => {
            setRate(e.target.value);
            if (fieldErrors.approvedRate) setFieldErrors({});
          }}
          error={fieldErrors.approvedRate}
          disabled={submitting}
        />
        <Input
          label="Note"
          icon={MessageSquare}
          placeholder="Negotiated from ₹31,000"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={fieldErrors.note}
          disabled={submitting}
        />
      </div>

      <div className="stage-form__actions">
        <Button type="submit" icon={CheckCircle2} loading={submitting}>
          Approve rate
        </Button>
      </div>
    </form>
  );
}
