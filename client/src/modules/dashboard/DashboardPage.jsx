/**
 * Dashboard base screen - layout with SAMPLE data only (no API, no actions yet).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChartPie, ListOrdered, ClipboardList } from 'lucide-react';
import { Badge, Card, PageHeader, Select, StatCard, Table } from '../../components/ui-kit';
import AlertsList from './components/AlertsList';
import DonutChart from './components/DonutChart';
import StageBars from './components/StageBars';
import {
  PERIOD_OPTIONS,
  alerts,
  kpis,
  recentRequirements,
  requirementsByStage,
  tripStatus,
} from './data/sampleDashboard';
import './DashboardPage.css';

const REQUIREMENT_COLUMNS = [
  { key: 'id', header: 'Requirement ID', render: (row) => <span className="dashboard__req-id">{row.id}</span> },
  { key: 'route', header: 'Route' },
  { key: 'transporter', header: 'Transporter' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'stage', header: 'Stage', render: (row) => <Badge tone={row.stageTone}>{row.stage}</Badge> },
];

export default function DashboardPage() {
  // Only changes the dropdown for now; it will drive the API query later.
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);

  return (
    <div className="dashboard">
      <PageHeader
        title="Transport operations"
        subtitle="Requirements, trips and settlement at a glance"
        actions={
          <Select
            aria-label="Period"
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="dashboard__period"
          />
        }
      />

      <section className="dashboard__kpis" aria-label="Key figures">
        {kpis.map(({ key, ...kpi }) => (
          <StatCard key={key} {...kpi} />
        ))}
      </section>

      <div className="dashboard__row">
        <Card title="Trip status" icon={ChartPie}>
          <DonutChart segments={tripStatus.segments} total={tripStatus.total} totalLabel="Trips" />
        </Card>
        <Card title="Requirements by stage" icon={ListOrdered}>
          <StageBars items={requirementsByStage} />
        </Card>
      </div>

      <div className="dashboard__row dashboard__row--wide-left">
        <Card title="Recent requirements" icon={ClipboardList} action={<Link to="/requirements">View all</Link>}>
          <Table columns={REQUIREMENT_COLUMNS} data={recentRequirements} caption="Recent requirements" />
        </Card>
        <Card title="Alerts and exceptions" icon={AlertTriangle}>
          <AlertsList items={alerts} />
        </Card>
      </div>
    </div>
  );
}
