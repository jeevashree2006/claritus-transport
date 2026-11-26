/**
 * Stage 6 - mark each trip milestone as it happens, in order.
 * When the vehicle is unloaded the requirement moves to Delivery.
 */
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Alert, Badge, Button, Input } from '../../../../components/ui-kit';
import { MILESTONES } from '../../config/stages';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import { formatDateTime } from '../../utils/format';
import './StageForms.css';

export default function TripFollowUpForm({ requirement, onSaved }) {
  const [note, setNote] = useState('');
  const handleSaved = (updated) => {
    setNote('');
    onSaved(updated);
  };
  const { submitting, error, submit } = useStageSubmit(handleSaved);
  const next = requirement.nextMilestone;
  const booking = requirement.booking;

  const mark = (milestone) =>
    submit(() => requirementsService.recordMilestone(requirement.requirementNo, { milestone, note: note.trim() }));

  return (
    <div className="stage-form">
      <p className="stage-form__intro">
        Vehicle {booking.vehicleNo}, driver {booking.driverName} ({booking.driverMobile}). Mark each milestone as it
        happens.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}

      <ol className="milestones">
        {MILESTONES.map((m) => {
          const done = requirement.milestones[m.key];
          return (
            <li key={m.key} className="milestones__item">
              <span>
                <span className="milestones__name">{m.label}</span>
                {done && (
                  <span className="milestones__time">
                    {formatDateTime(done.at)} · {done.recordedBy}
                    {done.note ? ` · ${done.note}` : ''}
                  </span>
                )}
              </span>
              {done ? (
                <Badge tone="success">Done</Badge>
              ) : next === m.key ? (
                <Button size="sm" loading={submitting} onClick={() => mark(m.key)}>
                  Mark {m.label.toLowerCase()}
                </Button>
              ) : (
                <Badge tone="neutral">Waiting</Badge>
              )}
            </li>
          );
        })}
      </ol>

      <Input
        label="Note for the next milestone (optional)"
        icon={MessageSquare}
        placeholder="Delayed at check post for 1 hour"
        maxLength={300}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={submitting}
      />
    </div>
  );
}
