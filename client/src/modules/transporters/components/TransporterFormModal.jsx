/**
 * Add / edit transporter dialog (FRD FR-TR-002 to FR-TR-005, FR-TR-008).
 * Onboarding collects contact and bank details only. Driver licence and vehicle
 * documents belong to trip verification, never here.
 *
 *   {open && <TransporterFormModal transporter={t} onClose={...} onSaved={(t, message) => ...} />}
 *   Leave out `transporter` to add a new one.
 */
import { useState } from 'react';
import { Alert, Button, Input, Modal } from '../../../components/ui-kit';
import { getErrorMessage } from '../../../services/api';
import { getFieldErrors, transportersService } from '../services/transportersService';

function initialValues(t) {
  // While a bank change is waiting (or was rejected), edit those values; otherwise the live ones.
  const bank = t?.bank?.pending || t?.bank?.live || {};
  return {
    name: t?.name || '',
    contactPerson: t?.contactPerson || '',
    mobile: t?.mobile || '',
    whatsapp: t?.whatsapp || '',
    city: t?.city || '',
    address: t?.address || '',
    regularRoutes: t?.regularRoutes || '',
    accountHolder: bank.accountHolder || '',
    bankName: bank.bankName || '',
    accountNumber: bank.accountNumber || '',
    ifsc: bank.ifsc || '',
  };
}

export default function TransporterFormModal({ transporter, onClose, onSaved }) {
  const isEdit = Boolean(transporter);
  const [values, setValues] = useState(() => initialValues(transporter));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      const { value } = e.target;
      setValues((v) => ({ ...v, [name]: value }));
      if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
    },
  });

  // Most transporters use the same number for calls and WhatsApp: fill it in once.
  const copyMobileToWhatsapp = () => {
    if (!values.whatsapp && values.mobile) setValues((v) => ({ ...v, whatsapp: v.mobile }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      name: values.name,
      contactPerson: values.contactPerson,
      mobile: values.mobile,
      whatsapp: values.whatsapp,
      city: values.city,
      address: values.address,
      regularRoutes: values.regularRoutes,
      bank: {
        accountHolder: values.accountHolder,
        bankName: values.bankName,
        accountNumber: values.accountNumber,
        ifsc: values.ifsc,
      },
    };
    try {
      const result = isEdit
        ? await transportersService.update(transporter.code, payload)
        : await transportersService.create(payload);
      onSaved(result.transporter, result.message);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length ? '' : getErrorMessage(error));
      setSaving(false);
    }
  }

  const bankPending = transporter?.bank?.status === 'pending';

  return (
    <Modal
      title={isEdit ? `Edit ${transporter.name}` : 'Add transporter'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="transporter-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Save transporter'}
          </Button>
        </>
      }
    >
      <form id="transporter-form" className="tr-form" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Input label="Company name" placeholder="Sri Murugan Transports" autoComplete="organization" {...field('name')} />
        <Input label="Contact person" placeholder="Senthil Kumar" autoComplete="name" {...field('contactPerson')} />
        <div className="tr-form__row">
          <Input
            label="Mobile number"
            placeholder="98400 12345"
            inputMode="tel"
            autoComplete="tel"
            onBlur={copyMobileToWhatsapp}
            {...field('mobile')}
          />
          <Input label="WhatsApp number" placeholder="98400 12345" inputMode="tel" {...field('whatsapp')} />
        </div>
        <div className="tr-form__row">
          <Input label="City (optional)" placeholder="Chennai" autoComplete="address-level2" {...field('city')} />
          <Input label="Address (optional)" placeholder="Street, area" autoComplete="street-address" {...field('address')} />
        </div>
        <Input
          label="Regular routes (optional)"
          placeholder="Chennai – Bengaluru, Hosur – Pune"
          hint="Routes this transporter usually serves. Separate them with commas."
          {...field('regularRoutes')}
        />

        <hr className="tr-form__divider" />
        <h3 className="tr-form__section">Bank details</h3>
        {bankPending && (
          <Alert tone="warning">
            A bank change is already waiting for approval. Saving different details replaces that request.
          </Alert>
        )}
        <Input label="Account holder name" autoComplete="off" {...field('accountHolder')} />
        <Input label="Bank name" autoComplete="off" {...field('bankName')} />
        <div className="tr-form__row">
          <Input label="Account number" inputMode="numeric" autoComplete="off" {...field('accountNumber')} />
          <Input
            label="IFSC"
            placeholder="HDFC0001234"
            autoComplete="off"
            {...field('ifsc')}
            onChange={(e) => field('ifsc').onChange({ target: { value: e.target.value.toUpperCase() } })}
          />
        </div>
        <p className="tr-form__note">
          Bank details need a second approval before they can be used for payments. Leave all four empty if you don’t
          have them yet.
        </p>
      </form>
    </Modal>
  );
}
