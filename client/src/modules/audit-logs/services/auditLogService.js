/**
 * Audit logs API. Read only - the server has no edit or delete endpoint.
 */
import api from '../../../services/api';
import { downloadExcel, fileDate } from '../../../utils/exportExcel';
import { actionLabel, moduleLabel, roleLabel } from '../utils/auditFormat';

/** Drops empty filters so they don't end up in the query string. */
function clean(filters = {}) {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}

export async function fetchAuditLogs(filters) {
  const { data } = await api.get('/audit-logs', { params: clean(filters) });
  return data.data; // { entries, page, pageSize, total }
}

export async function fetchAuditLogOptions() {
  const { data } = await api.get('/audit-logs/options');
  return data.data; // { users, modules, actions }
}

const EXPORT_COLUMNS = [
  { header: 'When', value: (e) => e.createdAt, type: 'datetime' },
  { header: 'User', value: (e) => e.user?.name || 'System' },
  { header: 'Role', value: (e) => (e.user ? roleLabel(e.user.role) : '') },
  { header: 'Module', value: (e) => moduleLabel(e.module) },
  { header: 'Action', value: (e) => actionLabel(e.action) },
  { header: 'Summary', value: (e) => e.summary },
  { header: 'Record type', value: (e) => e.recordType },
  { header: 'Record id', value: (e) => e.recordId },
  { header: 'Record', value: (e) => e.recordLabel },
  { header: 'Stage', value: (e) => e.stage?.label },
  { header: 'Previous values', value: (e) => e.oldValues },
  { header: 'New values', value: (e) => e.newValues },
  { header: 'IP', value: (e) => e.ip },
];

/** Downloads every entry for the current filters as an Excel file (the server records the export). */
export async function downloadAuditLogExcel(filters) {
  const { data } = await api.get('/audit-logs/export', { params: clean(filters), timeout: 60000 });
  downloadExcel(`audit-log-${fileDate()}.xlsx`, EXPORT_COLUMNS, data.data.entries, { sheetName: 'Audit log' });
}
