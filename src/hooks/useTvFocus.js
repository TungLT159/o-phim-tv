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
  let bestScore = Infinity;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();
    const gap = direction === 'ArrowRight' ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    const elMidY = r.top + r.height / 2;
    const dy = Math.abs(elMidY - midY);

    // Must be in same row (strict Y tolerance)
    const maxDy = rect.height * 1.5;
    if (dy > maxDy) return;

    const score = gap + dy * 0.8;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  });

  // Fallback: widen Y search if no same-row match
  if (!best) {
    elements.forEach((el) => {
      if (el === current || el === document.body) return;
      const r = el.getBoundingClientRect();
      const gap = direction === 'ArrowRight' ? (r.left - rect.right) : (rect.left - r.right);
      if (gap <= 0) return;

      const elMidY = r.top + r.height / 2;
      const dy = Math.abs(elMidY - midY);

      if (dy > rect.height * 3) return;

      const score = gap + dy * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });
  }

  return best;
}

function findVertical(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  let best = null;
  let bestScore = Infinity;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();
    const gap = direction === 'ArrowDown' ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const elMidX = r.left + r.width / 2;
    const dx = Math.abs(elMidX - midX);

    // Must be in same column (strict X tolerance)
    const maxDx = rect.width * 1.5;
    if (dx > maxDx) return;

    // Score: prefer closer vertically, then closer horizontally
    const score = gap + dx * 0.8;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  });

  // Fallback: if no element in same column, widen search
  if (!best) {
    elements.forEach((el) => {
      if (el === current || el === document.body) return;
      const r = el.getBoundingClientRect();
      const gap = direction === 'ArrowDown' ? (r.top - rect.bottom) : (rect.top - r.bottom);
      if (gap <= 0) return;

      const elMidX = r.left + r.width / 2;
      const dx = Math.abs(elMidX - midX);

      if (dx > rect.width * 4) return;

      const score = gap + dx * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    });
  }

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

          const vertical = e.key === 'ArrowDown' || e.key === 'ArrowUp';
          const target = vertical
            ? findVertical(focusable, focused, e.key)
            : findHorizontal(focusable, focused, e.key);

          if (target) {
            target.focus();
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          break;
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
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
