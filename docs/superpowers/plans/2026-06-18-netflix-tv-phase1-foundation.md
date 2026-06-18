# Netflix TV Redesign - Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build foundation for Netflix TV redesign - design tokens, focus system enhancements, and base components

**Architecture:** Create reusable design system (SCSS tokens + mixins), enhance FocusContext with zone trap support, build four base components that will be used across all phases

**Tech Stack:** React, SCSS, FocusContext, React Testing Library

**Estimated Time:** 1 week

---

## File Structure

### New Files (9)
1. `src/scss/tv-variables.scss` - Design tokens and mixins
2. `src/components/episode-list-item/EpisodeListItem.jsx` - Vertical episode item
3. `src/components/episode-list-item/episode-list-item.scss` - Styles
4. `src/components/episode-list-item/EpisodeListItem.test.jsx` - Tests
5. `src/components/video-player/episode-sidebar/EpisodeSidebar.jsx` - Episode sidebar
6. `src/components/video-player/episode-sidebar/episode-sidebar.scss` - Styles
7. `src/components/video-player/info-overlay/InfoOverlay.jsx` - Pause info overlay
8. `src/components/video-player/info-overlay/info-overlay.scss` - Styles
9. `src/components/video-player/autoplay-card/AutoplayCard.jsx` - Refactored autoplay

### Modified Files (1)
1. `src/context/FocusContext.jsx` - Add zone trap support

---

## Tasks


### Task 1: Create TV Design Tokens

**Files:**
- Create: `src/scss/tv-variables.scss`

**Purpose:** Centralize all Netflix TV design tokens (colors, typography, spacing, focus styles) and reusable mixins

- [ ] **Step 1: Create tv-variables.scss with color palette**

Create `src/scss/tv-variables.scss`:

```scss
// Netflix TV Design Tokens
// Optimized for 1080p TV (1920x1080) viewing distance

// ============================================
// Colors
// ============================================

// Primary
$tv-bg: #141414;                    // Netflix dark background
$tv-surface: #1a1a1a;               // Elevated surfaces
$tv-accent: #e50914;                 // Netflix red for CTAs

// Text
$tv-text-primary: #ffffff;
$tv-text-secondary: rgba(255, 255, 255, 0.7);
$tv-text-tertiary: rgba(255, 255, 255, 0.5);

// Focus
$tv-focus-border-color: #ffffff;
$tv-focus-shadow-color: rgba(0, 0, 0, 0.5);
```

- [ ] **Step 2: Add typography tokens**

Append to `src/scss/tv-variables.scss`:

```scss
// ============================================
// Typography
// ============================================

// Sizes (optimized for TV viewing distance)
$tv-text-hero: 48px;                // Hero titles
$tv-text-section: 28px;             // Section headers
$tv-text-card: 18px;                // Card titles
$tv-text-body: 16px;                // Body text
$tv-text-small: 14px;               // Metadata, captions
$tv-text-xs: 12px;                  // Badges

// Weights
$tv-weight-bold: 700;
$tv-weight-semibold: 600;
$tv-weight-medium: 500;
$tv-weight-regular: 400;

// Line heights
$tv-line-height-tight: 1.2;
$tv-line-height-normal: 1.4;
$tv-line-height-relaxed: 1.5;
```

- [ ] **Step 3: Add spacing and dimension tokens**

Append to `src/scss/tv-variables.scss`:

```scss
// ============================================
// Spacing
// ============================================

$tv-padding-x: 60px;                // Horizontal page padding
$tv-padding-y: 40px;                // Vertical section padding
$tv-gap-xs: 4px;
$tv-gap-sm: 8px;
$tv-gap-md: 12px;
$tv-gap-lg: 24px;
$tv-gap-xl: 32px;

// ============================================
// Focus System
// ============================================

$tv-focus-border-width: 4px;
$tv-focus-border: $tv-focus-border-width solid $tv-focus-border-color;
$tv-focus-scale: 1.1;
$tv-focus-shadow: 0 8px 24px $tv-focus-shadow-color;
$tv-focus-transition-duration: 200ms;
$tv-focus-transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
$tv-focus-transition: $tv-focus-transition-duration $tv-focus-transition-timing;

// ============================================
// Dimensions
// ============================================

// Layout
$tv-hero-height: 65vh;
$tv-detail-hero-height: 50vh;
$tv-sidebar-width: 420px;

// Cards
$tv-card-width: 220px;
$tv-card-height: 330px;
$tv-card-ratio: calc(3 / 2);        // Portrait 2:3
$tv-card-border-radius: 8px;

// Controls (Video Player)
$tv-control-button-size: 48px;
$tv-timeline-height: 8px;
$tv-timeline-thumb-size: 20px;

// Episode Items (TvDetail)
$tv-episode-item-height: 120px;
$tv-episode-thumbnail-width: 180px;
$tv-episode-thumbnail-height: 100px;
```

