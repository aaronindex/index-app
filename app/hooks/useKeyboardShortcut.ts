// app/hooks/useKeyboardShortcut.ts
// Lightweight hook for keyboard shortcuts (no external dependencies)

import { useEffect } from 'react';

interface UseKeyboardShortcutOptions {
  key: string; // e.g., 'k'
  metaKey?: boolean; // Cmd on Mac
  ctrlKey?: boolean; // Ctrl on Windows/Linux
  shiftKey?: boolean;
  altKey?: boolean;
  onPress: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  onPress,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      // On Windows/Linux, treat Ctrl as Meta for Cmd+K
      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Check modifier keys - for Cmd+K, we want Meta (Mac) or Ctrl (Windows/Linux)
      const metaOrCtrl = metaKey ? (isMac ? event.metaKey : event.ctrlKey) : (!event.metaKey && !event.ctrlKey);
      const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = altKey ? event.altKey : !event.altKey;
      const ctrlMatch = ctrlKey ? event.ctrlKey : !event.ctrlKey;

      // All specified modifiers must match
      if (metaOrCtrl && shiftMatch && altMatch && ctrlMatch) {
        // Prevent default browser behavior
        event.preventDefault();
        onPress();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, metaKey, ctrlKey, shiftKey, altKey, onPress, enabled]);
}
