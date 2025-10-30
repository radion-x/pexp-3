import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (index: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  orientation = 'horizontal',
  onStepClick,
  className,
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <nav
      aria-label="Progress"
      className={cn(
        isVertical ? 'space-y-4' : 'flex items-center justify-between',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && (isCompleted || index <= currentStep);

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center gap-3',
                isVertical ? 'w-full' : 'flex-1'
              )}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'group flex items-center gap-3 transition-opacity',
                  isClickable
                    ? 'cursor-pointer hover:opacity-80'
                    : 'cursor-default opacity-60'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    isCompleted
                      ? 'border-primary bg-primary text-white'
                      : isCurrent
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border bg-surface text-text-muted'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className={cn('text-left', !isVertical && 'hidden sm:block')}>
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent ? 'text-primary' : 'text-text'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-text-muted">{step.description}</p>
                  )}
                </div>
              </button>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'transition-colors',
                  isVertical
                    ? 'ml-5 h-6 w-0.5'
                    : 'mx-2 h-0.5 flex-1',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Mobile Stepper (Progress Bar)
export interface MobileStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const MobileStepper: React.FC<MobileStepperProps> = ({
  steps,
  currentStep,
  className,
}) => {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">
          {steps[currentStep]?.label}
        </p>
        <p className="text-sm text-text-muted">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        />
      </div>
    </div>
  );
};
