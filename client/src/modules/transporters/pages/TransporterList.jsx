/**
 * All transporters from the database: search, status filter, export, add.
 * FRD FR-TR-001 (list, deactivate), FR-CM-008 (search, filters, export).
 */
import { useEffect, useState } from 'react';
import { Download, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { Alert, Button, EmptyState, Input, Loader, PageHeader, Select, Table } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import { BankStatusBadge, ActiveBadge } from '../components/StatusBadges';
import TransporterFormModal from '../components/TransporterFormModal';
import { transportersService } from '../services/transportersService';
import { downloadExcel, fileDate } from '../../../utils/exportExcel';
import { formatMoney, formatPhone } from '../utils/format';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'bank-pending', label: 'Bank approval pending' },
];

const COLUMNS = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Transporter', render: (t) => <span className="tr-cell-strong">{t.name}</span> },
  { key: 'city', header: 'City', render: (t) => t.city || '–' },
  { key: 'contactPerson', header: 'Contact' },
  { key: 'mobile', header: 'Mobile', render: (t) => <span className="tr-nowrap">{formatPhone(t.mobile)}</span> },
  { key: 'whatsapp', header: 'WhatsApp', render: (t) => <span className="tr-nowrap">{formatPhone(t.whatsapp)}</span> },
  { key: 'bank', header: 'Bank details', render: (t) => <BankStatusBadge status={t.bankStatus} hasLive={t.hasBankDetails} /> },
  { key: 'trips', header: 'Trips', align: 'right' },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (t) => <span className={t.balance > 0 ? 'tr-cell-strong tr-nowrap' : 'tr-nowrap'}>{formatMoney(t.balance)}</span>,
  },
  { key: 'status', header: 'Status', render: (t) => <ActiveBadge active={t.isActive} /> },
];

const EXPORT_COLUMNS = [
  { header: 'Code', value: (t) => t.code },
  { header: 'Transporter', value: (t) => t.name },
  { header: 'City', value: (t) => t.city },
  { header: 'Contact person', value: (t) => t.contactPerson },
  { header: 'Mobile', value: (t) => t.mobile },
  { header: 'WhatsApp', value: (t) => t.whatsapp },
  { header: 'Bank details', value: (t) => t.bankStatus },
  { header: 'Trips', value: (t) => t.trips, type: 'number' },
  { header: 'Outstanding balance (INR)', value: (t) => t.balance, type: 'money' },
  { header: 'Status', value: (t) => (t.isActive ? 'Active' : 'Inactive') },
];

export default function TransporterList({ nav }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced search
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);

  // Wait until typing pauses before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const filters =
      status === 'bank-pending' ? { search: query, status: 'all', bank: 'pending' } : { search: query, status };
    transportersService
      .list(filters)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, status, reloadKey]);

  const items = result?.items || [];
  const counts = result?.counts;
  const filtered = Boolean(query) || status !== 'all';

  const handleSaved = (transporter, message) => {
    setAdding(false);
    setNotice(message);
    setReloadKey((k) => k + 1);
  };

  const exportList = () =>
    downloadExcel(`transporters-${fileDate()}.xlsx`, EXPORT_COLUMNS, items, { sheetName: 'Transporters' });

  return (
    <div className="tr-page">
      <PageHeader
        title="Transporters"
        subtitle="Contacts, bank details and trip history in one list"
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Add transporter
          </Button>
        }
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {counts?.bankPending > 0 && status !== 'bank-pending' && (
        <Alert tone="warning">
          {counts.bankPending} transporter{counts.bankPending > 1 ? 's have' : ' has'} bank details waiting for a second
          approval.{' '}
          <button type="button" className="tr-link" onClick={() => setStatus('bank-pending')}>
            Show them
          </button>
        </Alert>
      )}

      <div className="tr-toolbar">
        <Input
          className="tr-toolbar__search"
          icon={Search}
          type="search"
          placeholder="Search name, city or phone"
          aria-label="Search transporters"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="tr-toolbar__status"
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <div className="tr-toolbar__actions">
          <Button variant="secondary" icon={Download} onClick={exportList} disabled={!items.length}>
            Export
          </Button>
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="Refresh list"
            title="Refresh"
          />
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading && !result ? (
        <Loader showLabel label="Loading transporters" />
      ) : counts && counts.all === 0 ? (
        <EmptyState
          icon={Truck}
          title="Add your first transporter"
          description="Keep each transporter’s contacts, WhatsApp number and bank details here, so they can be sent enquiries and paid."
          action={
            <Button icon={Plus} onClick={() => setAdding(true)}>
              Add transporter
            </Button>
          }
        />
      ) : (
        <Table
          columns={COLUMNS}
          data={items}
          rowKey="id"
          caption="Transporters"
          onRowClick={(t) => nav.toDetail(t.code)}
          emptyMessage={filtered ? 'No transporters match your search.' : 'No transporters yet.'}
        />
      )}

      {adding && <TransporterFormModal onClose={() => setAdding(false)} onSaved={handleSaved} />}
    </div>
  );
}
