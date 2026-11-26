/**
 * Transporter participation: enquiries, replies and trip records per transporter.
 * Status describes reply behaviour in the period only – it is not a score and never
 * blocks a transporter (FRD FR-TR-009, AC-22).
 */
import { Badge, Table } from '../../../components/ui-kit';
import { formatHours, PARTICIPATION_TONES } from '../utils/format';
import RateBar from './RateBar';

const COLUMNS = [
  {
    key: 'name',
    header: 'Transporter',
    render: (row) => (
      <span className="sr-transporter">
        <span className="sr-transporter__name">{row.name}</span>
        {row.city && <span className="sr-transporter__city">{row.city}</span>}
      </span>
    ),
  },
  { key: 'enquiries', header: 'Enquiries', align: 'right' },
  { key: 'quotes', header: 'Quotes', align: 'right' },
  {
    key: 'replyRate',
    header: 'Reply rate',
    render: (row) => (
      <RateBar
        value={row.replyRate}
        label={`Reply rate of ${row.name}`}
        tone={row.replyRate !== null && row.replyRate < 75 ? 'warning' : 'success'}
      />
    ),
  },
  { key: 'avgReplyHours', header: 'Avg. reply time', align: 'right', render: (row) => formatHours(row.avgReplyHours) },
  { key: 'tripsWon', header: 'Trips won', align: 'right' },
  {
    key: 'lateReporting',
    header: 'Reported late',
    align: 'right',
    render: (row) => (row.booked ? `${row.lateReporting} of ${row.booked}` : '–'),
  },
  {
    key: 'damageClaims',
    header: 'Damage claims',
    align: 'right',
    render: (row) => (row.delivered ? `${row.damageClaims} of ${row.delivered}` : '–'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={PARTICIPATION_TONES[row.participation.key] || 'neutral'}>{row.participation.label}</Badge>
    ),
  },
];

export default function ParticipationTable({ transporters, onOpen }) {
  return (
    <Table
      columns={COLUMNS}
      data={transporters}
      onRowClick={onOpen}
      caption="Transporter participation"
      emptyMessage="No transporters yet."
    />
  );
}
