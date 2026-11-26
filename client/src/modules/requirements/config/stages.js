/**
 * The 8-stage Requirements flow. Must match server/src/modules/requirements/requirements.stages.js.
 * `currentStage` from the API is the stage waiting to be done next (9 = closed).
 */
export const STAGES = [
  { no: 1, key: 'requirement', label: 'Requirement', hint: 'Created' },
  { no: 2, key: 'enquiry', label: 'Enquiry', hint: 'Send to transporters' },
  { no: 3, key: 'quotations', label: 'Quotations', hint: 'Record quotes' },
  { no: 4, key: 'rate_approval', label: 'Rate approval', hint: 'Approve final rate' },
  { no: 5, key: 'booking', label: 'Booking', hint: 'Vehicle and driver' },
  { no: 6, key: 'trip_followup', label: 'Trip follow-up', hint: 'Milestones' },
  { no: 7, key: 'delivery', label: 'Delivery', hint: 'POD and damage' },
  { no: 8, key: 'payment', label: 'Payment', hint: 'Pay and close' },
];

export const STAGE_CLOSED = 9;

/** Trip follow-up milestones, in order (stage 6). Must match the server. */
export const MILESTONES = [
  { key: 'loaded', label: 'Loaded' },
  { key: 'departed', label: 'Departed' },
  { key: 'reached', label: 'Reached destination' },
  { key: 'unloaded', label: 'Unloaded' },
];

export function getStage(no) {
  return STAGES.find((s) => s.no === no) || null;
}

/** Badge text and tone for a requirement's position in the flow. */
export function stageBadge({ currentStage, status }) {
  if (status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (status === 'closed' || currentStage >= STAGE_CLOSED) return { label: 'Closed', tone: 'success' };
  const stage = getStage(currentStage);
  // Sourcing stages (enquiry to rate approval) amber; execution stages (booking onwards) blue.
  return { label: stage?.label || 'Unknown', tone: currentStage >= 5 ? 'info' : 'warning' };
}
