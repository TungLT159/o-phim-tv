# Focus Navigation Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\- [ ]\) syntax for tracking.

**Goal:** Refactor focus navigation system với smooth scrolling, key acceleration, zone skipping, và seek enhancements.

**Architecture:** Thêm acceleration engine vào FocusContext, implement zone skip rules, smart scroll centering, và seek tooltip với acceleration cho CustomVideoPlayer.

**Tech Stack:** React, React Hooks, vanilla JavaScript (không cần package mới)

---

## File Structure

### Files to Create:
- \src/components/video-player/seek-tooltip/SeekTooltip.jsx\ - Tooltip hiển thị thời gian khi tua
- \src/components/video-player/seek-tooltip/seek-tooltip.scss\ - Styles cho tooltip
- \src/utils/throttle.js\ - Throttle utility cho performance

### Files to Modify:
- \src/context/FocusContext.jsx\ - Thêm acceleration, zone skip, smart scroll
- \src/components/video-player/CustomVideoPlayer.jsx\ - Thêm seek acceleration và tooltip
- \src/components/video-player/custom-video-player.scss\ - CSS optimizations

---

## Task 1: Create Throttle Utility

**Files:**
- Create: `src/utils/throttle.js`

- [ ] **Step 1: Create throttle utility function**

```javascript
/**
 * Throttle function execution to limit call frequency
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds to wait between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, wait) {
  let timeout = null;
  let previous = 0;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}
```

- [ ] **Step 2: Verify file created**

Run: `Get-Content src/utils/throttle.js`
Expected: File exists with throttle function

- [ ] **Step 3: Commit**

```bash
git add src/utils/throttle.js
git commit -m "feat: add throttle utility for performance optimization"
```

---

## Task 2: Add Acceleration State to FocusContext

**Files:**
- Modify: `src/context/FocusContext.jsx:9-19`

- [ ] **Step 1: Update initialState with acceleration and zone tracking**

Tìm `initialState` object (line 9-19) và thay thế bằng:

```javascript
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
```

- [ ] **Step 2: Verify changes**

Run: `Get-Content src/context/FocusContext.jsx -Head 40`
Expected: See accelerationState and lastFocusPerZone in initialState

- [ ] **Step 3: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): add acceleration and zone tracking state"
```

---

## Task 3: Add Zone Skip Rules Constant

**Files:**
- Modify: `src/context/FocusContext.jsx:5`

- [ ] **Step 1: Add ZONE_SKIP_RULES constant after imports**

Sau dòng `import { isTauri } from '../tauri-bridge';` (line 2), thêm:

```javascript

// Zone skip rules for fast navigation
const ZONE_SKIP_RULES = {
  2: { // Player controls zone
    ArrowDown: { targetZone: 3, targetRow: 0 },
  },
  3: { // Episode sidebar zone
    ArrowUp: { targetZone: 2, restoreLastFocus: true },
  },
};
```

- [ ] **Step 2: Verify constant added**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "ZONE_SKIP_RULES"`
Expected: See ZONE_SKIP_RULES definition

- [ ] **Step 3: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): add zone skip rules for fast navigation"
```

---

## Task 4: Implement Acceleration Actions in Reducer

**Files:**
- Modify: `src/context/FocusContext.jsx:21-188`

- [ ] **Step 1: Add START_ACCELERATION action**

Trong `reducer` function, trước `default:` case (line ~185), thêm:

```javascript
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
```

- [ ] **Step 2: Add UPDATE_ACCELERATION action**

Tiếp tục thêm sau START_ACCELERATION:

```javascript
    case 'UPDATE_ACCELERATION': {
      const { multiplier, intervalId } = action;
      return {
        ...state,
        accelerationState: {
          ...state.accelerationState,
          stepMultiplier: multiplier,
          intervalId: intervalId ?? state.accelerationState.intervalId,
        },
      };
    }
