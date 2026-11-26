/** Status pills used by the Transporters screens. */
import { Badge } from '../../../components/ui-kit';

export function ActiveBadge({ active }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

/**
 * Bank details state. `hasLive` = approved details already exist (e.g. a change was
 * rejected but the earlier approved details are still used for payments).
 */
export function BankStatusBadge({ status, hasLive }) {
  if (status === 'pending') return <Badge tone="warning">Awaiting approval</Badge>;
  if (status === 'rejected') return <Badge tone="danger">{hasLive ? 'Change rejected' : 'Rejected'}</Badge>;
  if (status === 'approved') return <Badge tone="success">Approved</Badge>;
  return <Badge tone="neutral">Not added</Badge>;
}
