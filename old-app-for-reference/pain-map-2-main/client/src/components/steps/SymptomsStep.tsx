import React from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';
import { AlertTriangle, Activity, Brain, Heart } from 'lucide-react';

export const SymptomsStep: React.FC = () => {
  const { assessmentData, updateData } = useWizard();
  const symptoms = assessmentData.associated || {};

  const handleSymptomToggle = (key: keyof typeof symptoms) => {
    updateData('associated', {
      ...symptoms,
      [key]: !symptoms[key],
    });
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Activity className="h-6 w-6 flex-shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text">
                Associated Symptoms
              </h3>
              <p className="mt-1 text-text-secondary">
                Tell us about any other symptoms you're experiencing alongside your
                pain. This helps us understand the full picture of your condition.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neurological Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h4 className="text-base font-semibold text-text">
              Neurological Symptoms
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Weakness in arms or legs"
              checked={symptoms.weakness || false}
              onChange={() => handleSymptomToggle('weakness')}
            />
            <Checkbox
              label="Numbness or loss of sensation"
              checked={symptoms.numbness || false}
              onChange={() => handleSymptomToggle('numbness')}
            />
            <Checkbox
              label="Tingling or pins-and-needles sensation"
              checked={symptoms.tingling || false}
              onChange={() => handleSymptomToggle('tingling')}
            />
            <Checkbox
              label="Balance problems or difficulty walking"
              checked={symptoms.balanceIssues || false}
              onChange={() => handleSymptomToggle('balanceIssues')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inflammatory Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h4 className="text-base font-semibold text-text">
              Inflammatory Signs
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Morning stiffness lasting more than 30 minutes"
              checked={symptoms.morningStiffness30m || false}
              onChange={() => handleSymptomToggle('morningStiffness30m')}
            />
            <Checkbox
              label="Fever or chills"
              checked={symptoms.feverChills || false}
              onChange={() => handleSymptomToggle('feverChills')}
            />
            <Checkbox
              label="Night sweats"
              checked={symptoms.nightSweats || false}
              onChange={() => handleSymptomToggle('nightSweats')}
            />
            <Checkbox
              label="Unexplained fatigue or exhaustion"
              checked={symptoms.fatigue || false}
              onChange={() => handleSymptomToggle('fatigue')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Musculoskeletal Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-text">
              Joint & Muscle Symptoms
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Swelling in the affected area"
              checked={symptoms.swelling || false}
              onChange={() => handleSymptomToggle('swelling')}
            />
            <Checkbox
              label="Redness or warmth"
              checked={symptoms.rednessWarmth || false}
              onChange={() => handleSymptomToggle('rednessWarmth')}
            />
            <Checkbox
              label="Bruising"
              checked={symptoms.bruising || false}
              onChange={() => handleSymptomToggle('bruising')}
            />
            <Checkbox
              label="Joint locking or catching"
              checked={symptoms.lockingCatching || false}
              onChange={() => handleSymptomToggle('lockingCatching')}
            />
            <Checkbox
              label="Joint instability or giving way"
              checked={symptoms.instability || false}
              onChange={() => handleSymptomToggle('instability')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Head/Neck Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-text">
              Head & Neck Symptoms
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Headaches"
              checked={symptoms.headache || false}
              onChange={() => handleSymptomToggle('headache')}
            />
            <Checkbox
              label="Sensitivity to light or sound"
              checked={symptoms.lightSoundSensitive || false}
              onChange={() => handleSymptomToggle('lightSoundSensitive')}
            />
            <Checkbox
              label="Vision changes or blurred vision"
              checked={symptoms.visionChanges || false}
              onChange={() => handleSymptomToggle('visionChanges')}
            />
            <Checkbox
              label="Jaw pain or TMJ issues"
              checked={symptoms.jawPain || false}
              onChange={() => handleSymptomToggle('jawPain')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cardiorespiratory Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-danger" />
            <h4 className="text-base font-semibold text-text">
              Heart & Lung Symptoms
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Chest pain or tightness"
              checked={symptoms.chestPain || false}
              onChange={() => handleSymptomToggle('chestPain')}
            />
            <Checkbox
              label="Shortness of breath or difficulty breathing"
              checked={symptoms.shortnessBreath || false}
              onChange={() => handleSymptomToggle('shortnessBreath')}
            />
          </div>

          {(symptoms.chestPain || symptoms.shortnessBreath) && (
            <div className="mt-4 rounded-lg bg-danger/10 p-4">
              <p className="text-sm font-medium text-danger">
                ⚠️ If you're experiencing severe chest pain or difficulty breathing,
                please seek immediate medical attention by calling 911 or visiting
                the nearest emergency room.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GI/GU Symptoms */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-text">
              Digestive & Bladder Symptoms
            </h4>
          </div>

          <div className="space-y-3">
            <Checkbox
              label="Nausea or vomiting"
              checked={symptoms.nauseaVomiting || false}
              onChange={() => handleSymptomToggle('nauseaVomiting')}
            />
            <Checkbox
              label="Abdominal pain"
              checked={symptoms.abdominalPain || false}
              onChange={() => handleSymptomToggle('abdominalPain')}
            />
            <Checkbox
              label="Changes in bowel habits"
              checked={symptoms.bowelChange || false}
              onChange={() => handleSymptomToggle('bowelChange')}
            />
            <Checkbox
              label="Changes in bladder function or urination"
              checked={symptoms.bladderChange || false}
              onChange={() => handleSymptomToggle('bladderChange')}
            />
            <Checkbox
              label="Numbness in the saddle/groin area"
              checked={symptoms.saddleNumbness || false}
              onChange={() => handleSymptomToggle('saddleNumbness')}
            />
            <Checkbox
              label="Loss of bowel or bladder control (incontinence)"
              checked={symptoms.incontinence || false}
              onChange={() => handleSymptomToggle('incontinence')}
            />
            <Checkbox
              label="Pain related to menstrual cycle"
              checked={symptoms.menstrualLink || false}
              onChange={() => handleSymptomToggle('menstrualLink')}
            />
          </div>

          {(symptoms.saddleNumbness || symptoms.incontinence) && (
            <div className="mt-4 rounded-lg bg-danger/10 p-4">
              <p className="text-sm font-medium text-danger">
                ⚠️ These symptoms may indicate a serious condition requiring urgent
                evaluation. Please seek immediate medical attention.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <Textarea
            label="Any other symptoms or important details? (Optional)"
            value={assessmentData.history?.mechanism || ''}
            onChange={(e) =>
              updateData('history', {
                ...assessmentData.history,
                mechanism: e.target.value,
              })
            }
            placeholder="Describe any other symptoms or concerns not listed above..."
            rows={4}
            maxLength={1000}
          />
        </CardContent>
      </Card>
    </div>
  );
};
