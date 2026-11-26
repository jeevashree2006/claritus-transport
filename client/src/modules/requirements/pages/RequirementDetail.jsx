/**
 * One requirement: details, 8-stage progress, the next step and its history.
 * Stage forms (Enquiry, Quotations, ...) are added here step by step.
 */
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCheck, ClipboardList, History, ListChecks } from 'lucide-react';
import { Alert, Button, Card, Loader } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import DetailGrid from '../components/DetailGrid';
import DoneSoFar from '../components/DoneSoFar';
import HistoryList from '../components/HistoryList';
import RoutePlate from '../components/RoutePlate';
import StageBadge from '../components/StageBadge';
import StageStepper from '../components/StageStepper';
import StageAction from '../components/stages/StageAction';
import { getStage } from '../config/stages';
import { requirementsService } from '../services/requirementsService';
import { formatDate, formatDateTime, formatTonnes } from '../utils/format';

export default function RequirementDetail({ requirementRef, nav }) {
  const [requirement, setRequirement] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  // A stage form saved: show the fresh data from the server and a confirmation.
  const handleSaved = useCallback((updated) => {
    setRequirement(updated);
    setSaved(updated.history[0]?.message || 'Saved.');
  }, []);

  useEffect(() => {
    let cancelled = false;
    requirementsService
      .get(requirementRef)
      .then((data) => !cancelled && setRequirement(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [requirementRef]);

  const back = (
    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.toList} className="req-back">
      All requirements
    </Button>
  );

  if (error) {
    return (
      <div className="req-page">
        {back}
        <Alert tone="danger" title="Couldn’t open this requirement">
          {error}
        </Alert>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="req-page">
        {back}
        <Loader showLabel label="Loading requirement" />
      </div>
    );
  }

  const r = requirement;
  const nextStage = getStage(r.currentStage);

  return (
    <div className="req-page">
      {back}

      <header className="req-detail-head">
        <div>
          <h1 className="req-detail-title">
            {r.requirementNo}: {r.from.name} to {r.to.name}
          </h1>
          <p className="req-detail-sub">
            Created {formatDateTime(r.createdAt)} by {r.createdBy}
          </p>
        </div>
        <StageBadge requirement={r} />
      </header>

      <StageStepper currentStage={r.currentStage} />

      {saved && <Alert tone="success">{saved}</Alert>}

      <div className="req-two-col">
        <div className="req-stack">
          <Card
            title={r.status === 'open' && nextStage ? `Step ${nextStage.no} of 8: ${nextStage.label}` : 'Trip closed'}
            icon={ListChecks}
          >
            <StageAction requirement={r} onSaved={handleSaved} />
          </Card>

          <Card title="Requirement details" icon={ClipboardList}>
            <DetailGrid
              items={[
                { label: 'Material', value: r.material },
                { label: 'Quantity', value: formatTonnes(r.quantityTonnes) },
                { label: 'Vehicle type', value: `${r.vehicleType.name} (${r.vehicleType.capacityTonnes} t)` },
                { label: 'Loading date', value: formatDate(r.loadingDate) },
                { label: 'Delivery date', value: formatDate(r.deliveryDate) },
                { label: 'Sales order', value: r.salesOrderRef },
                { label: 'Coordinator', value: r.coordinator },
              ]}
            />
          </Card>
        </div>

        <div className="req-stack">
          <RoutePlate from={r.from.name} to={r.to.name} distanceKm={r.distanceKm} />
          <Card title="Done so far" icon={CheckCheck}>
            <DoneSoFar requirement={r} />
          </Card>
          <Card title="History" icon={History}>
            <HistoryList items={r.history} />
          </Card>
        </div>
      </div>
    </div>
  );
}
