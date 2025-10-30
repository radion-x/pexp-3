import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            className={cn(
              'peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-border bg-bg transition-all',
              'checked:border-primary checked:bg-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-danger',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          <Check
            className={cn(
              'pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity',
              'peer-checked:opacity-100'
            )}
          />
        </div>

        {(label || helperText || error) && (
          <div className="flex-1 space-y-1">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  'block cursor-pointer text-sm font-medium text-text',
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {helperText && !error && (
              <p id={`${inputId}-helper`} className="text-sm text-text-muted">
                {helperText}
              </p>
            )}
            {error && (
              <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Checkbox Group Component
export interface CheckboxGroupProps {
  label?: string;
  helperText?: string;
  error?: string;
  children?: React.ReactNode;
  className?: string;
  // Option-based API (alternative to children)
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string[];
  onChange?: (value: string[]) => void;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  helperText,
  error,
  children,
  className,
  options,
  value = [],
  onChange,
}) => {
  const handleToggle = (optionValue: string) => {
    if (onChange) {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">{label}</p>
          {helperText && !error && (
            <p className="text-sm text-text-muted">{helperText}</p>
          )}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        {options
          ? options.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={value.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                disabled={option.disabled}
              />
            ))
          : children}
      </div>
    </div>
  );
};
