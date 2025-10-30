import React from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { Chip } from '../ui/Chip';
import { Slider } from '../ui/Slider';
import { Clock, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

const onsetOptions = [
  { value: 'acute', label: 'Sudden onset (within hours/days)' },
  { value: 'gradual', label: 'Gradual onset (over weeks/months)' },
  { value: 'chronic', label: 'Long-standing (years)' },
];

const frequencyOptions = [
  { value: 'constant', label: 'Constant - Always present' },
  { value: 'intermittent', label: 'Comes and goes' },
  { value: 'episodic', label: 'Episodes/flare-ups' },
];

const timeOfDayOptions = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

export const TimingStep: React.FC = () => {
  const { assessmentData, updateData } = useWizard();
  const timing = assessmentData.timing || {};
  const MAX_DURATION_MONTHS = 120;
  const durationMonths = (() => {
    const value = timing.durationMonths;
    if (typeof value === 'number') {
      return Math.min(Math.max(value, 0), MAX_DURATION_MONTHS);
    }
    return 0;
  })();

  const formatDurationLabel = (months: number) => {
    if (months <= 0) {
      return '<1 mo';
    }
    if (months < 12) {
      return `${months} mo`;
    }
    if (months >= 120) {
      return '10+ yrs';
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} yr${years > 1 ? 's' : ''}`;
    }
    return `${years} yr${years > 1 ? 's' : ''} ${remainingMonths} mo`;
  };

  const handleOnsetChange = (value: string) => {
    updateData('timing', { ...timing, onset: value as any });
  };

  const handleFrequencyChange = (value: string) => {
    updateData('timing', { ...timing, frequency: value as any });
  };

  const handleTimeOfDayToggle = (time: string) => {
    const current = timing.timeOfDay || [];
    const updated = current.includes(time as any)
      ? current.filter((t) => t !== time)
      : [...current, time as any];
    updateData('timing', { ...timing, timeOfDay: updated });
  };

  const handleDurationChange = (value: number) => {
    const clamped = Math.min(Math.max(Math.round(value), 0), MAX_DURATION_MONTHS);
    updateData('timing', { ...timing, durationMonths: clamped });
  };

  // Tick marks at key intervals for better alignment
  const tickValues = [0, 6, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
  const tickLabels = tickValues.map((value) => {
    let label: string;
    if (value === 0) {
      label = '<1 mo';
    } else if (value === 6) {
      label = '6 mo';
    } else if (value === 12) {
      label = '1 yr';
    } else if (value === 24) {
      label = '2 yrs';
    } else if (value === 36) {
      label = '3 yrs';
    } else if (value === 48) {
      label = '4 yrs';
    } else if (value === 60) {
      label = '5 yrs';
    } else if (value === 72) {
      label = '6 yrs';
    } else if (value === 84) {
      label = '7 yrs';
    } else if (value === 96) {
      label = '8 yrs';
    } else if (value === 108) {
      label = '9 yrs';
    } else if (value === 120) {
      label = '10+ yrs';
    } else {
      label = formatDurationLabel(value);
    }
    return { value, label };
  });

  const sliderPercent = (durationMonths / MAX_DURATION_MONTHS) * 100;
  const dynamicLabelStyle: React.CSSProperties = {
    left: `${sliderPercent}%`,
    transform: 'translateX(-50%)',
  };
  if (sliderPercent <= 8) {
    dynamicLabelStyle.left = '0%';
    dynamicLabelStyle.transform = 'translateX(0)';
  } else if (sliderPercent >= 92) {
    dynamicLabelStyle.left = '100%';
    dynamicLabelStyle.transform = 'translateX(-100%)';
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Clock className="h-6 w-6 flex-shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text">Pain Timing & Patterns</h3>
              <p className="mt-1 text-text-secondary">
                Understanding when and how your pain occurs helps us identify patterns
                and potential triggers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onset */}
      <Card>
        <CardContent className="pt-6">
          <Select
            label="How did your pain start?"
            options={onsetOptions}
            value={timing.onset}
            onChange={handleOnsetChange}
            placeholder="Select onset type..."
            required
          />
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Calendar className="h-6 w-6 flex-shrink-0 text-primary hidden sm:block" />
            <div className="flex-1">
              <label className="mb-3 block text-sm font-medium text-text">
                How long have you had this pain?
              </label>
              <div className="space-y-2">
                {/* Current Value Display */}
                <div className="mb-2 text-right">
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1.5 text-lg font-bold text-primary">
                    {formatDurationLabel(durationMonths)}
                  </span>
                </div>
                
                <Slider
                  min={0}
                  max={MAX_DURATION_MONTHS}
                  step={1}
                  value={durationMonths}
                  onValueChange={handleDurationChange}
                  valueFormatter={formatDurationLabel}
                  showValue={false}
                  showNumericInput={false}
                  aria-label="Pain duration in months"
                />
                
                {/* Scale Tick Marks - Hidden on mobile */}
                <div className="relative mt-1 h-5 text-xs font-semibold text-text-muted hidden sm:block">
                  {tickLabels.map((tick) => {
                    const percent = (tick.value / MAX_DURATION_MONTHS) * 100;
                    let translateX = '-50%';
                    if (percent <= 8) {
                      translateX = '0%';
                    } else if (percent >= 92) {
                      translateX = '-100%';
                    }
                    return (
                      <span
                        key={tick.value}
                        className={cn(
                          'absolute whitespace-nowrap px-1',
                          durationMonths === tick.value ? 'text-primary' : ''
                        )}
                        style={{
                          left: `${percent}%`,
                          transform: `translateX(${translateX})`,
                        }}
                      >
                        {tick.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardContent className="pt-6">
          <Select
            label="How often do you experience this pain?"
            options={frequencyOptions}
            value={timing.frequency}
            onChange={handleFrequencyChange}
            placeholder="Select frequency..."
            required
            helperText="Choose the option that best describes your pain pattern"
          />
        </CardContent>
      </Card>

      {/* Time of Day */}
      <Card>
        <CardContent className="pt-6">
          <label className="mb-3 block text-sm font-medium text-text">
            When is your pain typically worse? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {timeOfDayOptions.map((option) => (
              <Chip
                key={option.value}
                selected={(timing.timeOfDay || []).includes(option.value as any)}
                onClick={() => handleTimeOfDayToggle(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
          {(!timing.timeOfDay || timing.timeOfDay.length === 0) && (
            <p className="mt-3 text-sm text-text-muted">
              Select the times when you notice your pain is more intense
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
