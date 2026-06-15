import { useEffect, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), .movie-card, .episode-scroll__item, [role="button"]';

function getFocusable() {
  return document.querySelectorAll(FOCUSABLE);
}

function findHorizontal(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  let best = null;
  let bestDist = Infinity;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();
    const gap = direction === 'ArrowRight' ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    const elMidY = r.top + r.height / 2;
    const dy = Math.abs(elMidY - midY);

    // Skip elements too far vertically (different row)
    if (dy > rect.height * 2.5) return;

    const dist = gap + dy * 1.5;
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  });

  return best;
}

function findVertical(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  let best = null;
  let bestDist = Infinity;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();
    const gap = direction === 'ArrowDown' ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const elMidX = r.left + r.width / 2;
    const dx = Math.abs(elMidX - midX);

    // Skip elements too far horizontally (different column area)
    if (dx > rect.width * 3) return;

    const dist = gap + dx * 0.3;
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  });

  return best;
}

export function useTvFocus() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!isTauri() || initialized.current) return;
    initialized.current = true;

    const handleKeyDown = (e) => {
      const focused = document.activeElement;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'ArrowRight':
        case 'ArrowLeft': {
          e.preventDefault();
          const focusable = getFocusable();
          if (focusable.length === 0) return;

          const target = (e.key === 'ArrowRight' || e.key === 'ArrowLeft')
            ? findHorizontal(focusable, focused, e.key)
            : findVertical(focusable, focused, e.key);

          if (target) {
            target.focus();
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return;
        }
        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          window.history.back();
          break;
        case 'Enter':
        case ' ':
          if (focused && focused !== document.body) {
            e.preventDefault();
            focused.click();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
