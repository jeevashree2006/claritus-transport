/**
 * One transporter: contact and bank details, balance, performance and history.
 * FRD FR-TR-001 (edit, deactivate), FR-TR-006 (history, balance), FR-TR-007 (bank approval),
 * FR-TR-009 (performance from real trip records only: no score, no automatic rejection).
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Contact, IndianRupee, Pencil, Power, Route, Truck, Wallet } from 'lucide-react';
import { Alert, Button, Card, EmptyState, Loader, Modal, PageHeader, StatCard, Table } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import BankDetailsCard from '../components/BankDetailsCard';
import { ActiveBadge } from '../components/StatusBadges';
import TransporterFormModal from '../components/TransporterFormModal';
import TransporterHistory from '../components/TransporterHistory';
import { transportersService } from '../services/transportersService';
import { formatDate, formatMoney, formatPhone } from '../utils/format';

const ROUTE_COLUMNS = [
  { key: 'route', header: 'Route', render: (r) => <span className="tr-cell-strong">{r.route}</span> },
  { key: 'trips', header: 'Trips', align: 'right' },
  { key: 'averageRate', header: 'Average rate', align: 'right', render: (r) => formatMoney(r.averageRate) },
  { key: 'lastRate', header: 'Last rate', align: 'right', render: (r) => formatMoney(r.lastRate) },
];

export default function TransporterDetail({ transporterRef, nav }) {
  const [transporter, setTransporter] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    transportersService
      .get(transporterRef)
      .then((t) => !cancelled && setTransporter(t))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Couldn’t load this transporter.')));
    return () => {
      cancelled = true;
    };
  }, [transporterRef]);

  const applyUpdate = (updated, message) => {
    setTransporter(updated);
    setNotice(message);
  };

  async function toggleActive() {
    setStatusBusy(true);
    try {
      const { transporter: updated, message } = await transportersService.setActive(transporter.code, !transporter.isActive);
      applyUpdate(updated, message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStatusBusy(false);
      setConfirmStatus(false);
    }
  }

  const back = (
    <Button variant="ghost" size="sm" icon={ArrowLeft} className="tr-back" onClick={nav.toList}>
      All transporters
    </Button>
  );

  if (!transporter) {
    return (
      <div className="tr-page">
        {back}
        {error ? (
          <EmptyState icon={Truck} title="Transporter not found" description={error} />
        ) : (
          <Loader showLabel label="Loading transporter" />
        )}
      </div>
    );
  }

  const { summary, performance } = transporter;

  return (
    <div className="tr-page">
      {back}

      <PageHeader
        title={transporter.name}
        subtitle={[transporter.code, transporter.city, `Added ${formatDate(transporter.createdAt)}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="secondary" icon={Power} onClick={() => setConfirmStatus(true)}>
              {transporter.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      {!transporter.isActive && (
        <Alert tone="warning" title="This transporter is inactive">
          It stays in history but can’t be picked for new enquiries.
        </Alert>
      )}

      <div className="tr-stats">
        <StatCard label="Trips" value={summary.trips} icon={Truck} />
        <StatCard label="Total payable" value={formatMoney(summary.payable)} icon={IndianRupee} />
        <StatCard label="Paid" value={formatMoney(summary.paid)} icon={Wallet} tone="success" />
        <StatCard
          label="Outstanding balance"
          value={formatMoney(summary.balance)}
          icon={Wallet}
          tone={summary.balance > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="tr-two-col">
        <div className="tr-stack">
          <Card title="Contact" icon={Contact}>
            <div className="tr-stack-sm">
              <div>
                <ActiveBadge active={transporter.isActive} />
              </div>
              <dl className="tr-details">
                <dt>Contact person</dt>
                <dd>{transporter.contactPerson}</dd>
                <dt>Mobile</dt>
                <dd>
                  <a href={`tel:+91${transporter.mobile}`}>{formatPhone(transporter.mobile)}</a>
                </dd>
                <dt>WhatsApp</dt>
                <dd>
                  <a href={`https://wa.me/91${transporter.whatsapp}`} target="_blank" rel="noreferrer">
                    {formatPhone(transporter.whatsapp)}
                  </a>
                </dd>
                <dt>City</dt>
                <dd>{transporter.city || '–'}</dd>
                <dt>Address</dt>
                <dd>{transporter.address || '–'}</dd>
                <dt>Regular routes</dt>
                <dd>{transporter.regularRoutes || '–'}</dd>
              </dl>
            </div>
          </Card>
          <BankDetailsCard transporter={transporter} onChanged={applyUpdate} />
        </div>

        <Card title="Performance" icon={BarChart3}>
          <div className="tr-stack-sm">
            <p className="tr-muted">From actual trip records only. No score or ranking is calculated.</p>
            <dl className="tr-details">
              <dt>Enquiries received</dt>
              <dd>{performance.enquiriesReceived}</dd>
              <dt>Quotations given</dt>
              <dd>{performance.quotationsGiven}</dd>
              <dt>Awaiting a reply</dt>
              <dd>{performance.awaitingReply}</dd>
              <dt>Trips won</dt>
              <dd>{performance.tripsWon}</dd>
              <dt>Damage or shortage claims</dt>
              <dd>
                {performance.damageClaims}
                {performance.damageAmount > 0 && ` (${formatMoney(performance.damageAmount)} deducted)`}
              </dd>
            </dl>
            <h3 className="tr-subheading tr-subheading--icon">
              <Route size={16} aria-hidden="true" /> Routes served
            </h3>
            <Table
              columns={ROUTE_COLUMNS}
              data={performance.routesServed}
              rowKey="route"
              caption="Routes served"
              emptyMessage="No trips yet."
            />
          </div>
        </Card>
      </div>

      <TransporterHistory transporter={transporter} />

      {editing && (
        <TransporterFormModal
          transporter={transporter}
          onClose={() => setEditing(false)}
          onSaved={(updated, message) => {
            setEditing(false);
            applyUpdate(updated, message);
          }}
        />
      )}

      {confirmStatus && (
        <Modal
          title={transporter.isActive ? `Deactivate ${transporter.name}?` : `Activate ${transporter.name}?`}
          size="sm"
          onClose={() => setConfirmStatus(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmStatus(false)} disabled={statusBusy}>
                Cancel
              </Button>
              <Button variant={transporter.isActive ? 'danger' : 'primary'} onClick={toggleActive} loading={statusBusy}>
                {transporter.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </>
          }
        >
          <p className="tr-muted">
            {transporter.isActive
              ? 'Its trips and payments stay in history, but it can’t be picked for new enquiries until you activate it again.'
              : 'It can be picked for new enquiries again.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
