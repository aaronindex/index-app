// app/components/ui/Pill.tsx
import { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Pill({ children, active = false, onClick, className = '' }: PillProps) {
  const baseClasses = 'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all';
  
  const stateClasses = active
    ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
    : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]';
  
  const interactiveClasses = onClick ? 'cursor-pointer' : '';
  
  const Component = onClick ? 'button' : 'span';
  
  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${stateClasses} ${interactiveClasses} ${className}`}
    >
      {children}
    </Component>
  );
}

