// app/components/ui/Card.tsx
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  // Light theme: subtle lift with lighter surface
  // Dark theme: increased elevation with stronger shadow and ring
  const baseClasses = 'rounded-xl bg-[rgb(var(--surface))] ring-1 dark:shadow-md dark:ring-[rgb(var(--ring)/0.12)] shadow-sm ring-[rgb(var(--ring)/0.08)]';
  const hoverClasses = hover || onClick ? 'cursor-pointer transition-all hover:shadow-md dark:hover:shadow-lg hover:ring-[rgb(var(--ring)/0.12)] dark:hover:ring-[rgb(var(--ring)/0.16)]' : '';
  
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${hoverClasses} ${className}`}
    >
      {children}
    </Component>
  );
}

