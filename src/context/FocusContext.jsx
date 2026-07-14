import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  destroy,
  doesFocusableExist,
  getCurrentFocusKey,
  init,
  setFocus,
  useFocusable as useNoriginFocusable,
} from '@noriginmedia/norigin-spatial-navigation';

export const FOCUS_KEYS = {
  SIDEBAR: 'SIDEBAR',
  HOME: 'HOME',
  HOME_HERO_PLAY: 'HOME_HERO_PLAY',
  DETAIL: 'DETAIL',
  DETAIL_PLAY: 'DETAIL_PLAY',
  PLAYER: 'PLAYER',
  PLAYER_CONTROLS: 'PLAYER_CONTROLS',
  PLAYER_EPISODES: 'PLAYER_EPISODES',
  SEARCH: 'SEARCH',
  SEARCH_INPUT: 'SEARCH_INPUT',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
};

export const focusKeyForGrid = (zone, row, col) => `TV_${zone}_${row}_${col}`;
export const focusKeyForHomeCard = (rowId, index) => `HOME_CARD_${rowId}_${index}`;
export const focusKeyForSearchResult = (index) => `SEARCH_RESULT_${index}`;
export const focusKeyForPlayerEpisode = (episodeKey, index) => `PLAYER_EPISODE_${episodeKey || index}`;

const FocusContext = createContext(null);

let spatialNavigationInitialized = false;

function ensureSpatialNavigationInitialized() {
  if (spatialNavigationInitialized) return;
  init({ shouldFocusDOMNode: true });
  spatialNavigationInitialized = true;
}

function destroySpatialNavigationForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  destroy();
  spatialNavigationInitialized = false;
}

function isTextEditingElement(element) {
  if (!element || element === document.body) return false;
  const tagName = element.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || Boolean(element.isContentEditable);
}

function shouldIgnoreBackNavigation(event) {
  const target = event.target;
  const activeElement = document.activeElement;

  return Boolean(
      isTextEditingElement(target) ||
      isTextEditingElement(activeElement) ||
      document.querySelector?.('.custom-video-player') ||
      target?.closest?.('.custom-video-player') ||
      activeElement?.closest?.('.custom-video-player'),
  );
}

function parseGridFocusKey(focusKey) {
  const match = /^TV_(\d+)_(\d+)_(\d+)$/.exec(focusKey || '');
  if (!match) return null;
  return {
    zone: Number(match[1]),
    row: Number(match[2]),
    col: Number(match[3]),
  };
}

function createFocusState(focusKey) {
  const parsed = parseGridFocusKey(focusKey);
  return {
    zone: parsed?.zone ?? 1,
    row: parsed?.row ?? 0,
    col: parsed?.col ?? 0,
    focusKey: focusKey || focusKeyForGrid(1, 0, 0),
    activeTrap: null,
    savedFocus: null,
  };
}

function normalizeFocusableConfig(configOrZone, row, col) {
  if (typeof configOrZone === 'object' && configOrZone !== null) {
    return configOrZone;
  }

  return {
    focusKey: focusKeyForGrid(configOrZone, row, col),
  };
}

function getZoneRowCol(configOrZone, row, col, focusKey) {
  if (typeof configOrZone !== 'object' || configOrZone === null) {
    return { zone: configOrZone, row, col };
  }

  return parseGridFocusKey(focusKey) || { zone: undefined, row: undefined, col: undefined };
}

function scheduleTask(callback) {
  if (typeof requestAnimationFrame === 'function') {
    const frameId = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(frameId);
  }

  const timerId = setTimeout(callback, 0);
  return () => clearTimeout(timerId);
}

