/**
 * Stage 2 - choose the transporters to ask for a quote.
 * (Sending through WhatsApp comes with the Transportation Agent later.)
 */
import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, Button, Loader } from '../../../../components/ui-kit';
import { getErrorMessage } from '../../../../services/api';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import './StageForms.css';

export default function EnquiryForm({ requirement, onSaved }) {
  const [transporters, setTransporters] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState([]);
  const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  useEffect(() => {
    let cancelled = false;
    requirementsService
      .lookups()
      .then((data) => !cancelled && setTransporters(data.transporters))
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (fieldErrors.transporterIds) setFieldErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selected.length) return setFieldErrors({ transporterIds: 'Pick at least one transporter' });
    return submit(() => requirementsService.sendEnquiry(requirement.requirementNo, { transporterIds: selected }));
  };

  if (loadError) return <Alert tone="danger">{loadError}</Alert>;
  if (!transporters) return <Loader showLabel label="Loading transporters" />;

  // Transporters based in the loading city are listed first.
  const sorted = [...transporters].sort(
    (a, b) => (b.city === requirement.from.name) - (a.city === requirement.from.name) || a.name.localeCompare(b.name)
  );

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <p className="stage-form__intro">
        Pick the transporters to ask for a quote for {requirement.vehicleType.name}, {requirement.from.name} to{' '}
        {requirement.to.name}.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}

      <fieldset className="choice-list" aria-describedby={fieldErrors.transporterIds ? 'enq-err' : undefined}>
        <legend className="sr-only">Transporters</legend>
        {sorted.map((t) => {
          const checked = selected.includes(t.id);
          return (
            <label key={t.id} className={`choice${checked ? ' choice--checked' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} disabled={submitting} />
              <span className="choice__text">
                <span className="choice__title">{t.name}</span>
                <span className="choice__sub">
                  {t.city} · {t.contactPerson} · {t.whatsapp}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {fieldErrors.transporterIds && (
        <p id="enq-err" className="stage-form__error">
          {fieldErrors.transporterIds}
        </p>
      )}

      <div className="stage-form__actions">
        <Button type="submit" icon={Send} loading={submitting}>
          Send enquiry{selected.length ? ` to ${selected.length}` : ''}
        </Button>
      </div>
    </form>
  );
}
