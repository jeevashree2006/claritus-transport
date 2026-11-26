/**
 * Audit logs HTTP handlers. Read only: there is no create, edit or delete endpoint.
 */
import { sendSuccess } from '../../utils/response.js';
import * as auditService from './audit-logs.service.js';

const FILTER_KEYS = ['from', 'to', 'userId', 'module', 'action', 'q', 'page', 'pageSize'];

function readFilters(query) {
  const filters = {};
  for (const key of FILTER_KEYS) {
    if (typeof query[key] === 'string' && query[key] !== '') filters[key] = query[key];
  }
  return filters;
}

export async function list(req, res) {
  const data = await auditService.listAuditLogs(readFilters(req.query));
  return sendSuccess(res, { message: 'Audit log entries.', data });
}

export async function options(_req, res) {
  const data = await auditService.getFilterOptions();
  return sendSuccess(res, { message: 'Audit log filter options.', data });
}

// ---- Excel export ---------------------------------------------------------

/**
 * Every entry matching the filters (up to the export limit), as JSON. The browser turns it
 * into the .xlsx with the shared Excel helper (client/src/utils/exportExcel.js).
 * The export itself is recorded in the audit log.
 */
export async function exportEntries(req, res) {
  const filters = readFilters(req.query);
  const entries = await auditService.exportAuditLogs(filters);

  await auditService.recordAudit({
    req,
    module: 'audit_logs',
    action: 'exported',
    summary: `Exported ${entries.length} audit log ${entries.length === 1 ? 'entry' : 'entries'} to Excel`,
    newValues: { filters: { ...filters, page: undefined, pageSize: undefined }, rows: entries.length },
  });

  return sendSuccess(res, { message: 'Audit log export.', data: { entries } });
}
