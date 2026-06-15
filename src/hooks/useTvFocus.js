import { useEffect } from 'react';
import { isTauri } from '../tauri-bridge';

export function useTvFocus() {
  useEffect(() => {
    if (!isTauri()) return;

    const handleKeyDown = (e) => {
      const focused = document.activeElement;
      const focusable = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const currentIndex = Array.from(focusable).indexOf(focused);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = Math.min(currentIndex + 1, focusable.length - 1);
          if (next >= 0) focusable[next].focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = Math.max(currentIndex - 1, 0);
          if (prev < focusable.length) focusable[prev].focus();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const nextSibling = focused?.nextElementSibling;
          if (nextSibling && typeof nextSibling.focus === 'function') {
            nextSibling.focus();
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const prevSibling = focused?.previousElementSibling;
          if (prevSibling && typeof prevSibling.focus === 'function') {
            prevSibling.focus();
          }
          break;
        }
        case 'Backspace':
        case 'Escape': {
          window.history.back();
          break;
        }
        case 'Enter':
        case ' ': {
          if (focused && focused !== document.body) {
            focused.click();
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
