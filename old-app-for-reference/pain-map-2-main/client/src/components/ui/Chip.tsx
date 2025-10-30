import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  selected?: boolean;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      variant = 'default',
      selected = false,
      onRemove,
      size = 'md',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = onClick || selected !== undefined;

    return (
      <div
        ref={ref}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
          {
            // Sizes
            'px-2 py-1 text-xs': size === 'sm',
            'px-3 py-1.5 text-sm': size === 'md',
            
            // Variants (unselected)
            'bg-surface border border-border text-text hover:bg-surface-elevated':
              variant === 'default' && !selected,
            'bg-primary-light border border-primary-border text-primary':
              variant === 'primary' && !selected,
            'bg-success-light border border-success-border text-success':
              variant === 'success' && !selected,
            'bg-warning-light border border-warning-border text-warning':
              variant === 'warning' && !selected,
            'bg-danger-light border border-danger-border text-danger':
              variant === 'danger' && !selected,
              
            // Selected states
            'bg-primary text-white border-primary': variant === 'primary' && selected,
            'bg-success text-white border-success': variant === 'success' && selected,
            'bg-border-strong text-text border-border-strong': variant === 'default' && selected,
            
            // Interactive states
            'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1':
              isClickable,
          },
          className
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(e as any);
          }
        }}
        {...props}
      >
        <span>{children}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = 'Chip';
