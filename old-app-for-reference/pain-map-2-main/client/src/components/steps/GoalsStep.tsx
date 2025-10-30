import React from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Target, Activity, Smile, Briefcase } from 'lucide-react';

const commonGoals = [
  {
    value: 'pain-reduction',
    label: 'Reduce overall pain level',
    icon: <Target className="h-5 w-5" />,
  },
  {
    value: 'function',
    label: 'Improve daily function and mobility',
    icon: <Activity className="h-5 w-5" />,
  },
  {
    value: 'quality',
    label: 'Improve quality of life',
    icon: <Smile className="h-5 w-5" />,
  },
  {
    value: 'work',
    label: 'Return to work or normal activities',
    icon: <Briefcase className="h-5 w-5" />,
  },
];

export const GoalsStep: React.FC = () => {
  const { assessmentData, updateData } = useWizard();
  const goals = assessmentData.goals || {};

  const handleGoalToggle = (goalValue: string) => {
    const current = goals.primary || [];
    const updated = current.includes(goalValue)
      ? current.filter((g) => g !== goalValue)
      : [...current, goalValue];
    updateData('goals', { ...goals, primary: updated });
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Target className="h-6 w-6 flex-shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text">
                Your Treatment Goals
              </h3>
              <p className="mt-1 text-text-secondary">
                Help us understand what you hope to achieve with treatment. This will
                guide our recommendations and ensure we're working toward outcomes
                that matter most to you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Goals */}
      <Card>
        <CardContent className="pt-6">
          <label className="mb-4 block text-sm font-medium text-text">
            What are your main goals? (Select all that apply)
          </label>

          <div className="space-y-3">
            {commonGoals.map((goal) => (
              <div
                key={goal.value}
                className="flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-surface-secondary"
              >
                <Checkbox
                  checked={(goals.primary || []).includes(goal.value)}
                  onChange={() => handleGoalToggle(goal.value)}
                />
                <div className="flex flex-1 items-start gap-3">
                  <div className="text-primary">{goal.icon}</div>
                  <label className="flex-1 cursor-pointer text-sm font-medium text-text">
                    {goal.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specific Goals */}
      <Card>
        <CardContent className="pt-6">
          <Textarea
            label="Describe your specific goals"
            value={goals.description || ''}
            onChange={(e) =>
              updateData('goals', { ...goals, description: e.target.value })
            }
            placeholder="Example: I want to be able to play with my grandchildren without pain, or return to running 3 miles..."
            rows={5}
            helperText="Be as specific as possible about what you'd like to accomplish"
            maxLength={1000}
          />
        </CardContent>
      </Card>

      {/* Activities Affected */}
      <Card>
        <CardContent className="pt-6">
          <Textarea
            label="What activities or hobbies has your pain prevented?"
            value={assessmentData.functional?.limitDescription || ''}
            onChange={(e) =>
              updateData('functional', {
                ...assessmentData.functional,
                limitDescription: e.target.value,
              })
            }
            placeholder="Example: gardening, golf, hiking, playing with children, household chores..."
            rows={4}
            helperText="This helps us understand the real-world impact of your pain"
            maxLength={1000}
          />
        </CardContent>
      </Card>

      {/* Timeline Expectations */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <Textarea
            label="What is your timeline for improvement?"
            value={goals.timeline || ''}
            onChange={(e) =>
              updateData('goals', { ...goals, timeline: e.target.value })
            }
            placeholder="Example: I need relief as soon as possible for an upcoming event, or I'm looking for long-term management..."
            rows={3}
            maxLength={500}
          />
        </CardContent>
      </Card>

      {/* Treatment Preferences */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <Textarea
            label="Do you have any treatment preferences or concerns? (Optional)"
            value={goals.preferences || ''}
            onChange={(e) =>
              updateData('goals', { ...goals, preferences: e.target.value })
            }
            placeholder="Example: prefer conservative treatments, interested in physical therapy, concerns about surgery or injections..."
            rows={3}
            maxLength={500}
            helperText="This helps us recommend treatments that align with your preferences"
          />
        </CardContent>
      </Card>
    </div>
  );
};