export function FocusProvider({ children }) {
  const registeredKeysRef = useRef(new Set());
  const firstRegisteredKeyRef = useRef(null);
  const lastContentFocusKeyRef = useRef(FOCUS_KEYS.HOME_HERO_PLAY);
  const [state, setState] = useState(() => createFocusState(getCurrentFocusKey?.()));

  useEffect(() => {
    ensureSpatialNavigationInitialized();

    const handleKeyDown = (event) => {
      if (event.key !== 'Backspace' && event.key !== 'Escape') return;
      if (shouldIgnoreBackNavigation(event)) return;

      event.preventDefault();
      window.history.back();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      destroySpatialNavigationForTests();
    };
  }, []);

  const syncFocusState = useCallback((focusKey) => {
    setState((current) => {
      const next = createFocusState(focusKey);
      if (
        current.focusKey === next.focusKey &&
        current.zone === next.zone &&
        current.row === next.row &&
        current.col === next.col
      ) {
        return current;
      }

      return {
        ...current,
        ...next,
        activeTrap: current.activeTrap,
        savedFocus: current.savedFocus,
      };
    });
  }, []);

  const registerFocusable = useCallback((focusKey) => {
    if (!focusKey) return;
    registeredKeysRef.current.add(focusKey);
    if (!firstRegisteredKeyRef.current) {
      firstRegisteredKeyRef.current = focusKey;
    }
  }, []);

  const unregisterFocusable = useCallback((focusKey) => {
    if (!focusKey) return;
    registeredKeysRef.current.delete(focusKey);
    if (firstRegisteredKeyRef.current === focusKey) {
      firstRegisteredKeyRef.current = registeredKeysRef.current.values().next().value || null;
    }
  }, []);

  const isFirstRegisteredFocusable = useCallback((focusKey) => (
    Boolean(focusKey) && firstRegisteredKeyRef.current === focusKey
  ), []);

  const focusKeyIfAvailable = useCallback((focusKey) => {
    if (!focusKey) return false;
    if (typeof doesFocusableExist === 'function' && !doesFocusableExist(focusKey)) return false;
    setFocus(focusKey);
    syncFocusState(focusKey);
    return true;
  }, [syncFocusState]);

  const saveFocus = useCallback(() => {
    const currentFocusKey = getCurrentFocusKey?.() || state.focusKey;
    setState((current) => ({
      ...current,
      savedFocus: {
        ...createFocusState(currentFocusKey),
        scrollY: window.scrollY || 0,
      },
    }));
  }, [state.focusKey]);

  const restoreFocus = useCallback(() => {
    const saved = state.savedFocus;
    if (!saved?.focusKey) return;
    focusKeyIfAvailable(saved.focusKey);
    if (typeof saved.scrollY === 'number') {
      window.scrollTo?.(0, saved.scrollY);
    }
  }, [focusKeyIfAvailable, state.savedFocus]);

  const setTrap = useCallback((trapZone, row = 0, col = 0) => {
    const focusKey = focusKeyForGrid(trapZone, row, col);
    setState((current) => ({ ...current, activeTrap: trapZone }));
    focusKeyIfAvailable(focusKey);
  }, [focusKeyIfAvailable]);

  const clearTrap = useCallback(() => {
    setState((current) => ({ ...current, activeTrap: null }));
  }, []);

  const setFocusPosition = useCallback((zone, row, col) => {
    const focusKey = focusKeyForGrid(zone, row, col);
    setState((current) => ({ ...current, ...createFocusState(focusKey) }));
  }, []);

  const skipToZone = useCallback((targetZone, targetRow = 0, targetCol = 0) => {
    const focusKey = focusKeyForGrid(targetZone, targetRow, targetCol);
    focusKeyIfAvailable(focusKey);
  }, [focusKeyIfAvailable]);

  const focusByKey = useCallback((focusKey) => {
    return focusKeyIfAvailable(focusKey);
  }, [focusKeyIfAvailable]);

  const rememberContentFocus = useCallback((focusKey) => {
    if (focusKey) lastContentFocusKeyRef.current = focusKey;
  }, []);

  const restoreContentFocus = useCallback(() => {
    return focusKeyIfAvailable(lastContentFocusKeyRef.current);
  }, [focusKeyIfAvailable]);

  const value = useMemo(() => ({
    state,
    registerFocusable,
    unregisterFocusable,
    focusKeyIfAvailable,
    isFirstRegisteredFocusable,
    syncFocusState,
    saveFocus,
    restoreFocus,
    setTrap,
    clearTrap,
    skipToZone,
    setFocusPosition,
    focusByKey,
    rememberContentFocus,
    restoreContentFocus,
    getCurrentFocusKey,
  }), [
    clearTrap,
    focusByKey,
    focusKeyIfAvailable,
    registerFocusable,
    rememberContentFocus,
    restoreContentFocus,
    restoreFocus,
    saveFocus,
    setFocusPosition,
    setTrap,
    skipToZone,
    state,
    syncFocusState,
    unregisterFocusable,
  ]);

  return React.createElement(FocusContext.Provider, { value }, children);
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be inside FocusProvider');
  return ctx;
}