- [ ] **Step 4: Add reusable mixins**

Append to `src/scss/tv-variables.scss`:

```scss
// ============================================
// Mixins
// ============================================

// Apply to all focusable elements for consistent Netflix-style focus
@mixin tv-focusable {
  border: 2px solid transparent;
  transition: 
    transform $tv-focus-transition,
    border $tv-focus-transition,
    box-shadow $tv-focus-transition,
    background $tv-focus-transition;
  
  &--focused {
    border: $tv-focus-border;
    transform: scale($tv-focus-scale);
    box-shadow: $tv-focus-shadow;
    z-index: 10;
  }
}

// Gradient overlays for readability
@mixin tv-gradient-left {
  background: linear-gradient(90deg, $tv-bg 0%, transparent 50%);
}

@mixin tv-gradient-bottom {
  background: linear-gradient(0deg, $tv-bg 0%, transparent 60%);
}

@mixin tv-gradient-bottom-overlay {
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.9) 100%);
}

// Text truncation
@mixin tv-text-ellipsis($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

- [ ] **Step 5: Verify file exists**

Run: `Test-Path src/scss/tv-variables.scss`

Expected output: `True`

- [ ] **Step 6: Commit**

```bash
git add src/scss/tv-variables.scss
git commit -m "feat(foundation): add Netflix TV design tokens and mixins"
```


### Task 2: Enhance FocusContext with Zone Trap Support

**Files:**
- Modify: `src/context/FocusContext.jsx:9-17,45-135,172-264`

**Purpose:** Add focus trap capability for dialogs/sidebars (zones 2-5) so focus cannot escape when sidebar/dialog is open

- [ ] **Step 1: Update initialState with new zones and trap state**

In `src/context/FocusContext.jsx`, replace initialState (lines 9-17):

```javascript
const initialState = {
  zone: 1,
  row: 0,
  col: 0,
  rowMemory: {},
  grid: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },  // Add zones 2-5
  maxRows: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  isActive: false,
  activeTrap: null,  // NEW: current trapped zone
  savedFocus: null,  // NEW: focus to restore after trap cleared
};
```

- [ ] **Step 2: Add SET_TRAP and CLEAR_TRAP reducer cases**

In `src/context/FocusContext.jsx`, add after RESTORE_FOCUS case (after line 132):

```javascript
    case 'SET_TRAP': {
      const { zone: trapZone } = action;
      return {
        ...state,
        activeTrap: trapZone,
        savedFocus: { zone: state.zone, row: state.row, col: state.col },
      };
    }
    case 'CLEAR_TRAP': {
      const restored = state.savedFocus || { zone: state.zone, row: state.row, col: state.col };
      return {
        ...state,
        activeTrap: null,
        savedFocus: null,
        zone: restored.zone,
        row: restored.row,
        col: restored.col,
      };
    }
