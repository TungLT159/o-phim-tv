import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '../tauri-bridge';
import { throttle } from '../utils/throttle';

// Zone skip rules for fast navigation
const ZONE_SKIP_RULES = {
  2: { // Player controls zone
    ArrowDown: { targetZone: 3, targetRow: 0 },
  },
  3: { // Episode sidebar zone
    ArrowUp: { targetZone: 2, restoreLastFocus: true },
  },
};

const FocusContext = createContext(null);

// Grid of focusable refs: grid[zone][row][col] = ref
// zone 0 = sidebar, zone 1 = content

const initialState = {
  zone: 1,
  row: 0,
  col: 0,
  rowMemory: {},
  grid: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  maxRows: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  isActive: false,
  activeTrap: null,
  savedFocus: null,
  // NEW: Acceleration state
  accelerationState: {
    activeKey: null,
    startTime: null,
    stepMultiplier: 1,
    intervalId: null,
  },
  // NEW: Zone skip tracking
  lastFocusPerZone: {
    0: { row: 0, col: 0 },
    1: { row: 0, col: 0 },
    2: { row: 0, col: 0 },
    3: { row: 0, col: 0 },
    4: { row: 0, col: 0 },
    5: { row: 0, col: 0 },
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'REGISTER': {
      const { zone, row, col, ref } = action;
      const grid = { ...state.grid };
      if (!grid[zone]) grid[zone] = {};
      if (!grid[zone][row]) grid[zone][row] = {};
      grid[zone][row][col] = ref;
      const maxRows = { ...state.maxRows };
      maxRows[zone] = Math.max(maxRows[zone] || 0, row);
      return { ...state, grid, maxRows };
    }
    case 'UNREGISTER': {
      const { zone, row, col } = action;
      const grid = { ...state.grid };
      if (grid[zone]?.[row]) {
        delete grid[zone][row][col];
      }
      return { ...state, grid };
    }
    case 'NAVIGATE': {
      const { direction } = action;
      const { zone, row, col, grid, maxRows, rowMemory, activeTrap, accelerationState, lastFocusPerZone } = state;
      
      // Extract step multiplier from acceleration state
      const stepMultiplier = accelerationState?.stepMultiplier || 1;

      // Check zone skip rules first (only if not trapped)
      if (activeTrap === null) {
        const skipRule = ZONE_SKIP_RULES[zone]?.[direction];
        if (skipRule) {
          const { targetZone, targetRow, restoreLastFocus } = skipRule;
          
          // Save current focus before skipping
          const updatedLastFocus = {
            ...lastFocusPerZone,
            [zone]: { row, col },
          };

          let finalRow = targetRow;
          let finalCol = 0;

          // Restore last focus if rule specifies
          if (restoreLastFocus && lastFocusPerZone[targetZone]) {
            finalRow = lastFocusPerZone[targetZone].row;
            finalCol = lastFocusPerZone[targetZone].col;
          } else {
            // Use default first column
            const rowCols = Object.keys(grid[targetZone]?.[targetRow] || {}).map(Number).sort((a,b) => a-b);
            finalCol = rowCols.length ? rowCols[0] : 0;
          }

          return {
            ...state,
            zone: targetZone,
            row: finalRow,
            col: finalCol,
            lastFocusPerZone: updatedLastFocus,
          };
        }
      }

      // If focus trapped, only allow navigation within trapped zone
      if (activeTrap !== null && zone === activeTrap) {
        const trapGrid = grid[activeTrap];
        let newRow = row;
        let newCol = col;

        if (direction === 'ArrowDown') {
          newRow = findNextRow(trapGrid, row, stepMultiplier);
          if (newRow !== row) {
            const rowCols = Object.keys(trapGrid?.[newRow] || {}).map(Number).sort((a,b) => a-b);
            if (rowCols.length) {
              newCol = rowCols.reduce((prev, curr) =>
                Math.abs(curr - col) < Math.abs(prev - col) ? curr : prev
              );
            }
          }
        } else if (direction === 'ArrowUp') {
          newRow = findPrevRow(trapGrid, row, stepMultiplier);
          if (newRow !== row) {
            const rowCols = Object.keys(trapGrid?.[newRow] || {}).map(Number).sort((a,b) => a-b);
            if (rowCols.length) {
              newCol = rowCols.reduce((prev, curr) =>
                Math.abs(curr - col) < Math.abs(prev - col) ? curr : prev
              );
            }
          }
        } else if (direction === 'ArrowRight') {
          const cols = Object.keys(trapGrid?.[row] || {}).map(Number).sort((a,b) => a-b);
          const nextCol = cols.find(c => c > col);
          if (nextCol !== undefined) newCol = nextCol;
        } else if (direction === 'ArrowLeft') {
          const cols = Object.keys(trapGrid?.[row] || {}).map(Number).sort((a,b) => a-b);
          const prevCol = cols.slice().reverse().find(c => c < col);
          if (prevCol !== undefined) newCol = prevCol;
        }

        return { ...state, row: newRow, col: newCol };
      }

      // Normal navigation (no trap active)
      let newZone = zone;
      let newRow = row;
      let newCol = col;

      if (direction === 'ArrowRight') {
        const cols = Object.keys(grid[zone]?.[row] || {}).map(Number).sort((a,b) => a-b);
        const nextCol = cols.find(c => c > col);
        if (nextCol !== undefined) {
          newCol = nextCol;
        }
      } else if (direction === 'ArrowLeft') {
        const cols = Object.keys(grid[zone]?.[row] || {}).map(Number).sort((a,b) => a-b);
        const prevCol = cols.slice().reverse().find(c => c < col);
        if (prevCol !== undefined) {
          newCol = prevCol;
        } else if (zone === 1) {
          const sidebarRow = findNearestRow(grid[0], row, maxRows[0]);
          newZone = 0;
          newRow = sidebarRow;
          newCol = 0;
        }
      } else if (direction === 'ArrowDown') {
        newRow = findNextRow(grid[zone], row, stepMultiplier);
        if (newRow !== row) {
          const memKey = `${zone}-${newRow}`;
          if (rowMemory[memKey] !== undefined) {
            newCol = rowMemory[memKey];
          } else {
            const rowCols = Object.keys(grid[zone]?.[newRow] || {}).map(Number).sort((a,b) => a-b);
            if (rowCols.length) {
              newCol = rowCols.reduce((prev, curr) =>
                Math.abs(curr - col) < Math.abs(prev - col) ? curr : prev
              );
            }
          }
        }
      } else if (direction === 'ArrowUp') {
        newRow = findPrevRow(grid[zone], row, stepMultiplier);
        if (newRow !== row) {
          const memKey = `${zone}-${newRow}`;
          if (rowMemory[memKey] !== undefined) {
            newCol = rowMemory[memKey];
          } else {
            const rowCols = Object.keys(grid[zone]?.[newRow] || {}).map(Number).sort((a,b) => a-b);
            if (rowCols.length) {
              newCol = rowCols.reduce((prev, curr) =>
                Math.abs(curr - col) < Math.abs(prev - col) ? curr : prev
              );
            }
          }
        }
      }

      const nextMemory = { ...rowMemory };
      if (newRow !== row) {
        nextMemory[`${zone}-${row}`] = col;
      }

      if (direction === 'ArrowRight' && zone === 0) {
        const contentRow = findNearestRow(grid[1], row, maxRows[1]);
        newZone = 1;
        newRow = contentRow;
        const rowCols = Object.keys(grid[1]?.[newRow] || {}).map(Number).sort((a,b) => a-b);
        newCol = rowCols.length ? rowCols[0] : 0;
      }

      return { ...state, zone: newZone, row: newRow, col: newCol, rowMemory: nextMemory };
    }
    case 'SAVE_FOCUS': {
      return { ...state, savedFocus: { zone: state.zone, row: state.row, col: state.col, scrollY: window.scrollY } };
    }
    case 'RESTORE_FOCUS': {
      const saved = state.savedFocus;
      if (!saved) return state;
      requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
      return { ...state, zone: saved.zone, row: saved.row, col: saved.col };
    }
    case 'SET_TRAP': {
      const { zone: trapZone } = action;
      return {
        ...state,
        activeTrap: trapZone,
        savedFocus: { zone: state.zone, row: state.row, col: state.col },
      };
    }
    case 'CLEAR_TRAP': {
      const restored = state.savedFocus;
      if (!restored) {
        console.warn('CLEAR_TRAP called without savedFocus');
        return state; // No-op if no saved focus
      }
      return {
        ...state,
        activeTrap: null,
        savedFocus: null,
        zone: restored.zone,
        row: restored.row,
        col: restored.col,
      };
    }
    case 'START_ACCELERATION': {
      const { key } = action;
      return {
        ...state,
        accelerationState: {
          activeKey: key,
          startTime: Date.now(),
          stepMultiplier: 1,
          intervalId: null,
        },
      };
    }
    case 'UPDATE_ACCELERATION': {
      const { multiplier, intervalId } = action;
      return {
        ...state,
        accelerationState: {
          ...state.accelerationState,
          stepMultiplier: multiplier,
          intervalId: intervalId ?? state.accelerationState?.intervalId,
        },
      };
    }
    case 'STOP_ACCELERATION': {
      if (state.accelerationState?.intervalId) {
        clearInterval(state.accelerationState.intervalId);
      }
      return {
        ...state,
        accelerationState: {
          activeKey: null,
          startTime: null,
          stepMultiplier: 1,
          intervalId: null,
        },
      };
    }
    case 'SAVE_ZONE_FOCUS': {
      const { zone, row, col } = action;
      return {
        ...state,
        lastFocusPerZone: {
          ...state.lastFocusPerZone,
          [zone]: { row, col },
        },
      };
    }
    case 'SKIP_TO_ZONE': {
      const { targetZone, targetRow, targetCol, restoreLastFocus } = action;
      
      if (restoreLastFocus && state.lastFocusPerZone[targetZone]) {
        const saved = state.lastFocusPerZone[targetZone];
        return {
          ...state,
          zone: targetZone,
          row: saved.row,
          col: saved.col,
        };
      }
      
      return {
        ...state,
        zone: targetZone,
        row: targetRow ?? 0,
        col: targetCol ?? 0,
      };
    }
    default:
      return state;
  }
}