export function useOptionalFocus() {
  return useContext(FocusContext);
}

export function useFocusable(configOrZone, row, col) {
  const ctx = useOptionalFocus();
  const registerFocusable = ctx?.registerFocusable;
  const unregisterFocusable = ctx?.unregisterFocusable;
  const isFirstRegisteredFocusable = ctx?.isFirstRegisteredFocusable;
  const syncFocusState = ctx?.syncFocusState;
  const fallbackRef = useRef(null);
  const config = normalizeFocusableConfig(configOrZone, row, col);
  const focusKey = config.focusKey;
  const noriginResult = useNoriginFocusable(config) || {};
  const noriginRef = noriginResult.ref || fallbackRef;
  const noriginFocusSelf = noriginResult.focusSelf || (() => setFocus(focusKey));
  const norigin = {
    ref: noriginRef,
    focused: false,
    hasFocusedChild: false,
    focusSelf: noriginFocusSelf,
    ...noriginResult,
  };
  const { zone, row: gridRow, col: gridCol } = getZoneRowCol(configOrZone, row, col, focusKey);

  useEffect(() => {
    registerFocusable?.(focusKey);

    return () => {
      unregisterFocusable?.(focusKey);
    };
  }, [focusKey, registerFocusable, unregisterFocusable]);

  useEffect(() => {
    if (!focusKey || !norigin.ref?.current) return undefined;

    return scheduleTask(() => {
      if (!isFirstRegisteredFocusable?.(focusKey)) return;
      if (document.activeElement && document.activeElement !== document.body) return;
      norigin.ref.current?.focus?.();
      syncFocusState?.(focusKey);
    });
  }, [focusKey, isFirstRegisteredFocusable, norigin.ref, syncFocusState]);

  useEffect(() => {
    if (!focusKey || !norigin.ref?.current) return undefined;

    return scheduleTask(() => {
      const currentFocusKey = getCurrentFocusKey?.();
      if (currentFocusKey !== focusKey || !doesFocusableExist?.(focusKey)) {
        return;
      }

      if (typeof noriginFocusSelf === 'function') {
        noriginFocusSelf();
      } else {
        setFocus(focusKey);
      }
      norigin.ref?.current?.focus?.();
      syncFocusState?.(focusKey);
    });
  }, [focusKey, norigin.ref, noriginFocusSelf, syncFocusState]);

  useEffect(() => {
    const element = norigin.ref?.current;
    if (!element || !focusKey) return undefined;

    const handleFocus = () => syncFocusState?.(focusKey);
    element.addEventListener('focus', handleFocus);
    return () => element.removeEventListener('focus', handleFocus);
  }, [focusKey, norigin.ref, syncFocusState]);

  const contextFocused = stateMatchesFocusKey(ctx?.state, focusKey);
  const focused = Boolean(norigin.focused || contextFocused);

  return {
    ...norigin,
    focused,
    focusKey,
    zone,
    row: gridRow,
    col: gridCol,
  };
}

function stateMatchesFocusKey(state, focusKey) {
  if (state?.focusKey === focusKey) return true;
  const parsed = parseGridFocusKey(focusKey);
  if (!state || !parsed) return false;
  return state.zone === parsed.zone && state.row === parsed.row && state.col === parsed.col;
}
