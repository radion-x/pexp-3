import React from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { Checkbox, CheckboxGroup } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';
import { TrendingDown, TrendingUp } from 'lucide-react';

const aggravatorOptions = [
  { value: 'sitting', label: 'Sitting' },
  { value: 'standing', label: 'Standing' },
  { value: 'walking', label: 'Walking' },
  { value: 'bending', label: 'Bending forward' },
  { value: 'lifting', label: 'Lifting' },
  { value: 'twisting', label: 'Twisting/rotating' },
  { value: 'lying', label: 'Lying down' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'exercise', label: 'Exercise/activity' },
  { value: 'coughing', label: 'Coughing/sneezing' },
  { value: 'weather', label: 'Weather changes' },
  { value: 'stress', label: 'Stress' },
];

const relieverOptions = [
  { value: 'rest', label: 'Rest' },
  { value: 'movement', label: 'Movement/walking' },
  { value: 'heat', label: 'Heat application' },
  { value: 'ice', label: 'Ice/cold' },
  { value: 'lying', label: 'Lying down' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'standing', label: 'Standing' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'massage', label: 'Massage' },
  { value: 'medication', label: 'Medication' },
  { value: 'position', label: 'Specific positions' },
];

export const TriggersStep: React.FC = () => {
  const { assessmentData, updateData } = useWizard();
  const aggravators = assessmentData.aggravators || {};
  const relievers = assessmentData.relievers || {};

  const handleAggravatorsChange = (values: string[]) => {
    updateData('aggravators', { ...aggravators, factors: values });
  };

  const handleRelieversChange = (values: string[]) => {
    updateData('relievers', { ...relievers, factors: values });
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-text">
            What Makes Your Pain Better or Worse?
          </h3>
          <p className="mt-2 text-text-secondary">
            Identifying triggers and relief factors helps us understand your pain
            mechanism and develop effective treatment strategies.
          </p>
        </CardContent>
      </Card>

      {/* Aggravators */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-danger" />
            <h4 className="text-base font-semibold text-text">
              What makes your pain worse?
            </h4>
          </div>

          <CheckboxGroup
            options={aggravatorOptions}
            value={aggravators.factors || []}
            onChange={handleAggravatorsChange}
          />

          <div className="mt-4">
            <Textarea
              label="Additional details (optional)"
              value={aggravators.notes || ''}
              onChange={(e) =>
                updateData('aggravators', { ...aggravators, notes: e.target.value })
              }
              placeholder="Describe any other activities or situations that worsen your pain..."
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Relievers */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-success" />
            <h4 className="text-base font-semibold text-text">
              What makes your pain better?
            </h4>
          </div>

          <CheckboxGroup
            options={relieverOptions}
            value={relievers.factors || []}
            onChange={handleRelieversChange}
          />

          <div className="mt-4">
            <Textarea
              label="Additional details (optional)"
              value={relievers.notes || ''}
              onChange={(e) =>
                updateData('relievers', { ...relievers, notes: e.target.value })
              }
              placeholder="Describe any other activities or treatments that help relieve your pain..."
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Position Sensitivity */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <label className="mb-2 block text-sm font-medium text-text">
            Are certain body positions particularly important for your pain?
          </label>
          <Textarea
            value={assessmentData.functional?.positionNotes || ''}
            onChange={(e) =>
              updateData('functional', {
                ...assessmentData.functional,
                positionNotes: e.target.value,
              })
            }
            placeholder="Example: Pain is better when sitting with lumbar support, worse when standing for more than 10 minutes..."
            rows={3}
            maxLength={500}
          />
        </CardContent>
      </Card>
    </div>
  );
};
