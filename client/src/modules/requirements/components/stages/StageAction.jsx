/**
 * Renders the form for the requirement's current stage.
 * Adding behaviour to a stage means editing only that stage's form.
 */
import BookingForm from './BookingForm';
import ClosedSummary from './ClosedSummary';
import DeliveryForm from './DeliveryForm';
import EnquiryForm from './EnquiryForm';
import PaymentForm from './PaymentForm';
import QuotationsForm from './QuotationsForm';
import RateApprovalForm from './RateApprovalForm';
import TripFollowUpForm from './TripFollowUpForm';

const FORMS = {
  2: EnquiryForm,
  3: QuotationsForm,
  4: RateApprovalForm,
  5: BookingForm,
  6: TripFollowUpForm,
  7: DeliveryForm,
  8: PaymentForm,
};

export default function StageAction({ requirement, onSaved }) {
  if (requirement.status !== 'open') return <ClosedSummary requirement={requirement} />;
  const Form = FORMS[requirement.currentStage];
  return Form ? <Form requirement={requirement} onSaved={onSaved} /> : null;
}