```

- [ ] **Step 3: Add STOP_ACCELERATION action**

Tiếp tục thêm:

```javascript
    case 'STOP_ACCELERATION': {
      if (state.accelerationState.intervalId) {
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
```

- [ ] **Step 4: Add SAVE_ZONE_FOCUS action**

Tiếp tục thêm:

```javascript
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
```

- [ ] **Step 5: Add SKIP_TO_ZONE action**

Tiếp tục thêm:

```javascript
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
```

- [ ] **Step 6: Verify all actions added**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "case 'START_ACCELERATION'|case 'STOP_ACCELERATION'|case 'SKIP_TO_ZONE'"`
Expected: See all 5 new action cases

- [ ] **Step 7: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): implement acceleration and zone skip actions"
```

---

## Task 5: Fix Row Traversal Logic with Acceleration

**Files:**
- Modify: `src/context/FocusContext.jsx:199-211`

- [ ] **Step 1: Replace findNextRow with sequential version**

Tìm function `findNextRow` (line ~199) và thay thế bằng:

```javascript
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
```

- [ ] **Step 2: Replace findPrevRow with sequential version**

Tìm function `findPrevRow` (line ~206) và thay thế bằng:

```javascript
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
```

- [ ] **Step 3: Verify functions updated**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "function findNextRow|function findPrevRow" -Context 0,5`
Expected: See stepMultiplier parameter in both functions

- [ ] **Step 4: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): fix row traversal to support acceleration"
```

---

## Task 6: Update NAVIGATE Action with Acceleration and Zone Skip

**Files:**
- Modify: `src/context/FocusContext.jsx:41-152`

- [ ] **Step 1: Update NAVIGATE case to check zone skip rules first**

Tìm `case 'NAVIGATE':` (line ~41) và thay thế toàn bộ case bằng:

```javascript
    case 'NAVIGATE': {
      const { direction } = action;
      const { zone, row, col, grid, maxRows, rowMemory, activeTrap, accelerationState } = state;
      const stepMultiplier = accelerationState.stepMultiplier;

      // Check zone skip rules first (only if not trapped)
      if (activeTrap === null && ZONE_SKIP_RULES[zone]?.[direction]) {
        const rule = ZONE_SKIP_RULES[zone][direction];
        // Save current focus before skipping
        const newState = {
          ...state,
          lastFocusPerZone: {
            ...state.lastFocusPerZone,
            [zone]: { row, col },
          },
        };
        
        if (rule.restoreLastFocus && newState.lastFocusPerZone[rule.targetZone]) {
          const saved = newState.lastFocusPerZone[rule.targetZone];
          return {
            ...newState,
            zone: rule.targetZone,
            row: saved.row,
            col: saved.col,
          };
        }
        
        return {
          ...newState,
          zone: rule.targetZone,
          row: rule.targetRow ?? 0,
          col: 0,
        };
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
          const memKey = `-`;
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
          const memKey = `-`;
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
        nextMemory[`-`] = col;
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
```

- [ ] **Step 2: Verify NAVIGATE updated**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "Check zone skip rules"`
Expected: See zone skip check in NAVIGATE action

- [ ] **Step 3: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): add zone skip and acceleration to navigation"
```

---

## Task 7: Implement Smart Scroll with Centering

**Files:**
- Modify: `src/context/FocusContext.jsx:244-260`

- [ ] **Step 1: Import throttle utility**

Thêm import ở đầu file (sau line 2):

```javascript
import { throttle } from '../utils/throttle';
```

- [ ] **Step 2: Add previous state tracking ref**

Trong `FocusProvider` function, sau `const refMap = useRef(new Map());` (line ~215), thêm:

```javascript
  const prevStateRef = useRef({ zone: 1, row: 0, col: 0 });
```

- [ ] **Step 3: Replace focusCurrent with smart scroll version**

Tìm `focusCurrent` function (line ~244) và thay thế bằng:

```javascript
  const focusCurrent = useCallback((scrollBehavior = 'smooth') => {
    const key = `--`;
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
```

- [ ] **Step 4: Verify smart scroll implemented**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "shouldCenter"`
Expected: See shouldCenter logic in focusCurrent

- [ ] **Step 5: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): implement smart scroll with centering"
```

---

## Task 8: Add Acceleration Key Tracking

**Files:**
- Modify: `src/context/FocusContext.jsx:269-304`

- [ ] **Step 1: Update keyboard handler to track acceleration**

Tìm `useEffect` với `handleKeyDown` (line ~269) và thay thế toàn bộ effect bằng:

```javascript
  useEffect(() => {
    if (!isTv) return;

    const handleKeyDown = (e) => {
      if (e.target?.closest?.('.custom-video-player')) return;

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
        
        // Start acceleration if not already started
        if (!state.accelerationState.activeKey) {
          dispatch({ type: 'START_ACCELERATION', key: e.key });
          
          // Start acceleration interval
          const intervalId = setInterval(() => {
            const elapsed = Date.now() - state.accelerationState.startTime;
            let multiplier = 1;
            
            if (elapsed >= 2000) multiplier = 8;
            else if (elapsed >= 1000) multiplier = 4;
            else if (elapsed >= 500) multiplier = 2;
            
            if (multiplier !== state.accelerationState.stepMultiplier) {
              dispatch({ type: 'UPDATE_ACCELERATION', multiplier, intervalId });
            }
          }, 150);
          
          dispatch({ type: 'UPDATE_ACCELERATION', multiplier: 1, intervalId });
        }
        
        dispatch({ type: 'NAVIGATE', direction: e.key });
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
      if (arrowKeys.includes(e.key) && state.accelerationState.activeKey === e.key) {
        dispatch({ type: 'STOP_ACCELERATION' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTv, state.accelerationState]);
```

- [ ] **Step 2: Verify acceleration tracking added**

Run: `Get-Content src/context/FocusContext.jsx | Select-String "START_ACCELERATION|handleKeyUp"`
Expected: See START_ACCELERATION dispatch and keyup handler

- [ ] **Step 3: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(focus): add keyboard acceleration tracking"
```

---

## Task 9: Create SeekTooltip Component

**Files:**
- Create: `src/components/video-player/seek-tooltip/SeekTooltip.jsx`
- Create: `src/components/video-player/seek-tooltip/seek-tooltip.scss`

- [ ] **Step 1: Create SeekTooltip component**

```javascript
import React from 'react';
import './seek-tooltip.scss';

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `::`;
  }
  return `:`;
};

const SeekTooltip = ({ visible, currentTime, duration, position }) => {
  if (!visible) return null;
  
  return (
    <div 
      className="seek-tooltip" 
      style={{ left: `%` }}
      role="tooltip"
      aria-live="polite"
    >
      <span className="seek-tooltip__time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
};

export default SeekTooltip;
```

- [ ] **Step 2: Create seek-tooltip.scss**

```scss
.seek-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  transition: opacity 0.2s ease;
  
  &__time {
    display: block;
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 3: Verify files created**

Run: `Get-Content src/components/video-player/seek-tooltip/SeekTooltip.jsx | Select-String "formatTime"`
Expected: See formatTime function

Run: `Get-Content src/components/video-player/seek-tooltip/seek-tooltip.scss | Select-String ".seek-tooltip"`
Expected: See tooltip styles

- [ ] **Step 4: Commit**

```bash
git add src/components/video-player/seek-tooltip/
git commit -m "feat(player): add SeekTooltip component"
```

---

## Task 10: Add Seek Acceleration to CustomVideoPlayer

**Files:**
- Modify: `src/components/video-player/CustomVideoPlayer.jsx:1,14,96-109,368-453`

- [ ] **Step 1: Import SeekTooltip**

Thêm import sau line 14:

```javascript
import SeekTooltip from './seek-tooltip/SeekTooltip';
```

- [ ] **Step 2: Add seek state variables**

Sau `const [sidebarOpen, setSidebarOpen] = useState(false);` (line ~109), thêm:

```javascript
  const [seekTooltip, setSeekTooltip] = useState({
    visible: false,
    currentTime: 0,
    position: 0,
  });
  const seekAccelerationRef = useRef({
    startTime: null,
    intervalId: null,
  });
```

- [ ] **Step 3: Add calculateSeekStep helper**

Sau `const getVideo = useCallback(...)` (line ~111), thêm:

```javascript
  const calculateSeekStep = useCallback((elapsedMs) => {
    if (elapsedMs < 500) return 10;
    if (elapsedMs < 1500) return 30;
    if (elapsedMs < 3000) return 60;
    return 120;
  }, []);
```

- [ ] **Step 4: Add updateSeekTooltip helper**

Tiếp tục thêm:

```javascript
  const updateSeekTooltip = useCallback((time) => {
    const video = getVideo();
    if (!video || !video.duration) return;
    
    const position = (time / video.duration) * 100;
    setSeekTooltip({
      visible: true,
      currentTime: time,
      position,
    });
  }, [getVideo]);

  const hideSeekTooltip = useCallback(() => {
    setSeekTooltip(prev => ({ ...prev, visible: false }));
  }, []);
```

- [ ] **Step 5: Update seekBy to show tooltip**

Tìm `seekBy` function (line ~143) và cập nhật:

```javascript
  const seekBy = useCallback(
    (seconds) => {
      const video = getVideo();
      if (!video) return;

      const nextTime = Math.min(
        Math.max(video.currentTime + seconds, 0),
        video.duration || 0,
      );
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      updateSeekTooltip(nextTime);
      setShowControls(true);
      revealControls();
    },
    [getVideo, revealControls, updateSeekTooltip],
  );
```

- [ ] **Step 6: Replace keyboard handler with seek acceleration**

Tìm `useEffect` với `handleKeyDown` trong player (line ~368), và thay thế case 'ArrowLeft' và 'ArrowRight':

```javascript
        case "ArrowLeft":
          if (isTimelineFocused) {
            // Start or continue seek acceleration
            if (!seekAccelerationRef.current.startTime) {
              seekAccelerationRef.current.startTime = Date.now();
              
              seekAccelerationRef.current.intervalId = setInterval(() => {
                const elapsed = Date.now() - seekAccelerationRef.current.startTime;
                const step = calculateSeekStep(elapsed);
                seekBy(-step);
              }, 200);
            }
            seekBy(-10);
          } else {
            revealControls();
            focusByOffset(playerRef.current, false, -1);
          }
          break;
        case "ArrowRight":
          if (isTimelineFocused) {
            // Start or continue seek acceleration
            if (!seekAccelerationRef.current.startTime) {
              seekAccelerationRef.current.startTime = Date.now();
              
              seekAccelerationRef.current.intervalId = setInterval(() => {
                const elapsed = Date.now() - seekAccelerationRef.current.startTime;
                const step = calculateSeekStep(elapsed);
                seekBy(step);
              }, 200);
            }
            seekBy(10);
          } else {
            revealControls();
            focusByOffset(playerRef.current, false, 1);
          }
          break;
```

- [ ] **Step 7: Add keyup handler to stop acceleration**

Trong cùng useEffect, sau `handleKeyDown` function, thêm:

```javascript
    const handleKeyUp = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        // Stop seek acceleration
        if (seekAccelerationRef.current.intervalId) {
          clearInterval(seekAccelerationRef.current.intervalId);
        }
        seekAccelerationRef.current.startTime = null;
        seekAccelerationRef.current.intervalId = null;
        
        // Hide tooltip after delay
        setTimeout(hideSeekTooltip, 500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
```

- [ ] **Step 8: Update cleanup dependencies**

Cập nhật dependency array của useEffect:

```javascript
  }, [closeSidebar, sidebarOpen, focusFirstPlayerControl, onClose, revealControls, togglePlay, seekBy, calculateSeekStep, hideSeekTooltip]);
```

- [ ] **Step 9: Verify seek acceleration added**

Run: `Get-Content src/components/video-player/CustomVideoPlayer.jsx | Select-String "calculateSeekStep|updateSeekTooltip"`
Expected: See both helper functions

- [ ] **Step 10: Commit**

```bash
git add src/components/video-player/CustomVideoPlayer.jsx
git commit -m "feat(player): add seek acceleration with timeline feedback"
```

---

## Task 11: Render SeekTooltip in CustomVideoPlayer

**Files:**
- Modify: `src/components/video-player/CustomVideoPlayer.jsx:749-882`

- [ ] **Step 1: Add SeekTooltip to progress row**

Tìm `CustomVideoPlayerChrome` component render (line ~854), và thêm SeekTooltip TRƯỚC nó:

```javascript
      {fpsDebugOverlay}

      <div className="custom-video-player__progress-wrapper">
        <SeekTooltip
          visible={seekTooltip.visible}
          currentTime={seekTooltip.currentTime}
          duration={duration}
          position={seekTooltip.position}
        />
      </div>

      <CustomVideoPlayerChrome
```

- [ ] **Step 2: Verify SeekTooltip rendered**

Run: `Get-Content src/components/video-player/CustomVideoPlayer.jsx | Select-String "SeekTooltip"`
Expected: See SeekTooltip import and render

- [ ] **Step 3: Commit**

```bash
git add src/components/video-player/CustomVideoPlayer.jsx
git commit -m "feat(player): render SeekTooltip in player UI"
```

---

## Task 12: Add CSS Optimizations

**Files:**
- Modify: `src/components/video-player/custom-video-player.scss:1`
- Modify: `src/components/video-player/episode-sidebar/episode-sidebar.scss:1`

- [ ] **Step 1: Add will-change and contain to player controls**

Trong `custom-video-player.scss`, tìm `.custom-video-player__controls button` (line ~278) và thêm:

```scss
  button {
    // ... existing styles ...
    will-change: transform;
    contain: layout style paint;
```

- [ ] **Step 2: Add smooth scroll to episode sidebar**

Tạo file `src/components/video-player/episode-sidebar/episode-sidebar.scss` nếu chưa có, hoặc thêm vào file hiện tại:

```scss
.episode-sidebar__list {
  scroll-behavior: smooth;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  
  .episode-sidebar__item {
    will-change: transform;
    contain: layout style paint;
  }
}
```

- [ ] **Step 3: Verify CSS optimizations**

Run: `Get-Content src/components/video-player/custom-video-player.scss | Select-String "will-change"`
Expected: See will-change property

- [ ] **Step 4: Commit**

```bash
git add src/components/video-player/custom-video-player.scss src/components/video-player/episode-sidebar/episode-sidebar.scss
git commit -m "perf: add CSS optimizations for smooth scrolling"
```

---

## Task 13: Manual Testing

**Files:**
- None (testing only)

- [ ] **Step 1: Test acceleration in episode list**

1. Start app: `npm start`
2. Open video player
3. Open episode sidebar
4. Test:
   - Nhấn Down 1 lần → di chuyển 1 tập
   - Giữ Down 1 giây → tốc độ tăng lên
   - Giữ Down 2 giây → tốc độ tăng nhanh hơn
   - Expected: Focus scroll về giữa màn hình

- [ ] **Step 2: Test zone skip**

1. Focus vào nút Play trong player controls
2. Nhấn Down 1 lần
3. Expected: Nhảy thẳng xuống episode sidebar (không qua timeline)

- [ ] **Step 3: Test seek acceleration**

1. Focus vào timeline (progress bar)
2. Nhấn Right 1 lần → tua 10s
3. Giữ Right 1 giây → tốc độ tua tăng (30s/step)
4. Giữ Right 2 giây → tốc độ tua tăng nhanh (60s/step)
5. Expected: Thấy tooltip hiển thị thời gian khi tua

- [ ] **Step 4: Test scroll centering**

1. Navigate xuống list tập
2. Expected: Item được focus luôn ở giữa màn hình
3. Di chuyển ngang (nếu có) → không scroll dọc

- [ ] **Step 5: Test backward compatibility**

1. Test mouse click vẫn hoạt động
2. Test touch navigation (nếu có device)
3. Test dialog focus trap vẫn work
4. Expected: Không có regression

- [ ] **Step 6: Document any issues found**

Nếu tìm thấy bugs, ghi lại trong comment hoặc tạo issue.

---

## Task 14: Final Integration Test and Commit

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite (if exists)**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Check git status**

Run: `git status`
Expected: No uncommitted changes (all committed in previous tasks)

- [ ] **Step 3: Review commit history**

Run: `git log --oneline -15`
Expected: See all feature commits in logical order

- [ ] **Step 4: Create final summary**

Document in commit message or PR description:
- ✅ Focus scroll về giữa màn hình khi di chuyển giữa rows
- ✅ Focus không nhảy cóc, đi tuần tự từng item
- ✅ Zone skip: từ player → sidebar trong 1 lần nhấn
- ✅ Key acceleration: scroll nhanh khi giữ phím lâu
- ✅ Seek tooltip: hiển thị thời gian khi tua
- ✅ Seek acceleration: tua nhanh hơn khi giữ phím

- [ ] **Step 5: Done!**

Feature complete. Ready for code review.

---

## Self-Review Checklist

### Spec Coverage

✅ **Focus scroll về giữa**: Task 7 - Smart scroll with centering  
✅ **Focus nhảy cóc fix**: Task 5 - Fixed row traversal with stepMultiplier  
✅ **Zone skip**: Task 3, 4, 6 - Zone skip rules and navigation  
✅ **Key acceleration**: Task 2, 4, 5, 8 - Acceleration state and tracking  
✅ **Seek tooltip**: Task 9, 11 - SeekTooltip component  
✅ **Seek acceleration**: Task 10 - calculateSeekStep and interval

### No Placeholders

✅ All code blocks complete  
✅ No TBD/TODO  
✅ Exact file paths specified  
✅ All imports defined

### Type Consistency

✅ `accelerationState` shape consistent across all tasks  
✅ `ZONE_SKIP_RULES` structure used correctly  
✅ `seekTooltip` state shape consistent  
✅ Function signatures match (findNextRow, findPrevRow)

---

## Execution Notes

- Total tasks: 14 (13 implementation + 1 testing)
- Estimated time: 2-3 hours
- No external dependencies needed
- All changes backward compatible
- Commits after each logical unit

**Recommended execution:** Subagent-driven development (fresh subagent per task)
