/**
 * Agent workflow - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { Bot } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function AgentWorkflowPage() {
  return (
    <>
      <PageHeader title="Agent workflow" subtitle="See which AI agent helps at each stage (sourcing, follow-up, POD, payment) and where a person must approve" />
      <EmptyState
        icon={Bot}
        title="This module is ready for development"
        description="The agent workflow screens will be built here."
      />
    </>
  );
}
