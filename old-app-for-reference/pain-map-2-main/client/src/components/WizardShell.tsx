import React from 'react';
import { useWizard } from '../WizardState';
import type { WizardStep } from '../../types/assessment';
import { Stepper, MobileStepper } from './ui/Stepper';
import { Button } from './ui/Button';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export interface WizardShellProps {
  children: React.ReactNode;
  showSummaryRail?: boolean;
}

const stepDefinitions = [
  { id: 'welcome', label: 'Welcome', description: 'Get started' },
  { id: 'pain-mapping', label: 'Pain Map', description: 'Mark pain areas' },
  { id: 'timing', label: 'Timing', description: 'When it hurts' },
  { id: 'triggers', label: 'Triggers', description: 'What makes it worse' },
  { id: 'symptoms', label: 'Symptoms', description: 'Associated symptoms' },
  { id: 'red-flags', label: 'Red Flags', description: 'Safety screening' },
  { id: 'goals', label: 'Goals', description: 'Treatment goals' },
  { id: 'review', label: 'Review', description: 'Submit assessment' },
];

export const WizardShell: React.FC<WizardShellProps> = ({
  children,
  showSummaryRail = false,
}) => {
  const {
    currentStep: currentStepId,
    completedSteps: completedStepIds,
    canProceed,
    goBack,
    goNext,
    isSaving,
    lastSavedAt,
  } = useWizard();

  const formatLastSaved = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentStepIndex = stepDefinitions.findIndex((s) => s.id === currentStepId);
  const currentStep = stepDefinitions[currentStepIndex];
  const canGoBack = currentStepIndex > 0;
  const canGoNext = canProceed;
  
  const completedSteps = stepDefinitions
    .map((step, index) => (completedStepIds.includes(step.id as WizardStep) ? index : -1))
    .filter((i) => i !== -1);
    
  const isStepComplete = (index: number) => {
    const stepId = stepDefinitions[index]?.id;
    return stepId ? completedStepIds.includes(stepId as WizardStep) : false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-text">Pain Assessment</h1>
            {isSaving ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Save className="h-4 w-4 animate-pulse" />
                Saving...
              </div>
            ) : lastSavedAt ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Save className="h-4 w-4" />
                Saved {formatLastSaved(lastSavedAt)}
              </div>
            ) : null}
          </div>

          {/* Desktop Stepper */}
          <div className="mt-4 hidden lg:block">
            <Stepper
              steps={stepDefinitions}
              currentStep={currentStepIndex}
              completedSteps={completedSteps}
            />
          </div>

          {/* Mobile Stepper */}
          <div className="mt-4 lg:hidden">
            <MobileStepper steps={stepDefinitions} currentStep={currentStepIndex} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className={cn('grid gap-8', showSummaryRail && 'lg:grid-cols-[1fr_320px]')}>
          {/* Step Content */}
          <div className="min-w-0">
            {/* Step Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text">{currentStep.label}</h2>
              {currentStep.description && (
                <p className="mt-1 text-text-muted">{currentStep.description}</p>
              )}
            </div>

            {/* Step Component */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-elevation-1">
              {children}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={!canGoBack || isSaving}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              {/* Only show Continue button, not Submit - ReviewStep has its own submit button */}
              <div className="flex items-center gap-3">
                {currentStepIndex === stepDefinitions.length - 1 ? null : (
                  <Button
                    variant="primary"
                    onClick={goNext}
                    disabled={!canGoNext || isSaving}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Rail (optional) */}
          {showSummaryRail && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-xl border border-border bg-surface p-6 shadow-elevation-1">
                <h3 className="text-lg font-semibold text-text">Your Progress</h3>
                <div className="mt-4 space-y-3">
                  {stepDefinitions.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-3 transition-colors',
                        index === currentStepIndex
                          ? 'bg-primary-light text-primary'
                          : isStepComplete(index)
                          ? 'bg-success/10 text-success'
                          : 'bg-surface-secondary text-text-muted'
                      )}
                    >
                      <div className="text-sm font-medium">{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};
