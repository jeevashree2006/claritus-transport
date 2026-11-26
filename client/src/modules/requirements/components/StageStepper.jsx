/**
 * Horizontal 8-stage progress bar. Done stages are ticked, the current one is highlighted.
 * Scrolls sideways on small screens.
 */
import { Check } from 'lucide-react';
import { STAGES } from '../config/stages';
import './StageStepper.css';

export default function StageStepper({ currentStage }) {
  return (
    <nav className="stepper-wrap" aria-label="Requirement progress">
      <ol className="stepper">
        {STAGES.map((stage) => {
          const state = stage.no < currentStage ? 'done' : stage.no === currentStage ? 'current' : 'todo';
          return (
            <li
              key={stage.key}
              className={`stepper__step stepper__step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="stepper__dot" aria-hidden="true">
                {state === 'done' ? <Check size={14} strokeWidth={3} /> : stage.no}
              </span>
              <span className="stepper__label">{stage.label}</span>
              <span className="stepper__hint">{stage.hint}</span>
              <span className="sr-only">
                {state === 'done' ? ' (done)' : state === 'current' ? ' (next step)' : ' (not started)'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
