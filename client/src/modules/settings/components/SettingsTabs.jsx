/**
 * Tab strip across the top of the Settings page. A dot marks a tab with unsaved changes.
 */
import { Button } from '../../../components/ui-kit';

export default function SettingsTabs({ sections, activeKey, dirtyKeys, onSelect }) {
  return (
    <div className="settings-tabs" role="tablist" aria-label="Settings sections">
      {sections.map((section) => {
        const active = section.key === activeKey;
        const dirty = dirtyKeys.has(section.key);
        return (
          <Button
            key={section.key}
            variant="ghost"
            role="tab"
            id={`settings-tab-${section.key}`}
            aria-selected={active}
            aria-controls={`settings-panel-${section.key}`}
            tabIndex={active ? 0 : -1}
            className={['settings-tabs__tab', active && 'settings-tabs__tab--active'].filter(Boolean).join(' ')}
            onClick={() => onSelect(section.key)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              const index = sections.findIndex((s) => s.key === section.key);
              const next = sections[(index + (e.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length];
              onSelect(next.key);
              document.getElementById(`settings-tab-${next.key}`)?.focus();
            }}
          >
            {section.title}
            {dirty && <span className="settings-tabs__dot" aria-label="Unsaved changes" role="img" />}
          </Button>
        );
      })}
    </div>
  );
}
