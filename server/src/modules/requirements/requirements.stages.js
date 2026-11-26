/**
 * The 8-stage Requirements flow. Must match client/src/modules/requirements/config/stages.js.
 * `requirements.current_stage` holds the stage that is waiting to be done next
 * (2 right after creation, 9 once Payment is done and the trip is closed).
 */
export const STAGES = Object.freeze([
  { no: 1, key: 'requirement', label: 'Requirement' },
  { no: 2, key: 'enquiry', label: 'Enquiry' },
  { no: 3, key: 'quotations', label: 'Quotations' },
  { no: 4, key: 'rate_approval', label: 'Rate approval' },
  { no: 5, key: 'booking', label: 'Booking' },
  { no: 6, key: 'trip_followup', label: 'Trip follow-up' },
  { no: 7, key: 'delivery', label: 'Delivery' },
  { no: 8, key: 'payment', label: 'Payment' },
]);

export const STAGE = Object.freeze(Object.fromEntries(STAGES.map((s) => [s.key.toUpperCase(), s.no])));
export const STAGE_CLOSED = 9;
