import { Badge } from '../../../components/ui-kit';
import { stageBadge } from '../config/stages';

/** Shows where a requirement is in the 8-stage flow. */
export default function StageBadge({ requirement }) {
  const { label, tone } = stageBadge(requirement);
  return <Badge tone={tone}>{label}</Badge>;
}
