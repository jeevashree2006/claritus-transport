/**
 * Step 1 - create a requirement. Saved to MySQL through POST /api/requirements.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, FileText, Package, Weight } from 'lucide-react';
import { Alert, Button, Card, Input, Loader, PageHeader, Select } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import RoutePlate from '../components/RoutePlate';
import { getFieldErrors, requirementsService } from '../services/requirementsService';
import { todayIso } from '../utils/format';

const EMPTY = {
  fromLocationId: '',
  toLocationId: '',
  material: '',
  quantityTonnes: '',
  vehicleTypeId: '',
  loadingDate: '',
  deliveryDate: '',
  salesOrderRef: '',
};

/** Same rules as the server, so most mistakes show before submitting. */
function validate(v) {
  const e = {};
  if (!v.fromLocationId) e.fromLocationId = 'Choose the loading location';
  if (!v.toLocationId) e.toLocationId = 'Choose the destination';
  else if (v.toLocationId === v.fromLocationId) e.toLocationId = 'Destination must be different from the loading location';
  if (!v.material.trim()) e.material = 'Enter the material';
  if (!(Number(v.quantityTonnes) > 0)) e.quantityTonnes = 'Enter the quantity in tonnes';
  if (!v.vehicleTypeId) e.vehicleTypeId = 'Choose a vehicle type';
  if (!v.loadingDate) e.loadingDate = 'Choose the loading date';
  if (v.deliveryDate && v.loadingDate && v.deliveryDate < v.loadingDate) {
    e.deliveryDate = 'Delivery date can’t be before the loading date';
  }
  return e;
}

const FIELD_ORDER = Object.keys(EMPTY);

export default function RequirementCreate({ nav }) {
  const [lookups, setLookups] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [distance, setDistance] = useState({ km: null, loading: false });
  const formRef = useRef(null);

  // Lookups (locations, vehicle types) from the database
  useEffect(() => {
    let cancelled = false;
    requirementsService
      .lookups()
      .then((data) => !cancelled && setLookups(data))
      .catch((err) => !cancelled && setLookupError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Live distance preview when both places are chosen
  useEffect(() => {
    const { fromLocationId: from, toLocationId: to } = values;
    if (!from || !to || from === to) {
      setDistance({ km: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setDistance((d) => ({ ...d, loading: true }));
    requirementsService
      .distance(from, to)
      .then((data) => !cancelled && setDistance({ km: data.distanceKm, loading: false }))
      .catch(() => !cancelled && setDistance({ km: null, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [values.fromLocationId, values.toLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const locationOptions = useMemo(
    () => (lookups?.locations || []).map((l) => ({ value: String(l.id), label: l.state ? `${l.name}, ${l.state}` : l.name })),
    [lookups]
  );
  const vehicleOptions = useMemo(
    () => (lookups?.vehicleTypes || []).map((v) => ({ value: String(v.id), label: `${v.name} (${v.capacityTonnes} t)` })),
    [lookups]
  );
  const nameOf = (id) => lookups?.locations.find((l) => String(l.id) === id)?.name;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError('');
  };

  const focusFirstError = (errs) => {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) formRef.current?.querySelector(`[name="${first}"]`)?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return focusFirstError(nextErrors);

    setSubmitting(true);
    setServerError('');
    try {
      const created = await requirementsService.create({
        ...values,
        fromLocationId: Number(values.fromLocationId),
        toLocationId: Number(values.toLocationId),
        vehicleTypeId: Number(values.vehicleTypeId),
        quantityTonnes: Number(values.quantityTonnes),
      });
      nav.toDetail(created.requirementNo);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors(fieldErrors);
      setServerError(getErrorMessage(err));
      focusFirstError(fieldErrors);
      setSubmitting(false);
    }
  };

  return (
    <div className="req-page">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.toList} className="req-back">
        All requirements
      </Button>
      <PageHeader title="New requirement" subtitle="Step 1 of 8: describe the load and where it goes" />

      {lookupError && <Alert tone="danger">{lookupError}</Alert>}

      {!lookups && !lookupError ? (
        <Loader showLabel label="Loading form" />
      ) : (
        lookups && (
          <div className="req-two-col">
            <Card title="Requirement details">
              <form ref={formRef} className="req-form" onSubmit={handleSubmit} noValidate>
                {serverError && <Alert tone="danger">{serverError}</Alert>}

                <div className="req-form-grid">
                  <Select
                    label="Loading location"
                    name="fromLocationId"
                    placeholder="Choose a place"
                    options={locationOptions}
                    value={values.fromLocationId}
                    onChange={handleChange}
                    error={errors.fromLocationId}
                    disabled={submitting}
                  />
                  <Select
                    label="Destination"
                    name="toLocationId"
                    placeholder="Choose a place"
                    options={locationOptions}
                    value={values.toLocationId}
                    onChange={handleChange}
                    error={errors.toLocationId}
                    disabled={submitting}
                  />
                </div>

                <Input
                  label="Material"
                  name="material"
                  icon={Package}
                  placeholder="Packaged FMCG goods"
                  maxLength={200}
                  value={values.material}
                  onChange={handleChange}
                  error={errors.material}
                  disabled={submitting}
                />

                <div className="req-form-grid">
                  <Input
                    label="Quantity (tonnes)"
                    name="quantityTonnes"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    icon={Weight}
                    placeholder="8"
                    value={values.quantityTonnes}
                    onChange={handleChange}
                    error={errors.quantityTonnes}
                    disabled={submitting}
                  />
                  <Select
                    label="Vehicle type"
                    name="vehicleTypeId"
                    placeholder="Choose a vehicle"
                    options={vehicleOptions}
                    value={values.vehicleTypeId}
                    onChange={handleChange}
                    error={errors.vehicleTypeId}
                    disabled={submitting}
                  />
                </div>

                <div className="req-form-grid">
                  <Input
                    label="Loading date"
                    name="loadingDate"
                    type="date"
                    icon={Calendar}
                    min={todayIso()}
                    value={values.loadingDate}
                    onChange={handleChange}
                    error={errors.loadingDate}
                    disabled={submitting}
                  />
                  <Input
                    label={
                      <>
                        Delivery date <span className="req-optional">(optional)</span>
                      </>
                    }
                    name="deliveryDate"
                    type="date"
                    icon={Calendar}
                    min={values.loadingDate || todayIso()}
                    value={values.deliveryDate}
                    onChange={handleChange}
                    error={errors.deliveryDate}
                    disabled={submitting}
                  />
                </div>

                <Input
                  label={
                    <>
                      Sales order reference <span className="req-optional">(optional)</span>
                    </>
                  }
                  name="salesOrderRef"
                  icon={FileText}
                  placeholder="SO-2026-1182"
                  maxLength={60}
                  value={values.salesOrderRef}
                  onChange={handleChange}
                  error={errors.salesOrderRef}
                  disabled={submitting}
                />

                <div className="req-form-actions">
                  <Button variant="secondary" onClick={nav.toList} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {submitting ? 'Creating…' : 'Create requirement'}
                  </Button>
                </div>
              </form>
            </Card>

            <RoutePlate
              from={nameOf(values.fromLocationId)}
              to={nameOf(values.toLocationId)}
              distanceKm={distance.km}
              loading={distance.loading}
              note="Distance is estimated from map coordinates until a routing service is chosen."
            />
          </div>
        )
      )}
    </div>
  );
}
