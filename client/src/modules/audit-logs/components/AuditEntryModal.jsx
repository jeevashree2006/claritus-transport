import { Link } from 'react-router-dom';
import { Badge, Modal } from '../../../components/ui-kit';
import {
  actionLabel,
  fieldLabel,
  formatValue,
  formatWhen,
  moduleLabel,
  moduleTone,
  recordHref,
  roleLabel,
} from '../utils/auditFormat';

/** Read-only view of one entry with its previous and new values (FRD FR-CM-004). */
export default function AuditEntryModal({ entry, onClose }) {
  const oldValues = entry.oldValues && typeof entry.oldValues === 'object' ? entry.oldValues : {};
  const newValues = entry.newValues && typeof entry.newValues === 'object' ? entry.newValues : {};
  const fields = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
  const href = recordHref(entry);

  return (
    <Modal title="Audit entry" onClose={onClose} variant="side">
      <dl className="audit-entry__facts">
        <dt>When</dt>
        <dd>{formatWhen(entry.createdAt)}</dd>
        <dt>User</dt>
        <dd>{entry.user ? `${entry.user.name} (${roleLabel(entry.user.role)})` : 'Unknown user'}</dd>
        <dt>Module</dt>
        <dd>
          <Badge tone={moduleTone(entry.module)}>{moduleLabel(entry.module)}</Badge>
        </dd>
        <dt>Action</dt>
        <dd>{actionLabel(entry.action)}</dd>
        <dt>Details</dt>
        <dd>{entry.summary}</dd>
        {entry.stage && (
          <>
            <dt>Stage</dt>
            <dd>
              {entry.stage.no}. {entry.stage.label}
            </dd>
          </>
        )}
        <dt>Record</dt>
        <dd>
          {href ? (
            <Link to={href} className="audit-log__record-link">
              {entry.recordLabel || entry.recordId}
            </Link>
          ) : (
            entry.recordLabel || entry.recordId || '—'
          )}
          {entry.recordType && (
            <span className="audit-log__muted">
              {' '}
              ({entry.recordType}
              {entry.recordId ? ` #${entry.recordId}` : ''})
            </span>
          )}
        </dd>
        <dt>IP</dt>
        <dd>{entry.ip || '—'}</dd>
      </dl>

      <h3 className="audit-entry__heading">Previous and new values</h3>
      {fields.length === 0 ? (
        <p className="audit-log__muted">
          {entry.source === 'requirement_history'
            ? 'Requirement history records what happened, not field values. Open the requirement to see its current details.'
            : 'No field values were recorded for this action.'}
        </p>
      ) : (
        <div className="audit-entry__values">
          <table className="audit-entry__table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Previous value</th>
                <th scope="col">New value</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((key) => (
                <tr key={key}>
                  <th scope="row">{fieldLabel(key)}</th>
                  <td className="audit-entry__old">{formatValue(oldValues[key])}</td>
                  <td className="audit-entry__new">{formatValue(newValues[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="audit-log__muted audit-entry__note">Audit entries are read-only and cannot be edited or deleted.</p>
    </Modal>
  );
}
