// app/components/ui/ModalShell.tsx
import { ReactNode } from 'react';

interface ModalShellProps {
  children: ReactNode;
  title?: string;
  onClose: () => void;
  className?: string;
  showGradientHeader?: boolean;
}

export default function ModalShell({
  children,
  title,
  onClose,
  className = '',
  showGradientHeader = false,
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div
        className={`bg-[rgb(var(--surface))] rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showGradientHeader && title && (
          <div className="bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))] -m-6 mb-4 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))]">{title}</h2>
              <button
                onClick={onClose}
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {!showGradientHeader && title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

