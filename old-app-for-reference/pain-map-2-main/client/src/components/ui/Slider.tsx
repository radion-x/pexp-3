import React from 'react';
import { cn } from '../../lib/utils';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  valueFormatter?: (value: number) => string;
  showValue?: boolean;
  showNumericInput?: boolean;
  helperText?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      label,
      min = 0,
      max = 10,
      step = 1,
      value = 0,
      onValueChange,
      valueFormatter,
      onChange,
      showValue = true,
      showNumericInput = true,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `slider-${Math.random().toString(36).substr(2, 9)}`;
    const [localValue, setLocalValue] = React.useState(value);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setLocalValue(newValue);
      onValueChange?.(newValue);
      onChange?.(e);
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      if (newValue >= min && newValue <= max) {
        setLocalValue(newValue);
        onValueChange?.(newValue);
      }
    };

    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const percentage = ((localValue - min) / (max - min)) * 100;
    const formattedValue = valueFormatter ? valueFormatter(localValue) : `${localValue}`;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              ref={ref}
              type="range"
              id={inputId}
              min={min}
              max={max}
              step={step}
              value={localValue}
              onChange={handleSliderChange}
              aria-valuetext={formattedValue}
              className={cn(
                'h-2 w-full cursor-pointer appearance-none rounded-full bg-border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
                '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-all',
                '[&::-webkit-slider-thumb]:hover:bg-primary-hover',
                '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full',
                '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary',
                '[&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-all',
                '[&::-moz-range-thumb]:hover:bg-primary-hover',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
              )}
              style={{
                background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%, var(--color-border) 100%)`,
              }}
              {...props}
            />
          </div>

          {showValue && !showNumericInput && (
            <span className="min-w-[3ch] font-mono text-lg font-semibold text-text">
              {formattedValue}
            </span>
          )}

          {showNumericInput && (
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={localValue}
              onChange={handleNumericChange}
              className={cn(
                'h-10 w-16 rounded-md border border-border bg-bg px-2 text-center font-mono text-base text-text',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label={`${label} numeric input`}
            />
          )}
        </div>

        {helperText && (
          <p className="text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';
