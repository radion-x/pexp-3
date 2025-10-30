import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-secondary text-text border border-border',
        primary: 'bg-primary text-white',
        success: 'bg-success text-white',
        warning: 'bg-warning text-white',
        danger: 'bg-danger text-white',
        info: 'bg-info text-white',
        outline: 'border border-border bg-transparent text-text',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional icon to display before the text */
  icon?: React.ReactNode;
  /** Whether the badge should pulse (for notifications) */
  pulse?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, pulse, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {icon && <span className="mr-1 flex items-center">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Urgency Badge (specific to pain assessment)
export interface UrgencyBadgeProps {
  urgency: 'low' | 'moderate' | 'high' | 'immediate';
  className?: string;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency,
  className,
}) => {
  const urgencyConfig = {
    low: { variant: 'success' as const, label: 'Low Urgency', pulse: false },
    moderate: { variant: 'warning' as const, label: 'Moderate Urgency', pulse: false },
    high: { variant: 'danger' as const, label: 'High Urgency', pulse: false },
    immediate: { variant: 'danger' as const, label: 'Immediate Attention', pulse: true },
  };

  const config = urgencyConfig[urgency];

  return (
    <Badge
      variant={config.variant}
      pulse={config.pulse}
      className={className}
      aria-label={`Urgency level: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
};

// Count Badge (for notifications)
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: VariantProps<typeof badgeVariants>['variant'];
  className?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  variant = 'danger',
  className,
}) => {
  const displayCount = count > max ? `${max}+` : count;

  if (count === 0) return null;

  return (
    <Badge
      variant={variant}
      size="sm"
      className={cn('min-w-[1.25rem] px-1', className)}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </Badge>
  );
};
