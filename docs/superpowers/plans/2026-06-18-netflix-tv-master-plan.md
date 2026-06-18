# Netflix TV Redesign - Master Implementation Plan

> **For agentic workers:** This is a MASTER PLAN. Execute Phase 1 first, then create detailed plans for subsequent phases.

**Goal:** Transform O Phim TV app to follow Netflix TV UX patterns with 100% TV remote control focus

**Spec:** `docs/superpowers/specs/2026-06-18-netflix-tv-redesign-design.md`

**Strategy:** Four-phase incremental replacement with independent review gates

---

## Phase Overview

### Phase 1: Foundation (Week 1) ✓ START HERE
**Detailed Plan:** `docs/superpowers/plans/2026-06-18-netflix-tv-phase1-foundation.md`

**Deliverables:**
- TV design tokens (tv-variables.scss)
- Enhanced FocusContext with zone traps
- Base components: EpisodeListItem, EpisodeSidebar, InfoOverlay, AutoplayCard
- Unit tests for focus system

**Files:** 9 new, 1 modified

### Phase 2: TV Home (Week 1-2)
**Detailed Plan:** Create after Phase 1 complete

**Deliverables:**
- TvHero: 65vh, Netflix-style
- ContentRow: 5-6 items, info overlay
- FocusCard: Netflix focus indicators
- Remove BackToTop

**Files:** 5 modified

### Phase 3: TvDetail (Week 2)
**Detailed Plan:** Create after Phase 1 complete

**Deliverables:**
- Backdrop hero layout
- Vertical episode list with EpisodeListItem
- TMDB episode thumbnails
- Similar section

**Files:** 2 heavily modified (TvDetail.jsx, tv-detail.scss), 1 utility modified

### Phase 4: CustomVideoPlayer (Week 3)
**Detailed Plan:** Create after Phase 1 complete

**Deliverables:**
- Large controls (48px)
- Episode sidebar integration
- Info overlay integration
- Remove fullscreen
- Autoplay card

**Files:** 2 heavily modified (CustomVideoPlayer.jsx, custom-video-player.scss), 1 simplified

---

## Execution Order

1. **Execute Phase 1** using detailed plan
2. **Review & Test** Phase 1 deliverables
3. **Create detailed plans** for Phases 2, 3, 4
4. **Execute Phases 2-4** (can parallelize after Phase 1)
5. **Integration testing** across all phases
6. **Polish & deploy**

---

## Next Step

Execute Phase 1 using: `docs/superpowers/plans/2026-06-18-netflix-tv-phase1-foundation.md`

