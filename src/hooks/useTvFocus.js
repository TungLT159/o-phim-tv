import { useEffect, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), .movie-card, .episode-scroll__item, [role="button"]';

function getFocusable() {
  return document.querySelectorAll(FOCUSABLE);
}

function getGridPosition(el) {
  const rect = el?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function findBestMatch(elements, current, key) {
  const currentPos = getGridPosition(current);
  let best = null;
  let bestDist = Infinity;

  elements.forEach((el) => {
    if (el === current || el === document.body) return;
    const pos = getGridPosition(el);
    let dx = pos.x - currentPos.x;
    let dy = pos.y - currentPos.y;

    switch (key) {
      case 'ArrowDown':
        if (dy <= 0) return;
        break;
      case 'ArrowUp':
        if (dy >= 0) return;
        break;
      case 'ArrowRight':
        if (dx <= 0) return;
        break;
      case 'ArrowLeft':
        if (dx >= 0) return;
        break;
    }

    // Prefer same column (small horizontal offset) for vertical moves
    // Prefer same row (small vertical offset) for horizontal moves
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      dx = Math.abs(dx);
    } else {
      dy = Math.abs(dy);
    }

    const dist = Math.sqrt(dx * dx + dy * dy);
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

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' ||
          e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const focusable = getFocusable();
        if (focusable.length === 0) return;

        const target = findBestMatch(focusable, focused, e.key);
        if (target) target.focus();
        return;
      }

      switch (e.key) {
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
