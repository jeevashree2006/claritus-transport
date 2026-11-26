/**
 * Transporters - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { Truck } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function TransportersPage() {
  return (
    <>
      <PageHeader title="Transporters" subtitle="Manage transporters, their vehicles, routes and contact details" />
      <EmptyState
        icon={Truck}
        title="This module is ready for development"
        description="The transporters screens will be built here."
      />
    </>
  );
}
