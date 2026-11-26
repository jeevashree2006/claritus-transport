/**
 * Bank details with the second-approval step (FRD FR-TR-003, FR-TR-007, FR-CM-005).
 * Live (approved) details are what payments use. A new or changed set waits as "pending"
 * until someone other than the person who entered it approves or rejects it.
 */
import { useState } from 'react';
import { Check, Eye, EyeOff, Landmark, X } from 'lucide-react';
import { Alert, Button, Card, Input, Modal } from '../../../components/ui-kit';
import { useAuth } from '../../../context/AuthContext';
import { getErrorMessage } from '../../../services/api';
import { getFieldErrors, transportersService } from '../services/transportersService';
import { formatDateTime, maskAccount } from '../utils/format';
import { BankStatusBadge } from './StatusBadges';

function BankRows({ bank, reveal }) {
  return (
    <dl className="tr-details">
      <dt>Account holder</dt>
      <dd>{bank.accountHolder}</dd>
      <dt>Bank</dt>
      <dd>{bank.bankName}</dd>
      <dt>Account number</dt>
      <dd className="tr-mono">{reveal ? bank.accountNumber : maskAccount(bank.accountNumber)}</dd>
      <dt>IFSC</dt>
      <dd className="tr-mono">{bank.ifsc}</dd>
    </dl>
  );
}

export default function BankDetailsCard({ transporter, onChanged }) {
  const { user } = useAuth();
  const { bank } = transporter;
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const isPending = bank.status === 'pending';
  const enteredByMe = isPending && bank.requestedBy?.id === user?.id;

  async function approve() {
    setBusy('approve');
    setError('');
    try {
      const { transporter: updated, message } = await transportersService.approveBank(transporter.code);
      onChanged(updated, message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  async function reject(event) {
    event.preventDefault();
    setBusy('reject');
    setNoteError('');
    try {
      const { transporter: updated, message } = await transportersService.rejectBank(transporter.code, note);
      setRejecting(false);
      onChanged(updated, message);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (fieldErrors.note) setNoteError(fieldErrors.note);
      else {
        setRejecting(false);
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy('');
    }
  }

  const hasAnything = bank.live || bank.pending;

  return (
    <Card
      title="Bank details"
      icon={Landmark}
      action={
        hasAnything && (
          <Button
            variant="ghost"
            size="sm"
            icon={reveal ? EyeOff : Eye}
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide account numbers' : 'Show account numbers'}
            title={reveal ? 'Hide account numbers' : 'Show account numbers'}
          />
        )
      }
    >
      <div className="tr-stack-sm">
        <div>
          <BankStatusBadge status={bank.status} hasLive={Boolean(bank.live)} />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {!hasAnything && (
          <p className="tr-muted">
            No bank details yet. Add them with Edit. They need a second approval before they can be used for payments.
          </p>
        )}

        {bank.live && (
          <div>
            {bank.pending && <h3 className="tr-subheading">Approved, used for payments</h3>}
            <BankRows bank={bank.live} reveal={reveal} />
            {bank.status === 'approved' && bank.reviewedBy && (
              <p className="tr-meta">
                Approved by {bank.reviewedBy.name}, {formatDateTime(bank.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {bank.pending && (
          <div className={isPending ? 'tr-pending-box' : 'tr-rejected-box'}>
            <h3 className="tr-subheading">{isPending ? 'Waiting for approval' : 'Rejected change'}</h3>
            <BankRows bank={bank.pending} reveal={reveal} />
            {bank.requestedBy && (
              <p className="tr-meta">
                Entered by {bank.requestedBy.name}, {formatDateTime(bank.requestedAt)}
              </p>
            )}
            {bank.status === 'rejected' && (
              <p className="tr-meta">
                Rejected by {bank.reviewedBy?.name}, {formatDateTime(bank.reviewedAt)}: {bank.reviewNote}
              </p>
            )}
          </div>
        )}

        {isPending &&
          (enteredByMe ? (
            <Alert tone="info">You entered these details, so someone else has to approve them.</Alert>
          ) : (
            <div className="tr-actions">
              <Button icon={Check} onClick={approve} loading={busy === 'approve'} disabled={Boolean(busy)}>
                Approve
              </Button>
              <Button
                variant="secondary"
                icon={X}
                onClick={() => {
                  setNote('');
                  setNoteError('');
                  setRejecting(true);
                }}
                disabled={Boolean(busy)}
              >
                Reject
              </Button>
            </div>
          ))}
      </div>

      {rejecting && (
        <Modal
          title="Reject bank details"
          size="sm"
          onClose={() => setRejecting(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(false)} disabled={busy === 'reject'}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" form="bank-reject-form" loading={busy === 'reject'}>
                Reject
              </Button>
            </>
          }
        >
          <form id="bank-reject-form" onSubmit={reject} noValidate>
            <Input
              label="Reason"
              placeholder="IFSC doesn’t match the bank name"
              value={note}
              error={noteError}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </form>
        </Modal>
      )}
    </Card>
  );
}
