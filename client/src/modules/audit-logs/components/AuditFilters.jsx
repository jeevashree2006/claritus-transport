import { Search } from 'lucide-react';
import { Button, Card, Input, Select } from '../../../components/ui-kit';
import { actionLabel, moduleLabel, roleLabel } from '../utils/auditFormat';

/**
 * Filter card. Dropdowns apply at once; the record search applies on Search / Enter.
 * `draft` is what's typed; `onApply` is called with the filters to load.
 */
export default function AuditFilters({ draft, options, onChange, onApply }) {
  const userOptions = [
    { value: '', label: 'All users' },
    ...(options?.users || []).map((u) => ({ value: String(u.id), label: `${u.name} (${roleLabel(u.role)})` })),
  ];

  const moduleOptions = [
    { value: '', label: 'All modules' },
    ...(options?.modules || []).map((m) => ({ value: m, label: moduleLabel(m) })),
  ];

  // Actions follow the chosen module; the same code in two modules shows once.
  const actions = (options?.actions || []).filter((a) => !draft.module || a.module === draft.module);
  const actionOptions = [
    { value: '', label: 'All actions' },
    ...[...new Set(actions.map((a) => a.action))]
      .map((a) => ({ value: a, label: actionLabel(a) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  const set = (key) => (event) => {
    const next = { ...draft, [key]: event.target.value };
    if (key === 'module') next.action = ''; // the old action may not exist in the new module
    onChange(next);
    if (key !== 'q') onApply(next);
  };

  const submit = (event) => {
    event.preventDefault();
    onApply(draft);
  };

  return (
    <Card className="audit-filters">
      <form onSubmit={submit} className="audit-filters__form" role="search" aria-label="Filter audit log">
        <div className="audit-filters__grid">
          <Input label="From" type="date" value={draft.from} max={draft.to || undefined} onChange={set('from')} />
          <Input label="To" type="date" value={draft.to} min={draft.from || undefined} onChange={set('to')} />
          <Select label="User" options={userOptions} value={draft.userId} onChange={set('userId')} />
          <Select label="Module" options={moduleOptions} value={draft.module} onChange={set('module')} />
          <Select label="Action" options={actionOptions} value={draft.action} onChange={set('action')} />
        </div>
        <div className="audit-filters__search">
          <Input
            label="Trip / record id"
            icon={Search}
            placeholder="e.g. REQ-0001"
            value={draft.q}
            onChange={set('q')}
            className="audit-filters__search-input"
          />
          <Button type="submit">Search</Button>
        </div>
      </form>
    </Card>
  );
}
