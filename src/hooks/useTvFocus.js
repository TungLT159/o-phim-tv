import { useEffect, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), .movie-card, .episode-scroll__item, [role="button"]';

function getFocusable() {
  return document.querySelectorAll(FOCUSABLE);
}

function findHorizontal(elements, current, direction) {
  // Try sibling first — most intuitive for row navigation
  const sibling = direction === 'ArrowRight'
    ? current.nextElementSibling
    : current.previousElementSibling;

  if (sibling && (sibling.matches?.(FOCUSABLE) || sibling.querySelector?.(FOCUSABLE))) {
    return sibling.matches?.(FOCUSABLE) ? sibling : sibling.querySelector?.(FOCUSABLE);
  }

  // Fallback: spatial search within same row
  const rect = current.getBoundingClientRect();
  let best = null;
  let bestGap = Infinity;
  const sign = direction === 'ArrowRight' ? 1 : -1;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    // Y-center must overlap
    const targetMidY = r.top + r.height / 2;
    if (targetMidY < rect.top - 4 || targetMidY > rect.bottom + 4) return;

    if (gap < bestGap) {
      bestGap = gap;
      best = el;
    }
  });

  // Phase 2: closest in any row
  if (!best) {
    elements.forEach((el) => {
      if (el === current || el === document.body) return;
      const r = el.getBoundingClientRect();

      const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
      if (gap <= 0) return;

      if (gap < bestGap) {
        bestGap = gap;
        best = el;
      }
    });
  }

  return best;
}

function findVertical(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  let best = null;
  let bestGap = Infinity;
  const sign = direction === 'ArrowDown' ? 1 : -1;

  // Phase 1: X-center overlaps with current element
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const targetMidX = r.left + r.width / 2;
    if (targetMidX < rect.left - 4 || targetMidX > rect.right + 4) return;

    if (gap < bestGap) {
      bestGap = gap;
      best = el;
    }
  });

  if (best) return best;

  // Phase 2: widen X overlap by 2x width
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const targetMidX = r.left + r.width / 2;
    const curMidX = rect.left + rect.width / 2;
    const dx = Math.abs(targetMidX - curMidX);
    if (dx > rect.width * 2.5) return;

    const score = gap + dx;
    if (score < bestGap) {
      bestGap = score;
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
