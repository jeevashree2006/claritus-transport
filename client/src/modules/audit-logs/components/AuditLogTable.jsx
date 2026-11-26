import { Link } from 'react-router-dom';
import { Badge, Table } from '../../../components/ui-kit';
import { formatWhen, moduleLabel, moduleTone, recordHref, roleLabel } from '../utils/auditFormat';

function RecordCell({ entry }) {
  const href = recordHref(entry);
  const label = entry.recordLabel || entry.recordId || '—';
  const ref = entry.recordType ? `${entry.recordType}${entry.recordId ? ` #${entry.recordId}` : ''}` : null;

  return (
    <div className="audit-log__stack">
      {href ? (
        <Link to={href} className="audit-log__record-link" onClick={(event) => event.stopPropagation()}>
          {label}
        </Link>
      ) : (
        <span className="audit-log__record-label">{label}</span>
      )}
      {ref && <span className="audit-log__muted">{ref}</span>}
    </div>
  );
}

const COLUMNS = [
  { key: 'when', header: 'When', render: (e) => <span className="audit-log__when">{formatWhen(e.createdAt)}</span> },
  {
    key: 'user',
    header: 'User',
    render: (e) =>
      e.user ? (
        <div className="audit-log__stack">
          <span className="audit-log__strong">{e.user.name}</span>
          <span className="audit-log__muted">{roleLabel(e.user.role)}</span>
        </div>
      ) : (
        <span className="audit-log__muted">Unknown user</span>
      ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (e) => (
      <div className="audit-log__stack audit-log__action">
        <span>{e.summary}</span>
        <span>
          <Badge tone={moduleTone(e.module)}>{moduleLabel(e.module)}</Badge>
        </span>
      </div>
    ),
  },
  { key: 'record', header: 'Record', render: (e) => <RecordCell entry={e} /> },
  { key: 'ip', header: 'IP', render: (e) => <span className="audit-log__muted">{e.ip || '—'}</span> },
];

export default function AuditLogTable({ entries, onOpen }) {
  return (
    <Table
      columns={COLUMNS}
      data={entries}
      onRowClick={onOpen}
      caption="Audit log entries. Select a row to see its previous and new values."
      emptyMessage="No audit entries match these filters."
      className="audit-log__table"
    />
  );
}
