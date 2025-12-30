// app/components/ui/SectionHeader.tsx
import { ReactNode } from 'react';

interface SectionHeaderProps {
  children: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  children,
  description,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] dark:text-white/90 mb-1">
          {children}
        </h2>
        {description && (
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--muted))] dark:text-white/60 font-medium">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