```

- [ ] **Step 3: Update NAVIGATE case to respect activeTrap**

In `src/context/FocusContext.jsx`, replace NAVIGATE case (lines 45-123) with trap-aware version:

```javascript
    case 'NAVIGATE': {
      const { direction } = action;
      const { zone, row, col, grid, maxRows, rowMemory, activeTrap } = state;

      // If focus trapped, only allow navigation within trapped zone
      if (activeTrap !== null && zone === activeTrap) {
        const trapGrid = grid[activeTrap];
        let newRow = row;
        let newCol = col;

        if (direction === 'ArrowDown') {
          newRow = findNextRow(trapGrid, row);
          if (newRow !== row) {
            const rowCols = Object.keys(trapGrid?.[newRow] || {}).map(Number).sort((a,b) => a-b);
            if (rowCols.length) {
              newCol = rowCols.reduce((prev, curr) =>
                Math.abs(curr - col) < Math.abs(prev - col) ? curr : prev
              );
            }
          }
        } else if (direction === 'ArrowUp') {
          newRow = findPrevRow(trapGrid, row);
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

      // Normal navigation (no trap active) - existing logic
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
        newRow = findNextRow(grid[zone], row);
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
        newRow = findPrevRow(grid[zone], row);
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
```

- [ ] **Step 4: Export setTrap and clearTrap functions**

In `src/context/FocusContext.jsx`, add functions before value object (around line 256):

```javascript
  const setTrap = useCallback((trapZone) => {
    dispatch({ type: 'SET_TRAP', zone: trapZone });
  }, []);

  const clearTrap = useCallback(() => {
    dispatch({ type: 'CLEAR_TRAP' });
  }, []);

  const value = {
    state,
    register,
    unregister,
    saveFocus,
    restoreFocus,
    setTrap,     // NEW
    clearTrap,   // NEW
  };
```

- [ ] **Step 5: Test focus navigation still works**

Run: `npm start`

Navigate app with arrow keys, verify focus navigation works as before.

Expected: No errors, focus navigation functions normally

- [ ] **Step 6: Commit**

```bash
git add src/context/FocusContext.jsx
git commit -m "feat(foundation): add focus trap support for zones 2-5"
```


### Task 3: Create EpisodeListItem Component

**Files:**
- Create: `src/components/episode-list-item/EpisodeListItem.jsx`
- Create: `src/components/episode-list-item/episode-list-item.scss`
- Create: `src/components/episode-list-item/EpisodeListItem.test.jsx`

**Purpose:** Reusable vertical episode list item for TvDetail page with thumbnail, title, description

- [ ] **Step 1: Create EpisodeListItem directory**

Run: `New-Item -ItemType Directory -Path "src/components/episode-list-item" -Force`

Expected: Directory created

- [ ] **Step 2: Create EpisodeListItem.jsx component**

Create `src/components/episode-list-item/EpisodeListItem.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useFocusable } from '../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../utils/episodeDisplayName';
import './episode-list-item.scss';

const EpisodeListItem = ({
  episode,
  zone,
  row,
  col,
  isCurrent = false,
  onClick,
}) => {
  const { ref, focused } = useFocusable(zone, row, col);
  const [thumbnail, setThumbnail] = useState(null);

  // TODO: TMDB episode thumbnail fetching will be added in Phase 3
  // For now, always use placeholder

  const episodeNumber = formatEpisodeDisplayName(episode.name);
  const episodeTitle = episode.name;
  const episodeDescription = episode.description || '';
  const duration = episode.duration || '';

  const handleClick = () => {
    if (onClick) onClick(episode);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  useEffect(() => {
    // Auto-scroll to center when focused
    if (focused && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [focused, ref]);

  return (
    <div
      ref={ref}
      className={`episode-list-item ${focused ? 'episode-list-item--focused' : ''} ${isCurrent ? 'episode-list-item--current' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={-1}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="episode-list-item__thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={episodeTitle} loading="lazy" />
        ) : (
          <div className="episode-list-item__thumbnail-placeholder">
            <i className="bx bx-play-circle" />
          </div>
        )}
      </div>

      <div className="episode-list-item__info">
        <div className="episode-list-item__header">
          <span className="episode-list-item__number">{episodeNumber}</span>
          <span className="episode-list-item__title">{episodeTitle}</span>
        </div>
        {episodeDescription && (
          <p className="episode-list-item__description">{episodeDescription}</p>
        )}
      </div>

      {duration && (
        <div className="episode-list-item__duration">{duration}</div>
      )}
    </div>
  );
};

export default EpisodeListItem;
```

- [ ] **Step 3: Create episode-list-item.scss styles**

Create `src/components/episode-list-item/episode-list-item.scss`:

```scss
@import '../../scss/tv-variables.scss';

.episode-list-item {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: $tv-surface;
  border-radius: $tv-card-border-radius;
  border: 2px solid transparent;
  min-height: $tv-episode-item-height;
  align-items: center;
  cursor: pointer;
  transition: 
    transform $tv-focus-transition,
    border $tv-focus-transition,
    box-shadow $tv-focus-transition,
    background $tv-focus-transition;

  &--focused {
    border: $tv-focus-border;
    transform: scale(1.05);
    background: lighten($tv-surface, 5%);
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    z-index: 1;
  }

  &--current {
    border-left: 6px solid $tv-accent;
    padding-left: 10px;
  }

  &__thumbnail {
    width: $tv-episode-thumbnail-width;
    height: $tv-episode-thumbnail-height;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: darken($tv-surface, 3%);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__thumbnail-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: darken($tv-surface, 3%);

    i {
      font-size: 32px;
      color: $tv-text-tertiary;
    }
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $tv-gap-sm;
    min-width: 0; // Allow text truncation
  }

  &__header {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  &__number {
    font-size: 20px;
    font-weight: $tv-weight-semibold;
    color: $tv-text-secondary;
    flex-shrink: 0;
  }

  &__title {
    font-size: $tv-text-card;
    font-weight: $tv-weight-medium;
    color: $tv-text-primary;
    @include tv-text-ellipsis(1);
  }

  &__description {
    font-size: $tv-text-small;
    line-height: $tv-line-height-normal;
    color: $tv-text-secondary;
    @include tv-text-ellipsis(2);
    margin: 0;
  }

  &__duration {
    align-self: flex-start;
    padding-top: $tv-gap-sm;
    font-size: $tv-text-small;
    color: $tv-text-secondary;
    flex-shrink: 0;
  }
}
```

- [ ] **Step 4: Create component test**

Create `src/components/episode-list-item/EpisodeListItem.test.jsx`:

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FocusProvider } from '../../context/FocusContext';
import EpisodeListItem from './EpisodeListItem';

const mockEpisode = {
  name: 'Tập 1',
  slug: 'tap-1',
  duration: '45 phút',
  description: 'Mô tả tập phim',
};

describe('EpisodeListItem', () => {
  it('renders episode information', () => {
    render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
        />
      </FocusProvider>
    );

    expect(screen.getByText('Tập 1')).toBeInTheDocument();
    expect(screen.getByText('45 phút')).toBeInTheDocument();
    expect(screen.getByText('Mô tả tập phim')).toBeInTheDocument();
  });

  it('applies current class when isCurrent is true', () => {
    const { container } = render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
          isCurrent={true}
        />
      </FocusProvider>
    );

    expect(container.querySelector('.episode-list-item--current')).toBeInTheDocument();
  });

  it('shows placeholder when no thumbnail', () => {
    const { container } = render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
        />
      </FocusProvider>
    );

    expect(container.querySelector('.episode-list-item__thumbnail-placeholder')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- EpisodeListItem.test.jsx`

Expected output: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/episode-list-item/
git commit -m "feat(foundation): add EpisodeListItem component with focus support"
```


### Task 4: Create InfoOverlay Component

**Files:**
- Create: `src/components/video-player/info-overlay/InfoOverlay.jsx`
- Create: `src/components/video-player/info-overlay/info-overlay.scss`

**Purpose:** Display title, episode, description overlay when video is paused (Netflix-style)

- [ ] **Step 1: Create info-overlay directory**

Run: `New-Item -ItemType Directory -Path "src/components/video-player/info-overlay" -Force`

Expected: Directory created

- [ ] **Step 2: Create InfoOverlay.jsx component**

Create `src/components/video-player/info-overlay/InfoOverlay.jsx`:

```javascript
import React from 'react';
import './info-overlay.scss';

const InfoOverlay = ({
  title,
  episodeName,
  description,
  isVisible = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="info-overlay">
      <h2 className="info-overlay__title">{title}</h2>
      {episodeName && (
        <h3 className="info-overlay__episode">{episodeName}</h3>
      )}
      {description && (
        <p className="info-overlay__description">{description}</p>
      )}
    </div>
  );
};

export default InfoOverlay;
```

- [ ] **Step 3: Create info-overlay.scss styles**

Create `src/components/video-player/info-overlay/info-overlay.scss`:

```scss
@import '../../../scss/tv-variables.scss';

.info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  padding: $tv-padding-x;
  background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, transparent 100%);
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  transition: opacity 400ms ease-out;

  // Parent component will add class to show
  &--visible {
    opacity: 1;
  }

  &__title {
    font-size: 36px;
    font-weight: $tv-weight-bold;
    color: $tv-text-primary;
    margin: 0;
    margin-bottom: 12px;
    @include tv-text-ellipsis(2);
  }

  &__episode {
    font-size: 20px;
    font-weight: $tv-weight-medium;
    color: $tv-text-secondary;
    margin: 0;
    margin-bottom: 16px;
  }

  &__description {
    font-size: $tv-text-body;
    line-height: $tv-line-height-relaxed;
    color: $tv-text-secondary;
    margin: 0;
    @include tv-text-ellipsis(4);
  }
}
```

- [ ] **Step 4: Verify component exports**

Run: `Test-Path src/components/video-player/info-overlay/InfoOverlay.jsx`

Expected: True

- [ ] **Step 5: Commit**

```bash
git add src/components/video-player/info-overlay/
git commit -m "feat(foundation): add InfoOverlay component for paused video"
```

### Task 5: Create AutoplayCard Component

**Files:**
- Create: `src/components/video-player/autoplay-card/AutoplayCard.jsx`
- Create: `src/components/video-player/autoplay-card/autoplay-card.scss`

**Purpose:** Refactor existing autoplay notice into standalone focusable component for next episode

- [ ] **Step 1: Create autoplay-card directory**

Run: `New-Item -ItemType Directory -Path "src/components/video-player/autoplay-card" -Force`

Expected: Directory created

- [ ] **Step 2: Create AutoplayCard.jsx component**

Create `src/components/video-player/autoplay-card/AutoplayCard.jsx`:

```javascript
import React from 'react';
import { useFocusable } from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import './autoplay-card.scss';

const AutoplayCard = ({
  nextEpisode,
  countdown,
  autoPlayDuration = 10,
  isVisible = false,
  onPlayNow,
  onCancel,
}) => {
  const { ref: playRef, focused: playFocused } = useFocusable(4, 0, 0);
  const { ref: cancelRef, focused: cancelFocused } = useFocusable(4, 0, 1);

  if (!isVisible || !nextEpisode) return null;

  const nextEpisodeLabel = formatEpisodeDisplayName(nextEpisode.name);

  return (
    <div className="autoplay-card" role="status">
      <div className="autoplay-card__content">
        <span className="autoplay-card__label">Tiếp theo</span>
        <strong className="autoplay-card__title">{nextEpisodeLabel}</strong>
        <small className="autoplay-card__countdown">
          Tự động phát sau {countdown} giây
        </small>
      </div>
      <div className="autoplay-card__actions">
        <button
          ref={playRef}
          className={`autoplay-card__button autoplay-card__button--play ${playFocused ? 'autoplay-card__button--focused' : ''}`}
          onClick={onPlayNow}
          type="button"
          aria-label="Phát tập tiếp theo ngay"
          style={{ '--autoplay-duration': `${autoPlayDuration}s` }}
        >
          <span>Phát ngay</span>
        </button>
        <button
          ref={cancelRef}
          className={`autoplay-card__button autoplay-card__button--cancel ${cancelFocused ? 'autoplay-card__button--focused' : ''}`}
          onClick={onCancel}
          type="button"
          aria-label="Hủy tự động phát"
        >
          <i className="bx bx-x" />
        </button>
      </div>
    </div>
  );
};

export default AutoplayCard;
```

- [ ] **Step 3: Create autoplay-card.scss styles**

Create `src/components/video-player/autoplay-card/autoplay-card.scss`:

```scss
@import '../../../scss/tv-variables.scss';

.autoplay-card {
  position: absolute;
  bottom: 120px;
  right: $tv-padding-x;
  width: 400px;
  padding: $tv-gap-lg;
  background: rgba(20, 20, 20, 0.95);
  border-radius: $tv-card-border-radius;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  z-index: 15;
  opacity: 0;
  transition: opacity 300ms ease-out;

  &--visible {
    opacity: 1;
  }

  &__content {
    margin-bottom: 20px;
  }

  &__label {
    display: block;
    font-size: $tv-text-small;
    color: $tv-text-secondary;
    margin-bottom: $tv-gap-sm;
  }

  &__title {
    display: block;
    font-size: 20px;
    font-weight: $tv-weight-semibold;
    color: $tv-text-primary;
    margin-bottom: $tv-gap-sm;
  }

  &__countdown {
    display: block;
    font-size: $tv-text-body;
    color: $tv-text-secondary;
  }

  &__actions {
    display: flex;
    gap: $tv-gap-md;
  }

  &__button {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    cursor: pointer;
    transition: 
      transform $tv-focus-transition,
      border $tv-focus-transition,
      box-shadow $tv-focus-transition;

    &--play {
      flex: 1;
      height: 48px;
      padding: 0 $tv-gap-lg;
      background: $tv-text-primary;
      color: $tv-bg;
      font-size: $tv-text-body;
      font-weight: $tv-weight-semibold;
      border-radius: 4px;

      // Pulse animation during countdown
      animation: pulse-border 2s infinite;
    }

    &--cancel {
      width: 48px;
      height: 48px;
      background: transparent;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: $tv-text-primary;

      i {
        font-size: 24px;
      }
    }

    &--focused {
      border: 4px solid $tv-accent;
      transform: scale(1.05);
      box-shadow: $tv-focus-shadow;
      z-index: 1;

      &.autoplay-card__button--cancel {
        border-color: $tv-text-primary;
      }
    }
  }
}

@keyframes pulse-border {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
  }
}
```

- [ ] **Step 4: Verify component exports**

Run: `Test-Path src/components/video-player/autoplay-card/AutoplayCard.jsx`

Expected: True

- [ ] **Step 5: Commit**

```bash
git add src/components/video-player/autoplay-card/
git commit -m "feat(foundation): add AutoplayCard component with focus support"
```


### Task 6: Create EpisodeSidebar Component

**Files:**
- Create: `src/components/video-player/episode-sidebar/EpisodeSidebar.jsx`
- Create: `src/components/video-player/episode-sidebar/episode-sidebar.scss`

**Purpose:** Netflix-style episode sidebar for video player (420px width, vertical list, focus trapped)

- [ ] **Step 1: Create episode-sidebar directory**

Run: `New-Item -ItemType Directory -Path "src/components/video-player/episode-sidebar" -Force`

Expected: Directory created

- [ ] **Step 2: Create EpisodeSidebar.jsx component**

Create `src/components/video-player/episode-sidebar/EpisodeSidebar.jsx`:

```javascript
import React, { useEffect } from 'react';
import { useFocusable, useFocus } from '../../../context/FocusContext';
import { formatEpisodeDisplayName } from '../../../utils/episodeDisplayName';
import './episode-sidebar.scss';

const EpisodeSidebar = ({
  episodes = [],
  currentEpisode,
  isOpen = false,
  onClose,
  onSelectEpisode,
}) => {
  const { setTrap, clearTrap } = useFocus();
  const { ref: closeRef, focused: closeFocused } = useFocusable(3, 0, 0);

  // Set focus trap when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTrap(3); // Trap focus in zone 3
      // Auto-focus close button
      if (closeRef.current) {
        closeRef.current.focus();
      }
    } else {
      clearTrap();
    }
  }, [isOpen, setTrap, clearTrap, closeRef]);

  // Handle Backspace/Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEpisodeKey = currentEpisode?.episodeKey || currentEpisode?.slug || currentEpisode?.name;

  return (
    <div 
      className={`episode-sidebar ${isOpen ? 'episode-sidebar--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Danh sách tập"
    >
      <div className="episode-sidebar__header">
        <h2 className="episode-sidebar__title">Tập phim</h2>
        <button
          ref={closeRef}
          className={`episode-sidebar__close ${closeFocused ? 'episode-sidebar__close--focused' : ''}`}
          onClick={onClose}
          type="button"
          aria-label="Đóng danh sách tập"
        >
          <i className="bx bx-x" />
        </button>
      </div>

      <div className="episode-sidebar__list">
        {episodes.map((episode, index) => {
          const episodeKey = episode.episodeKey || episode.slug || episode.name;
          const isCurrent = episodeKey === currentEpisodeKey;

          return (
            <EpisodeSidebarItem
              key={episodeKey}
              episode={episode}
              row={index + 1}
              isCurrent={isCurrent}
              onClick={() => {
                onSelectEpisode(episode);
                onClose();
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Sidebar item sub-component
function EpisodeSidebarItem({ episode, row, isCurrent, onClick }) {
  const { ref, focused } = useFocusable(3, row, 0);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      ref={ref}
      className={`episode-sidebar__item ${focused ? 'episode-sidebar__item--focused' : ''} ${isCurrent ? 'episode-sidebar__item--current' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      type="button"
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="episode-sidebar__item-thumbnail">
        {/* TODO: Thumbnail will be added in Phase 4 */}
        <div className="episode-sidebar__item-placeholder">
          <i className="bx bx-play-circle" />
        </div>
      </div>
      <div className="episode-sidebar__item-info">
        <span className="episode-sidebar__item-number">
          {formatEpisodeDisplayName(episode.name)}
        </span>
        <span className="episode-sidebar__item-title">{episode.name}</span>
      </div>
    </button>
  );
}

export default EpisodeSidebar;
```

- [ ] **Step 3: Create episode-sidebar.scss styles**

Create `src/components/video-player/episode-sidebar/episode-sidebar.scss`:

```scss
@import '../../../scss/tv-variables.scss';

.episode-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: $tv-sidebar-width;
  height: 100vh;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: -4px 0 16px rgba(0,0,0,0.5);
  z-index: 20;
  
  transform: translateX($tv-sidebar-width);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);

  &--open {
    transform: translateX(0);
  }

  &__header {
    padding: $tv-padding-y $tv-gap-lg $tv-gap-lg;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 24px;
    font-weight: $tv-weight-semibold;
    color: $tv-text-primary;
    margin: 0;
  }

  &__close {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: transparent;
    color: $tv-text-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 
      transform $tv-focus-transition,
      border $tv-focus-transition;

    i {
      font-size: 28px;
    }

    &--focused {
      border: 4px solid $tv-focus-border-color;
      transform: scale(1.1);
    }
  }

  &__list {
    padding: $tv-gap-md;
    height: calc(100vh - 120px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $tv-gap-sm;

    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;

      &:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    }
  }

  &__item {
    display: flex;
    gap: $tv-gap-md;
    padding: $tv-gap-md;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 2px solid transparent;
    min-height: 80px;
    align-items: center;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: 
      transform $tv-focus-transition,
      border $tv-focus-transition,
      background $tv-focus-transition;

    &--current {
      background: rgba(229, 9, 20, 0.2);
      border-left: 4px solid $tv-accent;
      padding-left: 12px;
    }

    &--focused {
      border: 4px solid $tv-focus-border-color;
      background: rgba(255, 255, 255, 0.1);
      transform: scale(1.02);
    }
  }

  &__item-thumbnail {
    width: 100px;
    height: 56px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: darken($tv-surface, 3%);
  }

  &__item-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: darken($tv-surface, 3%);

    i {
      font-size: 24px;
      color: $tv-text-tertiary;
    }
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__item-number {
    font-size: $tv-text-body;
    font-weight: $tv-weight-semibold;
    color: $tv-text-secondary;
  }

  &__item-title {
    font-size: $tv-text-body;
    font-weight: $tv-weight-medium;
    color: $tv-text-primary;
    @include tv-text-ellipsis(2);
  }
}
```

- [ ] **Step 4: Verify component exports**

Run: `Test-Path src/components/video-player/episode-sidebar/EpisodeSidebar.jsx`

Expected: True

- [ ] **Step 5: Commit**

```bash
git add src/components/video-player/episode-sidebar/
git commit -m "feat(foundation): add EpisodeSidebar component with focus trap"
```

---

## Phase 1 Complete

### Verification Checklist

- [ ] **Verify all files created**

Run:
```bash
Test-Path src/scss/tv-variables.scss
Test-Path src/components/episode-list-item/EpisodeListItem.jsx
Test-Path src/components/video-player/info-overlay/InfoOverlay.jsx
Test-Path src/components/video-player/autoplay-card/AutoplayCard.jsx
Test-Path src/components/video-player/episode-sidebar/EpisodeSidebar.jsx
```

Expected: All return True

- [ ] **Run all tests**

Run: `npm test`

Expected: All tests pass (including EpisodeListItem tests)

- [ ] **Run app to verify no errors**

Run: `npm start`

Expected: App loads without errors, existing functionality works

- [ ] **Review git log**

Run: `git log --oneline -10`

Expected: See 6 commits from this phase

---

## Next Steps

After Phase 1 is complete and verified:

1. **Review deliverables** - Ensure all components render correctly
2. **Create Phase 2 plan** - TV Home redesign
3. **Create Phase 3 plan** - TvDetail redesign
4. **Create Phase 4 plan** - CustomVideoPlayer redesign

Or proceed directly to executing Phase 2-4 if plans already exist.