function findNearestRow(zoneGrid, targetRow, maxRow) {
  if (!zoneGrid || !Object.keys(zoneGrid).length) return 0;
  const rows = Object.keys(zoneGrid).map(Number).sort((a,b) => a-b);
  if (!rows.length) return 0;
  return rows.reduce((prev, curr) =>
    Math.abs(curr - targetRow) < Math.abs(prev - targetRow) ? curr : prev
  );
}

function findNextRow(zoneGrid, currentRow, stepMultiplier = 1) {
  if (!zoneGrid) return currentRow;
  const rows = Object.keys(zoneGrid).map(Number).sort((a,b) => a-b);
  const currentIndex = rows.indexOf(currentRow);
  
  if (currentIndex === -1) {
    // Current row not in grid, return first row
    return rows[0] ?? currentRow;
  }
  
  const targetIndex = Math.min(
    currentIndex + stepMultiplier,
    rows.length - 1
  );
  return rows[targetIndex];
}

function findPrevRow(zoneGrid, currentRow, stepMultiplier = 1) {
  if (!zoneGrid) return currentRow;
  const rows = Object.keys(zoneGrid).map(Number).sort((a,b) => a-b);
  const currentIndex = rows.indexOf(currentRow);
  
  if (currentIndex === -1) {
    // Current row not in grid, return last row
    return rows[rows.length - 1] ?? currentRow;
  }
  
  const targetIndex = Math.max(
    currentIndex - stepMultiplier,
    0
  );
  return rows[targetIndex];
}

