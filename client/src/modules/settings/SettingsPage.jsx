/**
 * Settings module entry point (route /settings, administrators only).
 * Business rules that the PRD says must be configured, not hardcoded. One tab per section;
 * the open tab is kept in the query string (/settings?tab=trips) so no routing file changes.
 * Unsaved edits are kept per tab while switching tabs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Alert, Button, Loader, Modal, PageHeader } from '../../components/ui-kit';
import { getErrorMessage } from '../../services/api';
import SectionCard from './components/SectionCard';
import SettingsTabs from './components/SettingsTabs';
import { getFieldErrors, settingsService } from './services/settingsService';
import { fromDraft, isChanged, toDraft } from './utils/settingValues';
import './SettingsPage.css';

const draftsFor = (section) => Object.fromEntries(section.settings.map((s) => [s.key, toDraft(s, s.value)]));

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const [sections, setSections] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [drafts, setDrafts] = useState({}); // { sectionKey: { settingKey: draft } }
  const [errors, setErrors] = useState({}); // { sectionKey: { fieldKey: message } }
  const [busy, setBusy] = useState({ section: null, action: null });
  const [notice, setNotice] = useState(null); // { tone, text }
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const list = await settingsService.list();
      setSections(list);
      setDrafts(Object.fromEntries(list.map((s) => [s.key, draftsFor(s)])));
    } catch (error) {
      setLoadError(getErrorMessage(error, "Couldn't load the settings."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeKey = sections?.some((s) => s.key === params.get('tab')) ? params.get('tab') : sections?.[0]?.key;
  const active = sections?.find((s) => s.key === activeKey);

  const dirtyKeys = useMemo(() => {
    const keys = new Set();
    for (const section of sections || []) {
      const sectionDrafts = drafts[section.key];
      if (sectionDrafts && section.settings.some((s) => isChanged(s, sectionDrafts[s.key]))) keys.add(section.key);
    }
    return keys;
  }, [sections, drafts]);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (dirtyKeys.size === 0) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtyKeys]);

  const selectTab = (key) => {
    setNotice(null);
    setParams({ tab: key }, { replace: true });
  };

  const changeDraft = (settingKey, next) => {
    setDrafts((prev) => ({
      ...prev,
      [activeKey]: { ...prev[activeKey], [settingKey]: next },
    }));
    setErrors((prev) => {
      const current = prev[activeKey];
      if (!current) return prev;
      const remaining = Object.fromEntries(
        Object.entries(current).filter(([k]) => k !== settingKey && !k.startsWith(`${settingKey}.`)),
      );
      return { ...prev, [activeKey]: remaining };
    });
  };

  const applySection = (updated) => {
    setSections((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    setDrafts((prev) => ({ ...prev, [updated.key]: draftsFor(updated) }));
    setErrors((prev) => ({ ...prev, [updated.key]: {} }));
  };

  const save = async () => {
    const section = active;
    const sectionDrafts = drafts[section.key];
    // Send only what changed; the server keeps everything else as it is.
    const values = Object.fromEntries(
      section.settings
        .filter((s) => isChanged(s, sectionDrafts[s.key]))
        .map((s) => [s.key, fromDraft(s, sectionDrafts[s.key])]),
    );
    setBusy({ section: section.key, action: 'save' });
    setNotice(null);
    try {
      const result = await settingsService.save(section.key, values);
      applySection(result.section);
      setNotice({ tone: 'success', text: result.message });
    } catch (error) {
      setErrors((prev) => ({ ...prev, [section.key]: getFieldErrors(error) }));
      setNotice({
        tone: 'danger',
        text: getErrorMessage(error, "Couldn't save the settings."),
      });
    } finally {
      setBusy({ section: null, action: null });
    }
  };

  const reset = async () => {
    const section = active;
    setConfirmReset(false);
    setBusy({ section: section.key, action: 'reset' });
    setNotice(null);
    try {
      const result = await settingsService.reset(section.key);
      applySection(result.section);
      setNotice({ tone: 'success', text: result.message });
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: getErrorMessage(error, "Couldn't reset the settings."),
      });
    } finally {
      setBusy({ section: null, action: null });
    }
  };

  const header = (
    <PageHeader
      title="Settings"
      subtitle="Business rules used across the transport flow. Changes are recorded in the audit log."
    />
  );

  if (loadError) {
    return (
      <>
        {header}
        <Alert tone="danger" title="Settings did not load">
          {loadError}
        </Alert>
        <div className="settings-retry">
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (!sections) {
    return (
      <>
        {header}
        <Loader label="Loading settings" showLabel />
      </>
    );
  }

  const isBusy = busy.section === active.key;

  return (
    <>
      {header}
      <SettingsTabs sections={sections} activeKey={activeKey} dirtyKeys={dirtyKeys} onSelect={selectTab} />

      <div
        id={`settings-panel-${active.key}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${active.key}`}
        className="settings-panel"
      >
        {notice && (
          <Alert tone={notice.tone} className="settings-notice">
            {notice.text}
          </Alert>
        )}
        <SectionCard
          key={active.key}
          section={active}
          drafts={drafts[active.key]}
          errors={errors[active.key] || {}}
          dirty={dirtyKeys.has(active.key)}
          saving={isBusy && busy.action === 'save'}
          resetting={isBusy && busy.action === 'reset'}
          onChange={changeDraft}
          onSave={save}
          onReset={() => setConfirmReset(true)}
        />
      </div>

      {confirmReset && (
        <Modal
          title="Reset section to defaults?"
          size="sm"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="danger" icon={RotateCcw} onClick={reset}>
                Reset to defaults
              </Button>
            </>
          }
        >
          <p className="settings-modal-text">
            Every setting in <strong>{active.title}</strong> goes back to its default value, and any unsaved edits on
            this tab are discarded. The change is recorded in the audit log.
          </p>
        </Modal>
      )}
    </>
  );
}
