/**
 * Dashboard (route /dashboard, Administrator and Managing Director – view only).
 * Live figures from the Requirements records via GET /api/dashboard. No sample data.
 * Refreshes itself every minute while the page is open and visible.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChartPie, CircleCheckBig, ClipboardList, ListOrdered, RefreshCw, Truck } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Loader, PageHeader, Select, StatCard, Table } from '../../components/ui-kit';
import { ROLES } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import AlertsList from './components/AlertsList';
import DonutChart from './components/DonutChart';
import StageBars from './components/StageBars';
import { dashboardService } from './services/dashboardService';
import './DashboardPage.css';

const REFRESH_MS = 60_000;

const REQUIREMENT_COLUMNS = [
  { key: 'id', header: 'Requirement ID', render: (row) => <span className="dashboard__req-id">{row.id}</span> },
  { key: 'route', header: 'Route' },
  { key: 'transporter', header: 'Transporter' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'stage', header: 'Stage', render: (row) => <Badge tone={row.stageTone}>{row.stage}</Badge> },
];

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // MD can view the dashboard but cannot open Requirements or Transporters.
  const canOpenRecords = user?.role === ROLES.ADMIN;

  const [period, setPeriod] = useState(''); // '' = default from Settings › Reports
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const periodRef = useRef('');

  const load = useCallback(async (value, { quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await dashboardService.get(value);
      setData(result);
      setPeriod(result.period.value);
      periodRef.current = result.period.value;
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  // Keep the figures current while the page is open (skipped when the tab is hidden).
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(periodRef.current, { quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const header = (
    <PageHeader
      title="Transport operations"
      subtitle={
        data
          ? `Requirements, trips and settlement at a glance · updated ${formatTime(data.generatedAt)}`
          : 'Requirements, trips and settlement at a glance'
      }
      actions={
        data && (
          <div className="dashboard__actions">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => load(period)}
              disabled={loading}
              aria-label="Refresh dashboard"
              title="Refresh"
            />
            <Select
              aria-label="Period"
              options={data.periodOptions}
              value={period}
              onChange={(event) => load(event.target.value)}
              disabled={loading}
              className="dashboard__period"
            />
          </div>
        )
      }
    />
  );

  if (!data) {
    return (
      <div className="dashboard">
        {header}
        {error ? (
          <Alert tone="danger" title="Dashboard did not load">
            {error}
          </Alert>
        ) : (
          <Loader showLabel label="Loading dashboard" />
        )}
      </div>
    );
  }

  const { kpis, tripStatus, requirementsByStage, recentRequirements, alerts } = data;
  const periodLabel = data.period.label.toLowerCase();

  return (
    <div className={['dashboard', loading && 'dashboard--loading'].filter(Boolean).join(' ')} aria-busy={loading || undefined}>
      {header}
      {error && <Alert tone="danger">{error}</Alert>}

      <section className="dashboard__kpis" aria-label="Key figures">
        <StatCard label="Total requirements" value={kpis.requirements} icon={ClipboardList} tone="primary" />
        <StatCard label="In transit" value={kpis.inTransit} icon={Truck} tone="warning" />
        <StatCard label="Delivered" value={kpis.delivered} icon={CircleCheckBig} tone="success" />
        <StatCard label="Delayed" value={kpis.delayed} icon={AlertTriangle} tone="danger" />
      </section>

      <div className="dashboard__row">
        <Card title="Trip status" icon={ChartPie}>
          {tripStatus.total > 0 ? (
            <DonutChart segments={tripStatus.segments} total={tripStatus.total} totalLabel="Trips" />
          ) : (
            <EmptyState icon={Truck} title="No trips booked" description={`No vehicle has been booked for requirements created ${periodLabel}.`} />
          )}
        </Card>
        <Card title="Requirements by stage" icon={ListOrdered}>
          <StageBars items={requirementsByStage} />
        </Card>
      </div>

      <div className="dashboard__row dashboard__row--wide-left">
        <Card
          title="Recent requirements"
          icon={ClipboardList}
          action={canOpenRecords && <Link to="/requirements">View all</Link>}
        >
          <Table
            columns={REQUIREMENT_COLUMNS}
            data={recentRequirements}
            caption="Recent requirements"
            emptyMessage={`No requirements created ${periodLabel}.`}
            onRowClick={canOpenRecords ? (row) => navigate(`/requirements?id=${encodeURIComponent(row.id)}`) : undefined}
          />
        </Card>
        <Card title="Alerts and exceptions" icon={AlertTriangle}>
          {alerts.length > 0 ? (
            <AlertsList items={canOpenRecords ? alerts : alerts.map(({ to: _to, ...rest }) => rest)} />
          ) : (
            <p className="dashboard__all-clear">Nothing needs attention right now.</p>
          )}
        </Card>
      </div>

      <p className="dashboard__note">
        Cards, trip status, stages and recent requirements cover requirements created {periodLabel}. Alerts cover
        every open requirement. A vehicle counts as delayed when it is not loaded {data.lateAfterMinutes} minutes after
        its expected reporting time (Settings › Trips & Follow-up).
      </p>
    </div>
  );
}
