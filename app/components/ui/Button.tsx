// app/components/ui/Button.tsx
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]';
  
  const variantClasses = {
    primary: 'bg-[rgb(var(--text))] text-[rgb(var(--bg))] hover:opacity-85 transition-opacity',
    secondary: 'bg-[rgb(var(--surface2))] text-[rgb(var(--text))] ring-1 ring-[rgb(var(--ring)/0.12)] hover:bg-[rgb(var(--surface))]',
    ghost: 'text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))]',
    destructive: 'text-red-600 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800 hover:bg-red-50 dark:hover:bg-red-900/20',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

