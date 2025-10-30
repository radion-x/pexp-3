import { useWizard } from '../WizardState';
import { WizardShell } from './WizardShell';
import { WelcomeStep } from './steps/WelcomeStep';
import { PainMappingStep } from './steps/PainMappingStepNew';
import { TimingStep } from './steps/TimingStep';
import { TriggersStep } from './steps/TriggersStep';
import { SymptomsStep } from './steps/SymptomsStep';
import { RedFlagsStep } from './steps/RedFlagsStep';
import { GoalsStep } from './steps/GoalsStep';
import { ReviewStep } from './steps/ReviewStep';

export default function WizardAssessment() {
  const { currentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'pain-mapping':
        return <PainMappingStep />;
      case 'timing':
        return <TimingStep />;
      case 'triggers':
        return <TriggersStep />;
      case 'symptoms':
        return <SymptomsStep />;
      case 'red-flags':
        return <RedFlagsStep />;
      case 'goals':
        return <GoalsStep />;
      case 'review':
        return <ReviewStep />;
      default:
        return (
          <div className="text-center text-text-muted">
            Step "{currentStep}" is not yet implemented.
          </div>
        );
    }
  };

  return <WizardShell showSummaryRail>{renderStep()}</WizardShell>;
}
