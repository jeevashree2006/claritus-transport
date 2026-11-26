/**
 * Settings - placeholder. Ready for development.
 * Build this module's screens here (components/, data/, services/ inside this folder).
 */
import { Settings } from 'lucide-react';
import { EmptyState, PageHeader } from '../../components/ui-kit';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage users, roles and application preferences" />
      <EmptyState
        icon={Settings}
        title="This module is ready for development"
        description="The settings screens will be built here."
      />
    </>
  );
}
