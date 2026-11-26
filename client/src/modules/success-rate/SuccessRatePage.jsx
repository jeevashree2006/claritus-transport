/**
 * Success rate - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { ChartColumnBig } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function SuccessRatePage() {
  return (
    <>
      <PageHeader title="Success rate" subtitle="Review transporter reply rates and how often each AI agent succeeds" />
      <EmptyState
        icon={ChartColumnBig}
        title="This module is ready for development"
        description="The success rate screens will be built here."
      />
    </>
  );
}
