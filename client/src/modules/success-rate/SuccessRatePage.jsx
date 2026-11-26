/**
 * Success rate (route /success-rate, Administrator and Managing Director – view only).
 * Shows transporter participation only: reply behaviour and trip records per transporter,
 * from real records. No AI score, no ranking, never rejects a transporter (FRD FR-TR-009, AC-22).
 * The period opens with the Settings value "Reports › Default date filter".
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { Alert, Button, Card, Loader, PageHeader, Select } from '../../components/ui-kit';
import { ROLES } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import ParticipationTable from './components/ParticipationTable';
import { successRateService } from './services/successRateService';
import { formatMinutes } from './utils/format';
import './SuccessRatePage.css';

export default function SuccessRatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [period, setPeriod] = useState(''); // '' = server default from Settings
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (value) => {
    setLoading(true);
    setError('');
    try {
      const data = await successRateService.report(value);
      setReport(data);
      setPeriod(data.period.value);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the success rate."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const header = (
    <PageHeader
      title="Success rate"
      subtitle="How each transporter replies to enquiries and performs on trips – from real records only"
      actions={
        report && (
          <Select
            aria-label="Period"
            options={report.periodOptions}
            value={period}
            onChange={(e) => load(e.target.value)}
            disabled={loading}
            className="sr-period"
          />
        )
      }
    />
  );

  if (error && !report) {
    return (
      <>
        {header}
        <Alert tone="danger" title="Success rate did not load">
          {error}
        </Alert>
        <div className="sr-retry">
          <Button variant="secondary" onClick={() => load(period)}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (!report) {
    return (
      <>
        {header}
        <Loader label="Loading success rate" showLabel />
      </>
    );
  }

  const { transporters, lateAfterMinutes } = report;

  return (
    <div className={['sr', loading && 'sr--loading'].filter(Boolean).join(' ')} aria-busy={loading || undefined}>
      {header}
      {error && <Alert tone="danger">{error}</Alert>}

      <Card title="Transporter participation" icon={Truck} bodyClassName="sr-card-body--table">
        <p className="sr-help">
          Status shows reply behaviour in this period only: Active replies to 75% or more of enquiries, Occasional to
          fewer. It is not a score and never blocks a transporter. A vehicle counts as reported late when it is loaded
          more than {formatMinutes(lateAfterMinutes)} after the expected reporting time (Settings › Trips & Follow-up).
          {isAdmin && ' Select a row to open the transporter’s profile.'}
        </p>
        <ParticipationTable
          transporters={transporters}
          onOpen={isAdmin ? (row) => navigate(`/transporters?id=${encodeURIComponent(row.code)}`) : undefined}
        />
      </Card>
    </div>
  );
}
