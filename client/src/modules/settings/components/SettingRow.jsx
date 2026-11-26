/**
 * One setting: label, pills and help on the left; the control with "In force" and
 * "Default" underneath on the right.
 */
import { useId } from 'react';
import { Badge } from '../../../components/ui-kit';
import { describeValue } from '../utils/settingValues';
import SettingControl from './SettingControl';

export default function SettingRow({ setting, draft, onChange, errors, disabled }) {
  const labelId = useId();

  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <h3 id={labelId} className="settings-row__label">
          {setting.label}
        </h3>
        <div className="settings-row__pills">
          {setting.frd && <Badge tone="neutral">{setting.frd}</Badge>}
          {setting.tbc && <Badge tone="warning">TBC with client</Badge>}
          {setting.notUsedYet && <Badge tone="info">Stored – not used yet</Badge>}
        </div>
        {setting.help && <p className="settings-row__help">{setting.help}</p>}
      </div>

      <div className="settings-row__control">
        <SettingControl
          setting={setting}
          draft={draft}
          onChange={onChange}
          errors={errors}
          disabled={disabled}
          labelId={labelId}
        />
        <p className="settings-row__values">
          <span>
            <span className="settings-row__values-label">In force:</span> {describeValue(setting, setting.value)}
          </span>
          <span>
            <span className="settings-row__values-label">Default:</span> {describeValue(setting, setting.default)}
          </span>
        </p>
      </div>
    </div>
  );
}
