/**
 * All requirements from the database, filtered by In progress / Closed / All.
 */
import { useEffect, useState } from 'react';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { Alert, Button, EmptyState, Loader, PageHeader, Table } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import StageBadge from '../components/StageBadge';
import { requirementsService } from '../services/requirementsService';
import { formatDate, formatDateTime, formatNumber, formatTonnes } from '../utils/format';

const FILTERS = [
  { key: 'open', label: 'In progress' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

const COLUMNS = [
  {
    key: 'requirementNo',
    header: 'Requirement',
    render: (r) => (
      <>
        <span className="req-cell-strong">{r.requirementNo}</span>
        {r.salesOrderRef && <span className="req-cell-sub">SO {r.salesOrderRef}</span>}
      </>
    ),
  },
  {
    key: 'route',
    header: 'Route',
    render: (r) => (
      <>
        {r.from.name} → {r.to.name}
        <span className="req-cell-sub">{formatNumber(r.distanceKm)} km</span>
      </>
    ),
  },
  {
    key: 'material',
    header: 'Material',
    render: (r) => (
      <>
        {r.material}
        <span className="req-cell-sub">{formatTonnes(r.quantityTonnes)}</span>
      </>
    ),
  },
  { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicleType.name },
  { key: 'loadingDate', header: 'Loading date', render: (r) => formatDate(r.loadingDate) },
  { key: 'stage', header: 'Stage', render: (r) => <StageBadge requirement={r} /> },
  {
    key: 'lastUpdate',
    header: 'Last update',
    render: (r) =>
      r.lastUpdate ? (
        <span className="req-cell-wrap">
          {r.lastUpdate.message}
          <span className="req-cell-sub">{formatDateTime(r.lastUpdate.at)}</span>
        </span>
      ) : (
        '–'
      ),
  },
];

export default function RequirementList({ nav }) {
  const [filter, setFilter] = useState('open');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    requirementsService
      .list(filter)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const counts = result?.counts;
  const items = result?.items || [];

  return (
    <div className="req-page">
      <PageHeader
        title="Requirements"
        subtitle="Every transport requirement, from creation to payment"
        actions={
          <Button icon={Plus} onClick={nav.toNew}>
            New requirement
          </Button>
        }
      />

      <div className="req-toolbar">
        <div className="req-filters" role="group" aria-label="Filter requirements">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'primary' : 'secondary'}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {counts ? ` (${counts[f.key]})` : ''}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          onClick={() => setReloadKey((k) => k + 1)}
          aria-label="Refresh list"
          title="Refresh"
        />
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading && !result ? (
        <Loader showLabel label="Loading requirements" />
      ) : counts && counts.all === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Create your first requirement"
          description="A requirement starts the flow: enquiry, quotations, rate approval, booking, trip, delivery and payment."
          action={
            <Button icon={Plus} onClick={nav.toNew}>
              New requirement
            </Button>
          }
        />
      ) : (
        <Table
          columns={COLUMNS}
          data={items}
          rowKey="id"
          caption="Requirements"
          onRowClick={(r) => nav.toDetail(r.requirementNo)}
          emptyMessage={filter === 'closed' ? 'No closed requirements yet.' : 'No requirements in progress.'}
        />
      )}
    </div>
  );
}
