import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '../tauri-bridge';

const FocusContext = createContext(null);

// Grid of focusable refs: grid[zone][row][col] = ref
// zone 0 = sidebar, zone 1 = content

const initialState = {
  zone: 1,
  row: 0,
  col: 0,
  rowMemory: {},  // { [rowKey]: lastCol }
  grid: { 0: {}, 1: {} },  // zone -> row -> col -> ref/callback
  maxRows: { 0: 0, 1: 0 },  // zone -> max row count
  isActive: false,
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
      const { zone, row, col, grid, maxRows, rowMemory } = state;

      let newZone = zone;
      let newRow = row;
      let newCol = col;

      if (direction === 'ArrowRight') {
        // Find next col in same row
        const cols = Object.keys(grid[zone]?.[row] || {}).map(Number).sort((a,b) => a-b);
        const nextCol = cols.find(c => c > col);
        if (nextCol !== undefined) {
          newCol = nextCol;
        }
      } else if (direction === 'ArrowLeft') {
        // Find prev col in same row, or cross to sidebar
        const cols = Object.keys(grid[zone]?.[row] || {}).map(Number).sort((a,b) => a-b);
        const prevCol = cols.slice().reverse().find(c => c < col);
        if (prevCol !== undefined) {
          newCol = prevCol;
        } else if (zone === 1) {
          // Cross to sidebar — find closest Y row
          const sidebarRow = findNearestRow(grid[0], row, maxRows[0]);
          newZone = 0;
          newRow = sidebarRow;
          newCol = 0;
        }
      } else if (direction === 'ArrowDown') {
        const rowKey = `${zone}-${row}`;
        newRow = Math.min(row + 1, maxRows[zone] || 0);
        if (newRow !== row) {
          // Use memory or find closest col
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
        newRow = Math.max(row - 1, 0);
        if (newRow !== row && zone === 1) {
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
        // Row 0 in zone 0 is Home
      }

      // Save memory when moving away from row
      const nextMemory = { ...rowMemory };
      if (newRow !== row) {
        nextMemory[`${zone}-${row}`] = col;
      }

      // If crossing from sidebar to content (Right from zone 0)
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

export function FocusProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refMap = useRef(new Map());
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

  // Focus element when state changes
  useEffect(() => {
    const key = `${state.zone}-${state.row}-${state.col}`;
    const domRef = refMap.current.get(key);
    if (domRef && domRef.current) {
      domRef.current.focus();
      domRef.current.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [state.zone, state.row, state.col]);

  // Keyboard handler
  useEffect(() => {
    if (!isTv) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          dispatch({ type: 'NAVIGATE', direction: e.key });
          break;
        case 'Enter':
        case ' ': {
          const focused = document.activeElement;
          if (focused && focused !== document.body) {
            e.preventDefault();
            focused.click();
          }
          break;
        }
        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          window.history.back();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTv]);

  const value = {
    state,
    register,
    unregister,
    saveFocus,
    restoreFocus,
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
