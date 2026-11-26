/**
 * The input for one setting, chosen by its type (see server settings.definitions.js).
 * `draft` is the editable value from utils/settingValues.toDraft; `onChange(nextDraft)`.
 * `errors` holds the API field errors keyed '<settingKey>' or '<settingKey>.<sub>'.
 */
import { useId } from 'react';
import { Input, Select } from '../../../components/ui-kit';
import { numberHint } from '../utils/settingValues';

function Checkbox({ label, checked, onChange, disabled, note }) {
  return (
    <label className="settings-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="settings-check__text">
        <span className="settings-check__label">{label}</span>
        {note && <span className="settings-check__note">{note}</span>}
      </span>
    </label>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

/** Splits fields into runs of the same type, keeping definition order: [[bool, bool], [num, num]]. */
function runsOf(fields) {
  const runs = [];
  for (const field of fields) {
    const last = runs[runs.length - 1];
    if (last && last[0].type === field.type) last.push(field);
    else runs.push([field]);
  }
  return runs;
}

/** Number + boolean inputs of a 'fields' setting or one group of a 'groups' setting, in definition order. */
function FieldInputs({ fields, draft, onChange, errors, errorPrefix, disabled, labelSuffix = '' }) {
  return (
    <div className="settings-fields">
      {runsOf(fields).map((run) =>
        run[0].type === 'boolean' ? (
          <div key={run[0].key} className="settings-fields__checks">
            {run.map((f) => (
              <div key={f.key}>
                <Checkbox
                  label={f.label}
                  checked={Boolean(draft[f.key])}
                  onChange={(v) => onChange({ ...draft, [f.key]: v })}
                  disabled={disabled}
                />
                <FieldError message={errors[`${errorPrefix}.${f.key}`]} />
              </div>
            ))}
          </div>
        ) : (
          <NumberRun
            key={run[0].key}
            run={run}
            draft={draft}
            onChange={onChange}
            errors={errors}
            errorPrefix={errorPrefix}
            disabled={disabled}
            labelSuffix={labelSuffix}
          />
        ),
      )}
    </div>
  );
}

function NumberRun({ run, draft, onChange, errors, errorPrefix, disabled, labelSuffix }) {
  return (
    <div className="settings-fields__numbers">
      {run.map((f) => (
        <Input
          key={f.key}
          type="number"
          inputMode={f.integer === false ? 'decimal' : 'numeric'}
          label={f.label}
          aria-label={labelSuffix ? `${f.label} – ${labelSuffix}` : undefined}
          min={f.min}
          max={f.max}
          step={f.step || 1}
          value={draft[f.key]}
          onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
          hint={numberHint(f)}
          error={errors[`${errorPrefix}.${f.key}`]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export default function SettingControl({ setting, draft, onChange, errors, disabled, labelId }) {
  const errorId = useId();
  const error = errors[setting.key];
  const defaults = setting.default;

  switch (setting.type) {
    case 'number':
      return (
        <Input
          type="number"
          inputMode={setting.integer === false ? 'decimal' : 'numeric'}
          aria-labelledby={labelId}
          min={setting.min}
          max={setting.max}
          step={setting.step || 1}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          hint={numberHint(setting)}
          error={error}
          disabled={disabled}
        />
      );

    case 'text':
      return (
        <Input
          aria-labelledby={labelId}
          maxLength={setting.maxLength}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          disabled={disabled}
        />
      );

    case 'select':
      return (
        <Select
          aria-labelledby={labelId}
          options={setting.options}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          disabled={disabled}
        />
      );

    case 'boolean':
      return (
        <div role="group" aria-labelledby={labelId}>
          <Checkbox label={draft ? 'On' : 'Off'} checked={Boolean(draft)} onChange={onChange} disabled={disabled} />
          <FieldError id={errorId} message={error} />
        </div>
      );

    case 'list':
      return (
        <div className={['field', error && 'field--error'].filter(Boolean).join(' ')}>
          <textarea
            className="settings-textarea"
            aria-labelledby={labelId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            rows={Math.min(Math.max(draft.split('\n').length + 2, 5), 14)}
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          {error ? <FieldError id={errorId} message={error} /> : <p className="field__hint">One per line</p>}
        </div>
      );

    case 'multi': {
      const picked = new Set(draft);
      const toggle = (value, on) => {
        const next = new Set(picked);
        if (on) next.add(value);
        else next.delete(value);
        onChange(setting.options.map((o) => o.value).filter((v) => next.has(v)));
      };
      return (
        <div role="group" aria-labelledby={labelId}>
          <div className="settings-checks">
            {setting.options.map((o) => (
              <Checkbox
                key={o.value}
                label={o.label}
                checked={picked.has(o.value)}
                onChange={(on) => toggle(o.value, on)}
                disabled={disabled}
              />
            ))}
          </div>
          <FieldError id={errorId} message={error} />
        </div>
      );
    }

    case 'checklist': {
      const picked = new Set(draft);
      const defaultSet = new Set(defaults);
      const order = setting.groups.flatMap((g) => g.items.map((i) => i.value));
      const toggle = (value, on) => {
        const next = new Set(picked);
        if (on) next.add(value);
        else next.delete(value);
        onChange(order.filter((v) => next.has(v)));
      };
      return (
        <div role="group" aria-labelledby={labelId} className="settings-groups">
          {setting.groups.map((group) => (
            <fieldset key={group.label} className="settings-group">
              <legend className="settings-group__legend">{group.label}</legend>
              <div className="settings-checks settings-checks--grid">
                {group.items.map((item) => (
                  <Checkbox
                    key={item.value}
                    label={item.label}
                    note={defaultSet.has(item.value) ? 'Mandatory by default' : 'Optional by default'}
                    checked={picked.has(item.value)}
                    onChange={(on) => toggle(item.value, on)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </fieldset>
          ))}
          <FieldError id={errorId} message={error} />
        </div>
      );
    }

    case 'fields':
      return (
        <div role="group" aria-labelledby={labelId} className="settings-group settings-group--plain">
          <FieldInputs
            fields={setting.fields}
            draft={draft}
            onChange={onChange}
            errors={errors}
            errorPrefix={setting.key}
            disabled={disabled}
          />
          <FieldError id={errorId} message={error} />
        </div>
      );

    case 'groups':
      return (
        <div role="group" aria-labelledby={labelId} className="settings-groups">
          {setting.groups.map((group) => (
            <fieldset key={group.key} className="settings-group">
              <legend className="settings-group__legend">{group.label}</legend>
              <FieldInputs
                fields={group.fields}
                draft={draft[group.key]}
                onChange={(next) => onChange({ ...draft, [group.key]: next })}
                errors={errors}
                errorPrefix={`${setting.key}.${group.key}`}
                disabled={disabled}
                labelSuffix={group.label}
              />
            </fieldset>
          ))}
          <FieldError id={errorId} message={error} />
        </div>
      );

    default:
      return null;
  }
}
