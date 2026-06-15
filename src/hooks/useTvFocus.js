import { useEffect, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), .movie-card, .episode-scroll__item, [role="button"]';

function getFocusable() {
  return document.querySelectorAll(FOCUSABLE);
}

function findHorizontal(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  const sign = direction === 'ArrowRight' ? 1 : -1;

  // Phase 1: elements whose Y-center overlaps with current element
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    // Y-center falls within current element's Y range
    const targetMidY = r.top + r.height / 2;
    if (targetMidY < rect.top || targetMidY > rect.bottom) return;

    if (gap < bestScore) {
      bestScore = gap;
      best = el;
    }
  });

  if (best) return best;

  // Phase 2: widen Y overlap by 1 element height
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    const targetMidY = r.top + r.height / 2;
    const dy = Math.min(
      Math.abs(targetMidY - rect.top),
      Math.abs(targetMidY - rect.bottom)
    );
    if (dy > rect.height * 2) return;

    const score = gap + dy * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  });

  if (best) return best;

  // Phase 3 (horizontal only): closest element in direction, any Y
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.left - rect.right) : (rect.left - r.right);
    if (gap <= 0) return;

    if (gap < bestScore) {
      bestScore = gap;
      best = el;
    }
  });

  return best;
}

function findVertical(elements, current, direction) {
  const rect = current.getBoundingClientRect();
  let best = null;
  let bestScore = Infinity;
  const sign = direction === 'ArrowDown' ? 1 : -1;

  // Phase 1: elements whose X-center overlaps with current element
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    // X-center falls within current element's X range
    const targetMidX = r.left + r.width / 2;
    if (targetMidX < rect.left || targetMidX > rect.right) return;

    if (gap < bestScore) {
      bestScore = gap;
      best = el;
    }
  });

  if (best) return best;

  // Phase 2: widen X overlap by 1 element width
  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();

    const gap = sign > 0 ? (r.top - rect.bottom) : (rect.top - r.bottom);
    if (gap <= 0) return;

    const targetMidX = r.left + r.width / 2;
    const dx = Math.min(
      Math.abs(targetMidX - rect.left),
      Math.abs(targetMidX - rect.right)
    );
    if (dx > rect.width * 2) return;

    const score = gap + dx * 0.5;
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
