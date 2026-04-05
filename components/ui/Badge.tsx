import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-900/40 text-green-300 border border-green-700/50',
  warning: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
  error: 'bg-red-900/40 text-red-300 border border-red-700/50',
  info: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',
  neutral: 'bg-gray-800 text-gray-300 border border-gray-700',
};

export default function Badge({
  variant = 'neutral',
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
