# Netflix TV Redesign - Phase 2: TV Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform TV Home page to Netflix-style with 65vh hero and 5-6 visible items per row

**Architecture:** Update TvHero and ContentRow components, apply Netflix design tokens from Phase 1

**Dependencies:** Phase 1 must be complete (tv-variables.scss, focus enhancements)

**Tech Stack:** React, SCSS, existing FocusContext, TMDB API

**Estimated Time:** 1-2 weeks

---

## File Structure

### Modified Files (5)
1. `src/components/tv-hero/TvHero.jsx` - Increase height to 65vh, Netflix styling
2. `src/components/tv-hero/tv-hero.scss` - Apply design tokens, larger hero
3. `src/components/content-row/ContentRow.jsx` - 5-6 items visible, scroll-to-center
4. `src/components/content-row/content-row.scss` - Netflix focus, larger cards
5. `src/pages/Home.jsx` - Remove BackToTop button

---

## Tasks

### Task 1: Update TvHero Component

**Files:**
- Modify: `src/components/tv-hero/TvHero.jsx:10-57`
- Modify: `src/components/tv-hero/tv-hero.scss:1-150`

**Purpose:** Increase hero height to 65vh and apply Netflix-style design

**Changes needed:**

1. **TvHero.jsx** - Update Play button styling and remove carousel controls
2. **tv-hero.scss** - Import tv-variables, increase height, Netflix gradients

**Commit:** "feat(home): update TvHero to Netflix-style 65vh layout"

### Task 2: Update ContentRow Component

**Files:**
- Modify: `src/components/content-row/ContentRow.jsx:9-60`
- Modify: `src/components/content-row/content-row.scss:1-120`

**Purpose:** Display 5-6 items visible, apply Netflix focus indicators, scroll-to-center

**Changes needed:**

1. **ContentRow.jsx** - Add scroll-to-center on focus, limit visible items
2. **content-row.scss** - Import tv-variables, Netflix focus style, larger cards

**Commit:** "feat(home): update ContentRow with Netflix-style focus and layout"

### Task 3: Remove BackToTop Button from Home

**Files:**
- Modify: `src/pages/Home.jsx:47-121`

**Purpose:** Remove BackToTop component (not needed with D-pad navigation)

**Changes needed:**

Remove BackToTop import and usage from Home.jsx

**Commit:** "feat(home): remove BackToTop button for TV navigation"

---

## Verification Checklist

- [ ] TvHero height is 65vh
- [ ] ContentRow shows 5-6 items visible
- [ ] Focus indicators: 4px white border, scale 1.1x
- [ ] Scroll-to-center works when focusing cards
- [ ] No BackToTop button
- [ ] All focus navigation works correctly

