// app/components/ui/Badge.tsx
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'muted' | 'success' | 'warning' | 'error';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-[rgb(var(--surface2))] text-[rgb(var(--text))]',
    muted: 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

