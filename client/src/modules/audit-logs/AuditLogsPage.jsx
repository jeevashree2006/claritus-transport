/**
 * Audit log (FRD FR-CM-004): who did what and when, with the previous and new values.
 * Admin only. Read only - entries can't be edited or deleted, here or in the API.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Alert, Button, Card, Loader, PageHeader } from '../../components/ui-kit';
import { getErrorMessage } from '../../services/api';
import AuditEntryModal from './components/AuditEntryModal';
import AuditFilters from './components/AuditFilters';
import AuditLogTable from './components/AuditLogTable';
import { downloadAuditLogExcel, fetchAuditLogOptions, fetchAuditLogs } from './services/auditLogService';
import { dayBoundary } from './utils/auditFormat';
import './AuditLogsPage.css';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { from: '', to: '', userId: '', module: '', action: '', q: '' };

/** Form values -> API query (local dates become UTC instants for the whole local day). */
function toQuery(filters) {
  return {
    from: dayBoundary(filters.from),
    to: dayBoundary(filters.to, true),
    userId: filters.userId,
    module: filters.module,
    action: filters.action,
    q: filters.q.trim(),
  };
}

export default function AuditLogsPage() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState(null);
  const [result, setResult] = useState({ entries: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchAuditLogOptions()
      .then(setOptions)
      .catch(() => setOptions({ users: [], modules: [], actions: [] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchAuditLogs({ ...toQuery(applied), page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Couldn't load the audit log. Try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, page]);

  const apply = useCallback((filters) => {
    setApplied(filters);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    apply(EMPTY_FILTERS);
  };

  const exportExcel = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadAuditLogExcel(toQuery(applied));
    } catch (err) {
      setExportError(getErrorMessage(err, "Couldn't export the audit log. Try again."));
    } finally {
      setExporting(false);
    }
  };

  const closeEntry = useCallback(() => setSelected(null), []);

  const total = result.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const hasFilters = Object.values(applied).some(Boolean);

  return (
    <div className="audit-log">
      <p className="audit-log__eyebrow">Administration</p>
      <PageHeader
        title="Audit log"
        subtitle="Who did what and when, with the previous and new values. Entries cannot be edited or deleted."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportExcel} loading={exporting} disabled={total === 0}>
            Export Excel
          </Button>
        }
      />

      {exportError && <Alert tone="danger">{exportError}</Alert>}

      <Alert tone="info" title="What is audited server-side">
        Sign-ins (successful and failed), transporters (create, edit, activate or deactivate, bank details submitted,
        approved or rejected, with previous and new values; account numbers are masked), every requirement stage from
        the requirement history (created, enquiry, quotations, rate approval, booking, trip milestones, POD and
        payment), settings saves and resets (with previous and new values), and Excel exports of this log. Requirement
        history records what happened but not field-level previous values. AI agents are not audited yet; they will
        appear here once that module saves to the server.
      </Alert>

      <AuditFilters draft={draft} options={options} onChange={setDraft} onApply={apply} />

      <Card className="audit-log__results" bodyClassName="audit-log__results-body">
        {error ? (
          <div className="audit-log__state">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : loading && result.entries.length === 0 ? (
          <div className="audit-log__state">
            <Loader label="Loading audit log" />
          </div>
        ) : (
          <div className={loading ? 'audit-log__loading' : undefined} aria-busy={loading}>
            <AuditLogTable entries={result.entries} onOpen={setSelected} />
          </div>
        )}

        <footer className="audit-log__footer">
          <span className="audit-log__muted" aria-live="polite">
            {total === 0 ? 'No entries' : `Showing ${first}–${last} of ${total} entries`}
            {hasFilters && (
              <>
                {' · '}
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            )}
          </span>
          <div className="audit-log__pager">
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            />
            <span className="audit-log__muted">
              Page {page} of {pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronRight}
              aria-label="Next page"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        </footer>
      </Card>

      {selected && <AuditEntryModal entry={selected} onClose={closeEntry} />}
    </div>
  );
}
