/**
 * Trip, quotation, rate and payment history for one transporter (FRD FR-TR-006).
 * Everything comes from the Requirements records; a row opens its requirement.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { Badge, Button, Card, Table } from '../../../components/ui-kit';
import { PAYMENT_TYPE_LABELS, formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format';

const route = (r) => `${r.route.from} → ${r.route.to}`;

const TRIP_COLUMNS = [
  { key: 'requirementNo', header: 'Requirement', render: (t) => <span className="tr-cell-strong">{t.requirementNo}</span> },
  {
    key: 'route',
    header: 'Route',
    render: (t) => (
      <>
        {route(t)}
        <span className="tr-cell-sub">{formatNumber(t.distanceKm)} km · {t.material}</span>
      </>
    ),
  },
  {
    key: 'vehicle',
    header: 'Vehicle',
    render: (t) => (
      <>
        <span className="tr-nowrap">{t.vehicleNo}</span>
        <span className="tr-cell-sub">{t.driverName}</span>
      </>
    ),
  },
  { key: 'bookedAt', header: 'Booked', render: (t) => <span className="tr-nowrap">{formatDate(t.bookedAt)}</span> },
  {
    key: 'stage',
    header: 'Status',
    render: (t) => (
      <Badge tone={t.status === 'closed' ? 'success' : t.status === 'cancelled' ? 'neutral' : 'info'}>{t.stageLabel}</Badge>
    ),
  },
  { key: 'agreed', header: 'Agreed', align: 'right', render: (t) => formatMoney(t.agreed) },
  {
    key: 'deduction',
    header: 'Deduction',
    align: 'right',
    render: (t) => (t.deduction > 0 ? <span title={t.deductionNote || ''}>−{formatMoney(t.deduction)}</span> : '–'),
  },
  { key: 'paid', header: 'Paid', align: 'right', render: (t) => formatMoney(t.paid) },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (t) => <span className={t.balance > 0 ? 'tr-cell-strong' : undefined}>{formatMoney(t.balance)}</span>,
  },
];

const QUOTE_COLUMNS = [
  { key: 'requirementNo', header: 'Requirement', render: (q) => <span className="tr-cell-strong">{q.requirementNo}</span> },
  { key: 'route', header: 'Route', render: route },
  { key: 'vehicleType', header: 'Vehicle type' },
  { key: 'amount', header: 'Quoted', align: 'right', render: (q) => formatMoney(q.amount) },
  { key: 'receivedAt', header: 'Received', render: (q) => <span className="tr-nowrap">{formatDateTime(q.receivedAt)}</span> },
  { key: 'selected', header: 'Result', render: (q) => (q.selected ? <Badge tone="success">Selected</Badge> : '–') },
];

const RATE_COLUMNS = [
  { key: 'requirementNo', header: 'Requirement', render: (r) => <span className="tr-cell-strong">{r.requirementNo}</span> },
  { key: 'route', header: 'Route', render: route },
  { key: 'vehicleType', header: 'Vehicle type' },
  { key: 'quoted', header: 'Quoted', align: 'right', render: (r) => formatMoney(r.quoted) },
  { key: 'approved', header: 'Approved rate', align: 'right', render: (r) => <span className="tr-cell-strong">{formatMoney(r.approved)}</span> },
  {
    key: 'approvedBy',
    header: 'Approved by',
    render: (r) => (
      <>
        {r.approvedBy}
        <span className="tr-cell-sub">{formatDate(r.approvedAt)}</span>
      </>
    ),
  },
  { key: 'note', header: 'Note', render: (r) => <span className="tr-cell-wrap">{r.note || '–'}</span> },
];

const PAYMENT_COLUMNS = [
  { key: 'requirementNo', header: 'Requirement', render: (p) => <span className="tr-cell-strong">{p.requirementNo}</span> },
  { key: 'type', header: 'Type', render: (p) => PAYMENT_TYPE_LABELS[p.type] || p.type },
  { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatMoney(p.amount) },
  { key: 'utr', header: 'UTR', render: (p) => <span className="tr-mono">{p.utr}</span> },
  { key: 'paidAt', header: 'Paid on', render: (p) => <span className="tr-nowrap">{formatDate(p.paidAt)}</span> },
  { key: 'recordedBy', header: 'Recorded by' },
];

export default function TransporterHistory({ transporter }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('trips');

  const tabs = [
    { key: 'trips', label: 'Trips', columns: TRIP_COLUMNS, data: transporter.trips, rowKey: 'requirementNo', empty: 'No trips booked with this transporter yet.' },
    { key: 'quotations', label: 'Quotations', columns: QUOTE_COLUMNS, data: transporter.quotations, rowKey: 'id', empty: 'No quotations yet.' },
    { key: 'rates', label: 'Rates', columns: RATE_COLUMNS, data: transporter.rates, rowKey: 'requirementNo', empty: 'No approved rates yet.' },
    { key: 'payments', label: 'Payments', columns: PAYMENT_COLUMNS, data: transporter.payments, rowKey: 'id', empty: 'No payments yet.' },
  ];
  const active = tabs.find((t) => t.key === tab);

  return (
    <Card title="History" icon={History}>
      <div className="tr-stack-sm">
        <div className="tr-tabs" role="group" aria-label="History type">
          {tabs.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? 'primary' : 'secondary'}
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label} ({t.data.length})
            </Button>
          ))}
        </div>
        <Table
          columns={active.columns}
          data={active.data}
          rowKey={active.rowKey}
          caption={`${active.label} history`}
          emptyMessage={active.empty}
          onRowClick={(row) => navigate(`/requirements?id=${encodeURIComponent(row.requirementNo)}`)}
        />
      </div>
    </Card>
  );
}
