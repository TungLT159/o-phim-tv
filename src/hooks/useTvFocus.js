import { useEffect, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), .movie-card, .episode-scroll__item, [role="button"]';

function getFocusable() {
  return document.querySelectorAll(FOCUSABLE);
}

function isInside(parent, child) {
  if (!parent || !child) return false;
  let el = child;
  while (el) {
    if (el === parent) return true;
    el = el.parentElement;
  }
  return false;
}

function findHorizontal(elements, current, direction) {
  // Try DOM sibling first — works for cards in same ContentRow
  const sibling = direction === 'ArrowRight'
    ? current.nextElementSibling
    : current.previousElementSibling;

  if (sibling && sibling.matches?.(FOCUSABLE)) {
    return sibling;
  }

  const rect = current.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  const sign = direction === 'ArrowRight' ? 1 : -1;

  elements.forEach((el) => {
    if (el === current || el === document.body || isInside(current, el)) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    // Must be in same Y row
    const targetMidY = r.top + r.height / 2;
    if (targetMidY < rect.top - 10 || targetMidY > rect.bottom + 10) return;

    if (gap < bestScore) {
      bestScore = gap;
      best = el;
    }
  });

  if (best) return best;

  // Left from first item: any element to the left (sidebar)
  if (direction === 'ArrowLeft') {
    elements.forEach((el) => {
      if (el === current || el === document.body || isInside(current, el)) return;
      const r = el.getBoundingClientRect();
      const gap = rect.left - r.right;
      if (gap <= 0) return;
      if (gap < bestScore) {
        bestScore = gap;
        best = el;
      }
    });
  }

  return best;
}

function findVertical(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  const sign = direction === 'ArrowDown' ? 1 : -1;
  const currentMidX = rect.left + rect.width / 2;

  // Score = vertical gap * 3 + horizontal distance
  // This finds the closest element below, preferring same column
  elements.forEach((el) => {
    if (el === current || el === document.body || isInside(current, el)) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const targetMidX = r.left + r.width / 2;
    const dx = Math.abs(targetMidX - currentMidX);
    const score = gap * 3 + dx;

    if (score < bestScore) {
      bestScore = score;
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

    // Auto-focus hero on load
    const timer = setTimeout(() => {
      const hero = document.querySelector('.tv-hero');
      if (hero) hero.focus();
    }, 400);

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
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
