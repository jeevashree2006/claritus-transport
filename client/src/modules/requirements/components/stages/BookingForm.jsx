/**
 * Stage 5 - book the vehicle and driver with the approved transporter.
 */
import { useState } from 'react';
import { Clock, Phone, Truck, User } from 'lucide-react';
import { Alert, Button, Input } from '../../../../components/ui-kit';
import useStageSubmit from '../../hooks/useStageSubmit';
import { requirementsService } from '../../services/requirementsService';
import { formatMoney } from '../../utils/format';
import './StageForms.css';

const VEHICLE_NO_RE = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

export default function BookingForm({ requirement, onSaved }) {
  const approval = requirement.rateApproval;
  const [values, setValues] = useState({ vehicleNo: '', driverName: '', driverMobile: '', expectedReportingAt: '' });
  const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const vehicleNo = values.vehicleNo.trim().toUpperCase().replace(/\s+/g, ' ');
    const mobile = values.driverMobile.replace(/\D/g, '').slice(-10);
    const errors = {};
    if (!VEHICLE_NO_RE.test(vehicleNo)) errors.vehicleNo = 'Enter the vehicle number, like TN 70 AB 4521';
    if (!values.driverName.trim()) errors.driverName = 'Enter the driver’s name';
    if (!MOBILE_RE.test(mobile)) errors.driverMobile = 'Enter a 10-digit mobile number';
    if (Object.keys(errors).length) return setFieldErrors(errors);
    return submit(() =>
      requirementsService.bookVehicle(requirement.requirementNo, {
        vehicleNo,
        driverName: values.driverName.trim(),
        driverMobile: mobile,
        expectedReportingAt: values.expectedReportingAt,
      })
    );
  };

  return (
    <form className="stage-form" onSubmit={handleSubmit} noValidate>
      <p className="stage-form__intro">
        Booking with {approval.transporterName} at {formatMoney(approval.approvedRate)}.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="stage-form__grid">
        <Input
          label="Vehicle number"
          name="vehicleNo"
          icon={Truck}
          placeholder="TN 70 AB 4521"
          autoCapitalize="characters"
          value={values.vehicleNo}
          onChange={handleChange}
          error={fieldErrors.vehicleNo}
          disabled={submitting}
        />
        <Input
          label="Expected reporting time"
          name="expectedReportingAt"
          type="datetime-local"
          icon={Clock}
          value={values.expectedReportingAt}
          onChange={handleChange}
          error={fieldErrors.expectedReportingAt}
          disabled={submitting}
        />
        <Input
          label="Driver name"
          name="driverName"
          icon={User}
          placeholder="Murugan K"
          value={values.driverName}
          onChange={handleChange}
          error={fieldErrors.driverName}
          disabled={submitting}
        />
        <Input
          label="Driver mobile"
          name="driverMobile"
          type="tel"
          inputMode="tel"
          icon={Phone}
          placeholder="9840011223"
          value={values.driverMobile}
          onChange={handleChange}
          error={fieldErrors.driverMobile}
          disabled={submitting}
        />
      </div>

      <div className="stage-form__actions">
        <Button type="submit" icon={Truck} loading={submitting}>
          Book vehicle
        </Button>
      </div>
    </form>
  );
}
