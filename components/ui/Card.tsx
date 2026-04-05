import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export default function Card({
  header,
  footer,
  children,
  className,
  noPadding = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-xl shadow-lg',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-gray-800">{header}</div>
      )}
      <div className={cn(!noPadding && 'p-4')}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-800">{footer}</div>
      )}
    </div>
  );
}
