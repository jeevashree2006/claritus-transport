/**
 * Requirements - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { ClipboardList } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function RequirementsPage() {
  return (
    <>
      <PageHeader title="Requirements" subtitle="Follow each requirement from enquiry and quotations to booking, delivery and payment" />
      <EmptyState
        icon={ClipboardList}
        title="This module is ready for development"
        description="The requirements screens will be built here."
      />
    </>
  );
}
