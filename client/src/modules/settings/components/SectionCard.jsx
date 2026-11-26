/**
 * One settings tab: header with last change and the reset / save buttons, then one row per setting.
 */
import { RotateCcw, Save } from 'lucide-react';
import { Button, Card } from '../../../components/ui-kit';
import { formatDateTime } from '../utils/settingValues';
import SettingRow from './SettingRow';

function lastChangedText(lastChanged) {
  if (!lastChanged) return 'Never changed – default values in force';
  const verb = lastChanged.action === 'reset' ? 'Reset to defaults' : 'Last changed';
  return `${verb} by ${lastChanged.by} on ${formatDateTime(lastChanged.at)}`;
}

export default function SectionCard({ section, drafts, errors, dirty, saving, resetting, onChange, onSave, onReset }) {
  const busy = saving || resetting;
  const anyOverridden = section.settings.some((s) => s.overridden);

  return (
    <Card className="settings-card" bodyClassName="settings-card__body">
      <header className="settings-card__header">
        <div>
          <h2 className="settings-card__title">{section.title}</h2>
          <p className="settings-card__meta">{lastChangedText(section.lastChanged)}</p>
        </div>
        <div className="settings-card__actions">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={onReset}
            loading={resetting}
            disabled={saving || (!anyOverridden && !dirty)}
          >
            Reset section to defaults
          </Button>
          <Button icon={Save} onClick={onSave} loading={saving} disabled={!dirty || resetting}>
            Save section
          </Button>
        </div>
      </header>

      <p className="settings-card__description">{section.description}</p>

      <form
        className="settings-card__rows"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && !busy) onSave();
        }}
        noValidate
      >
        {section.settings.map((setting) => (
          <SettingRow
            key={setting.key}
            setting={setting}
            draft={drafts[setting.key]}
            onChange={(next) => onChange(setting.key, next)}
            errors={errors}
            disabled={busy}
          />
        ))}
      </form>
    </Card>
  );
}
