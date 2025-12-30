// app/components/ErrorNotification.tsx
'use client';

import { useEffect, useState } from 'react';

export type ErrorNotificationType = 'error' | 'success' | 'info' | 'warning';

export interface ErrorNotification {
  id: string;
  message: string;
  type: ErrorNotificationType;
  duration?: number;
}

interface ErrorNotificationProps {
  notification: ErrorNotification;
  onDismiss: (id: string) => void;
}

function ErrorNotificationItem({ notification, onDismiss }: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = notification.duration || 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300); // Wait for fade-out
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onDismiss]);

  const getStyles = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`p-4 border rounded-lg shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${getStyles()}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium flex-1">{notification.message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(notification.id), 300);
          }}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function ErrorNotificationContainer() {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    // Listen for custom error events
    const handleError = (event: CustomEvent<Omit<ErrorNotification, 'id'>>) => {
      const notification: ErrorNotification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...event.detail,
      };
      setNotifications((prev) => [...prev, notification]);
    };

    window.addEventListener('show-error' as any, handleError as EventListener);
    window.addEventListener('show-success' as any, handleError as EventListener);
    window.addEventListener('show-info' as any, handleError as EventListener);
    window.addEventListener('show-warning' as any, handleError as EventListener);

    return () => {
      window.removeEventListener('show-error' as any, handleError as EventListener);
      window.removeEventListener('show-success' as any, handleError as EventListener);
      window.removeEventListener('show-info' as any, handleError as EventListener);
      window.removeEventListener('show-warning' as any, handleError as EventListener);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <ErrorNotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}

// Helper functions to show notifications
export function showError(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent('show-error', {
      detail: { message, type: 'error' as ErrorNotificationType, duration },
    })
  );
}

export function showSuccess(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent('show-success', {
      detail: { message, type: 'success' as ErrorNotificationType, duration },
    })
  );
}

export function showInfo(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent('show-info', {
      detail: { message, type: 'info' as ErrorNotificationType, duration },
    })
  );
}

export function showWarning(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent('show-warning', {
      detail: { message, type: 'warning' as ErrorNotificationType, duration },
    })
  );
}