export function FocusProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refMap = useRef(new Map());
  const prevStateRef = useRef({ zone: 1, row: 0, col: 0 });
  const accelerationIntervalRef = useRef(null);
  const isTv = isTauri();

  const register = useCallback((zone, row, col, domRef) => {
    dispatch({ type: 'REGISTER', zone, row, col, ref: domRef });
    refMap.current.set(`${zone}-${row}-${col}`, domRef);
  }, []);

  const unregister = useCallback((zone, row, col) => {
    dispatch({ type: 'UNREGISTER', zone, row, col });
    refMap.current.delete(`${zone}-${row}-${col}`);
  }, []);

  const saveFocus = useCallback(() => {
    dispatch({ type: 'SAVE_FOCUS' });
  }, []);

  const restoreFocus = useCallback(() => {
    dispatch({ type: 'RESTORE_FOCUS' });
  }, []);

  const setTrap = useCallback((trapZone) => {
    dispatch({ type: 'SET_TRAP', zone: trapZone });
  }, []);

  const clearTrap = useCallback(() => {
    dispatch({ type: 'CLEAR_TRAP' });
  }, []);

  const focusCurrent = useCallback((scrollBehavior = 'smooth') => {
    const key = `${state.zone}-${state.row}-${state.col}`;
    const domRef = refMap.current.get(key);
    if (domRef && domRef.current) {
      domRef.current.focus();
      
      // Determine if should scroll to center
      const prevState = prevStateRef.current;
      const shouldCenter = (
        state.row !== prevState.row ||
        state.zone !== prevState.zone
      );
      
      domRef.current.scrollIntoView?.({
        block: shouldCenter ? 'center' : 'nearest',
        inline: 'nearest',
        behavior: scrollBehavior,
      });
      
      // Update previous state
      prevStateRef.current = {
        zone: state.zone,
        row: state.row,
        col: state.col,
      };
    }
  }, [state.zone, state.row, state.col]);

  // Focus element when state changes
  useEffect(() => {
    focusCurrent('auto');
  }, [focusCurrent]);

  useEffect(() => {
    const timer = setTimeout(() => focusCurrent('auto'), 0);
    return () => clearTimeout(timer);
  }, [focusCurrent]);

  // Keyboard handler with acceleration
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target?.closest?.('.custom-video-player')) return;

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
        
        // Navigate first for immediate response
        dispatch({ type: 'NAVIGATE', direction: e.key });
        
        // Prevent key repeat from creating multiple intervals
        if (e.repeat) return;
        
        // Start acceleration if not already started
        if (!state.accelerationState?.activeKey) {
          const startTime = Date.now();
          dispatch({ type: 'START_ACCELERATION', key: e.key });
          
          // Start acceleration interval
          const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            let multiplier = 1;
            
            if (elapsed >= 2000) multiplier = 8;
            else if (elapsed >= 1000) multiplier = 4;
            else if (elapsed >= 500) multiplier = 2;
            
            dispatch({ type: 'UPDATE_ACCELERATION', multiplier, intervalId });
            dispatch({ type: 'NAVIGATE', direction: e.key });
          }, 150);
          
          accelerationIntervalRef.current = intervalId;
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused && focused !== document.body) {
          e.preventDefault();
          focused.click();
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        window.history.back();
      }
    };

    const handleKeyUp = (e) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (arrowKeys.includes(e.key)) {
        if (accelerationIntervalRef.current) {
          clearInterval(accelerationIntervalRef.current);
          accelerationIntervalRef.current = null;
        }
        dispatch({ type: 'STOP_ACCELERATION' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (accelerationIntervalRef.current) {
        clearInterval(accelerationIntervalRef.current);
      }
    };
  }, [state.accelerationState]);

  const value = {
    state,
    register,
    unregister,
    saveFocus,
    restoreFocus,
    setTrap,
    clearTrap,
  };

  return React.createElement(FocusContext.Provider, { value }, children);
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be inside FocusProvider');
  return ctx;
}

export function useFocusable(zone, row, col) {
  const { register, unregister, state } = useFocus();
  const ref = useRef(null);

  useEffect(() => {
    register(zone, row, col, ref);
    return () => unregister(zone, row, col);
  }, [zone, row, col, register, unregister]);

  const focused = state.zone === zone && state.row === row && state.col === col;

  return { ref, focused, zone: state.zone, row: state.row, col: state.col };
}
