/**
 * Shared submit logic for the stage forms: loading flag, server message and field errors.
 *
 *   const { submitting, error, fieldErrors, setFieldErrors, submit } = useStageSubmit(onSaved);
 *   submit(() => requirementsService.sendEnquiry(ref, payload));
 */
import { useCallback, useState } from 'react';
import { getErrorMessage } from '../../../services/api';
import { getFieldErrors } from '../services/requirementsService';

export default function useStageSubmit(onSaved) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = useCallback(
    async (request) => {
      setSubmitting(true);
      setError('');
      try {
        const updated = await request();
        setFieldErrors({});
        onSaved(updated);
      } catch (err) {
        setFieldErrors(getFieldErrors(err));
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [onSaved]
  );

  return { submitting, error, setError, fieldErrors, setFieldErrors, submit };
}
