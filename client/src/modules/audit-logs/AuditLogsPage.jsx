/**
 * Audit logs - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { History } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function AuditLogsPage() {
  return (
    <>
      <PageHeader title="Audit logs" subtitle="See who did what and when, across users and AI agents" />
      <EmptyState
        icon={History}
        title="This module is ready for development"
        description="The audit logs screens will be built here."
      />
    </>
  );
}
