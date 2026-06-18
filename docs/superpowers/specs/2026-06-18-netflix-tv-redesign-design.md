# Netflix TV Redesign - Design Specification

**Date:** 2026-06-18  
**Project:** O Phim TV App  
**Author:** AI Assistant  
**Status:** Draft

## Executive Summary

This specification defines a comprehensive redesign of the O Phim TV application to follow Netflix TV UX patterns. The redesign focuses exclusively on TV remote control interaction, removing all web and desktop app mechanisms to create a pure 10-foot experience optimized for 1080p TVs.

### Goals

1. **Netflix-inspired UX**: Adopt proven patterns from Netflix TV app for familiarity and usability
2. **TV-first design**: Remove mouse/touch interactions, optimize for D-pad navigation
3. **Visual consistency**: High-contrast focus indicators, Netflix-style scaling and borders
4. **Performance**: Smooth 60fps animations, responsive navigation, efficient image loading

### Key Changes

- **TV Home**: Hero 65vh, 5-6 visible items per row, Netflix-style focus indicators
- **TvDetail**: Vertical episode list with thumbnails, backdrop hero layout
- **CustomVideoPlayer**: Episode sidebar (420px), large controls, no fullscreen button
- **Focus System**: 4px white borders, 1.1x scale, auto-scroll to center

---

## 1. Visual Language & Design Tokens

### Color Palette

```scss
// Primary
$tv-bg: #141414;           // Netflix dark background
$tv-surface: #1a1a1a;      // Elevated surfaces
$tv-accent: #e50914;        // Netflix red for CTAs

// Text
$tv-text-primary: #ffffff;
$tv-text-secondary: rgba(255, 255, 255, 0.7);

// Focus
$tv-focus-border-color: #ffffff;
$tv-focus-shadow: rgba(0, 0, 0, 0.5);
```

### Typography Scale

```scss
// Sizes (optimized for TV viewing distance)
$tv-text-hero: 48px;       // Hero titles
$tv-text-section: 28px;    // Section headers
$tv-text-card: 18px;       // Card titles
$tv-text-body: 16px;       // Body text
$tv-text-small: 14px;      // Metadata, captions

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

### Spacing System

```scss
$tv-padding-x: 60px;       // Horizontal page padding
$tv-padding-y: 40px;       // Vertical section padding
$tv-gap-xs: 4px;
$tv-gap-sm: 8px;
$tv-gap-md: 12px;
$tv-gap-lg: 24px;
$tv-gap-xl: 32px;
```

### Focus Indicators

```scss
// Focus styling
$tv-focus-border: 4px solid $tv-focus-border-color;
$tv-focus-scale: 1.1;
$tv-focus-shadow: 0 8px 24px $tv-focus-shadow;
$tv-focus-transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);

// Mixin for all focusable elements
@mixin tv-focusable {
  border: 2px solid transparent;
  transition: transform $tv-focus-transition,
              border $tv-focus-transition,
              box-shadow $tv-focus-transition;
  
  &--focused {
    border: $tv-focus-border;
    transform: scale($tv-focus-scale);
    box-shadow: $tv-focus-shadow;
    z-index: 10;
  }
}
```

### Dimensions

```scss
// Layout
$tv-hero-height: 65vh;
$tv-sidebar-width: 420px;

// Cards
$tv-card-width: 220px;
$tv-card-height: 330px;
$tv-card-ratio: 2 / 3;     // Portrait
$tv-card-border-radius: 8px;

// Controls
$tv-control-button-size: 48px;
$tv-timeline-height: 8px;
$tv-timeline-thumb: 20px;
```

---

## 2. TV Home Page

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Hero Section (65vh)                    │
│  ┌────────────────────────────────┐     │
│  │ Backdrop + Gradient            │     │
│  │                                │     │
│  │  Title, Meta, Description      │     │
│  │  [Play Button]                 │     │
│  └────────────────────────────────┘     │
├─────────────────────────────────────────┤
│  Continue Watching Row                  │
│  [Card] [Card] [Card] [Card] [Card]     │
├─────────────────────────────────────────┤
│  Phim mới cập nhật                      │
│  [Card] [Card] [Card] [Card] [Card]     │
├─────────────────────────────────────────┤
│  Phim bộ                                │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Hero Section (TvHero)

**Container:**
- Height: `65vh` (approximately 700px on 1080p)
- Width: `100vw`
- Position: relative
- Background: Full-bleed backdrop image from TMDB

**Backdrop Image:**
- Source: TMDB backdrop (w1280 size)
- Object-fit: cover
- Z-index: 0

**Gradient Overlays:**
```scss
// Left gradient (for content readability)
.tv-hero__gradient-left {
  background: linear-gradient(90deg, #141414 0%, transparent 50%);
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50%;
  z-index: 1;
}

// Bottom gradient
.tv-hero__gradient-bottom {
  background: linear-gradient(0deg, #141414 0%, transparent 60%);
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  z-index: 1;
}
```

**Content Area:**
- Position: absolute, left 60px, bottom 100px
- Max-width: 40vw
- Z-index: 2

**Title:**
- Font-size: 48px
- Font-weight: 700
- Color: white
- Max-lines: 2
- Text-overflow: ellipsis

**Metadata Row:**
- Display: flex, gap 16px
- Font-size: 18px
- Color: rgba(255,255,255,0.8)
- Items: Year, Quality, Lang, Episode current

**Description:**
- Font-size: 16px
- Line-height: 24px
- Color: rgba(255,255,255,0.9)
- Max-lines: 3
- Margin-top: 20px

**Play Button:**
- Height: 56px
- Padding: 24px 40px
- Background: #e50914 (Netflix red)
- Border-radius: 4px
- Font-size: 20px, weight 600
- Icon: bx-play, 24px, margin-right 12px
- Focus state: 4px white border, scale 1.1
- Default focused: true (first focusable on page)

**Carousel:**
- Auto-play: 8 seconds per slide
- Transition: crossfade 600ms
- Items: 6-8 featured movies
- No manual controls (no arrows/dots)

### Content Rows (ContentRow)

**Row Container:**
- Margin-bottom: 48px
- Padding: 0 60px

**Row Header:**
- Title: 28px, weight 600
- Color: white
- Margin-bottom: 20px

**Row Track:**
- Display: flex
- Gap: 12px
- Overflow: visible (items extend beyond viewport)

**Items Per Row:**
- Visible: 5.5 items
- Calculation: `(viewport_width - 120px_padding - gap) / 5.5`
- Example 1920px: ~330px per slot, card 220px unfocused

### Movie Card (FocusCard)

**Dimensions:**
- Width: 220px (unfocused)
- Height: 330px (ratio 2:3)
- Border-radius: 8px

**Poster:**
- Source: TMDB poster (w300 size)
- Object-fit: cover
- Lazy loading: visible + 2 ahead

**Badge (top-right):**
- Position: absolute, top 8px, right 8px
- Background: rgba(0,0,0,0.7)
- Padding: 4px 8px
- Font-size: 12px
- Border-radius: 4px
- Content: episode_current or quality

**Info Overlay (visible only when focused):**
```scss
.content-row__info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%);
  padding: 16px;
  opacity: 0;
  transition: opacity 200ms;
  
  .content-row__card--focused & {
    opacity: 1;
  }
}
```

**Info Content:**
- Title: 18px, weight 500, white, max 2 lines
- Year: 14px, opacity 0.8, margin-top 4px

**Focus States:**

*Unfocused:*
- Border: 2px transparent
- Transform: scale(1)
- Z-index: 0

*Focused:*
- Border: 4px white
- Transform: scale(1.1) translateY(-8px)
- Box-shadow: 0 8px 24px rgba(0,0,0,0.5)
- Z-index: 10
- Info overlay: visible

**Scroll Behavior:**
- When card focused and col > 3: auto-scroll smooth to center focused card
- Implementation: `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })`

### Focus Navigation (Home)

**Zone/Row/Col Grid:**

- Zone 0: Sidebar (if visible)
- Zone 1, Row 0, Col 0: Hero Play button (default focus)
- Zone 1, Row 1-N, Col 0-11: ContentRow cards

**Navigation Rules:**
- ArrowDown from hero: Jump to first card in first content row
- ArrowDown in rows: Move to next row, preserve column (rowMemory)
- ArrowUp in rows: Move to previous row, preserve column
- ArrowLeft/Right in rows: Move between cards
- Backspace/Escape: Exit app or go back

**Removed Components:**
- BackToTop button (no longer needed)

---

## 3. TvDetail Page

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Hero Backdrop (50vh)                   │
│  ┌────────────────────────────────┐     │
│  │                                │     │
│  │  Info Overlay (bottom-left)    │     │
│  │  Title, Meta, Description      │     │
│  │  [Play Button]                 │     │
│  └────────────────────────────────┘     │
├─────────────────────────────────────────┤
│  Tập phim                               │
│  [Season Selector Tabs]                 │
│  ┌─────────────────────────────┐        │
│  │ [thumb] Tập 1 - Title       │        │
│  │         Description...      │        │
│  └─────────────────────────────┘        │
│  ┌─────────────────────────────┐        │
│  │ [thumb] Tập 2 - Title       │        │
│  │         Description...      │        │
│  └─────────────────────────────┘        │
│  ...                                    │
├─────────────────────────────────────────┤
│  Phim tương tự                          │
│  [Card] [Card] [Card] [Card] [Card]     │
└─────────────────────────────────────────┘
```

### Hero Section

**Backdrop Container:**
- Height: 50vh
- Background: TMDB backdrop (w1280), cover
- Position: relative

**Gradients:**
```scss
.tv-detail__hero-gradient-bottom {
  background: linear-gradient(0deg, #141414 0%, transparent 40%);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
}

.tv-detail__hero-gradient-left {
  background: linear-gradient(90deg, rgba(20,20,20,0.8) 0%, transparent 50%);
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50%;
}
```

### Info Overlay

**Container:**
- Position: absolute, bottom 60px, left 60px
- Max-width: 50%
- Z-index: 2

**Title:**
- Font-size: 48px
- Font-weight: 700
- Max-lines: 2

**Original Title (if different):**
- Font-size: 24px
- Font-weight: 400
- Opacity: 0.7
- Margin-top: 8px

**Metadata Row:**
- Display: flex, gap 16px
- Font-size: 18px
- Margin-top: 16px
- Items: Year, Quality, Lang, Episode count

**Categories/Tags:**
- Display: flex, gap 8px
- Margin-top: 16px

**Tag Item:**
- Padding: 6px 12px
- Background: rgba(255,255,255,0.2)
- Border-radius: 4px
- Font-size: 14px

**Description:**
- Font-size: 16px
- Line-height: 24px
- Opacity: 0.9
- Max-lines: 4
- Margin-top: 20px

### Action Buttons

**Container:**
- Margin-top: 32px
- Display: flex, gap 16px

**Play Button:**
- Height: 56px
- Padding: 24px 40px
- Background: white
- Color: black
- Font-size: 20px, weight 600
- Icon: bx-play, 24px
- Border-radius: 4px
- Focus: 4px white border, scale 1.1
- Default focused: true

### Episodes Section

**Container:**
- Margin-top: 40px
- Padding: 0 60px
- Background: #141414

**Section Header:**
- Display: flex
- Justify-content: space-between
- Align-items: center
- Margin-bottom: 24px

**Title:**
- "Tập phim"
- Font-size: 28px, weight 600

**Group Selector (if multiple seasons):**
- Display: flex, gap 12px

**Group Button:**
- Height: 48px
- Padding: 12px 24px
- Background: rgba(255,255,255,0.1)
- Border: 2px transparent
- Border-radius: 4px
- Font-size: 18px, weight 500

**Active State:**
- Background: rgba(255,255,255,0.2)

**Focus State:**
- Border: 4px white
- Scale: 1.1

### Episode List (Vertical)

**List Container:**
- Display: flex
- Flex-direction: column
- Gap: 8px
- Margin-bottom: 60px

**Episode Item:**
```scss
.tv-detail__episode-item {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: #1a1a1a;
  border-radius: 8px;
  border: 2px solid transparent;
  min-height: 120px;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &--focused {
    border: 4px solid white;
    transform: scale(1.05);
    background: #2a2a2a;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    z-index: 1;
  }
  
  &--current {
    border-left: 6px solid #e50914;
    padding-left: 10px;
  }
}
```

**Layout Structure:**
```
[Thumbnail 180x100] [Info flex-1] [Duration]
```

**Thumbnail:**
- Width: 180px
- Height: 100px (16:9 ratio)
- Border-radius: 6px
- Object-fit: cover
- Source: TMDB episode still (if available via `fetchTMDBImages`)
- Fallback: #2a2a2a background with play icon (bx-play-circle, 32px, opacity 0.5)

**Info Area:**
- Flex: 1
- Display: flex
- Flex-direction: column
- Justify-content: center
- Gap: 8px

**Episode Number & Title:**
- Display: flex, gap 12px, align-items: baseline
- Number: 20px, weight 600, color rgba(255,255,255,0.6)
- Title: 18px, weight 500, white, max 1 line ellipsis

**Episode Description:**
- Font-size: 14px
- Line-height: 20px
- Color: rgba(255,255,255,0.7)
- Max-lines: 2
- Text-overflow: ellipsis

**Duration:**
- Align-self: flex-start
- Padding-top: 8px
- Font-size: 14px
- Opacity: 0.7

### Similar Movies Section

**Container:**
- Margin-top: 60px
- Padding: 0 60px 60px

**Title:**
- "Phim tương tự"
- Font-size: 28px, weight 600
- Margin-bottom: 20px

**Content:**
- Reuse ContentRow component
- Display 5.5 items

### Focus Navigation (TvDetail)

**Zone/Row/Col Grid:**
- Zone 1, Row 0, Col 0: Play button (default focus)
- Zone 1, Row 100, Col 0-N: Group selector buttons
- Zone 1, Row 110-N, Col 0: Episode items (one per row, vertical)
- Zone 1, Row 200, Col 0-11: Similar movies cards

**Navigation Rules:**
- ArrowDown from Play button: Jump to group selector (if exists) or first episode
- ArrowDown/Up in episode list: Move between episodes
- ArrowDown from last episode: Jump to similar movies row
- ArrowLeft/Right in similar row: Navigate cards
- Backspace/Escape: Return to home

---

## 4. CustomVideoPlayer

### Layout Structure

```
┌─────────────────────────────────────────┐
│  [< Quay lại]                           │
│                                         │
│                                         │
│          Video Element                  │
│                                         │
│  ┌─────────────────────────┐            │
│  │ Info Overlay (paused)   │            │
│  │ Title, Episode, Desc    │            │
│  └─────────────────────────┘            │
│                                         │
│  ┌─────────────────────────┐            │
│  │ Autoplay Card (5s left) │            │
│  │ [Play Now] [Cancel]     │            │
│  └─────────────────────────┘            │
│  ┌─────────────────────────────────┐    │
│  │ [Timeline────────────●─────]    │    │
│  │ [▶] [|◄] [►|] [🔊] [List]      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
│ Episode Sidebar (opens right) │
│ [Close]                        │
│ ┌──────────────────────┐       │
│ │ [thumb] Tập 1        │       │
│ └──────────────────────┘       │
│ ┌──────────────────────┐       │
│ │ [thumb] Tập 2        │       │
│ └──────────────────────┘       │
└────────────────────────────────┘
```

### Container

- Width: 100vw
- Height: 100vh
- Background: black
- Position: relative
- No fullscreen API usage (TV always fullscreen)

### Video Element

```scss
video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}
```

### Back Button

**Position:** Absolute, top 40px, left 60px

**Button:**
- Height: 48px
- Padding: 12px 24px
- Background: rgba(0,0,0,0.6)
- Border-radius: 24px
- Border: 2px transparent
- Display: flex, gap 8px, align-items: center

**Content:**
- Icon: bx-arrow-back, 24px
- Text: "Quay lại", 18px

**Focus:**
- Border: 4px white
- Scale: 1.1

**Behavior:**
- Always visible (does not fade with controls)
- Zone 2, Row 0, Col 0

### Controls Container

**Layout:**
- Position: absolute, bottom 0, left 0, right 0
- Height: 200px
- Padding: 40px 60px 60px
- Background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)
- Z-index: 5

**Visibility:**
- Opacity: 1 when active (user input within 3s)
- Opacity: 0 when idle (no input for 3s)
- Transition: opacity 300ms ease-out

### Timeline (Seekbar)

**Container:**
- Margin-bottom: 24px
- Height: 32px (larger hit area)
- Position: relative

**Track:**

- Height: 8px (doubled from 4px)
- Background: rgba(255,255,255,0.3)
- Border-radius: 4px
- Position: absolute, top 12px

**Progress Bar:**
- Height: 8px
- Background: #e50914 (Netflix red)
- Border-radius: 4px
- Width: percentage of currentTime/duration

**Buffered Bar:**
- Height: 8px
- Background: rgba(255,255,255,0.5)
- Position: absolute, same track

**Thumb:**
- Width: 20px, Height: 20px (enlarged from 12px)
- Border-radius: 50%
- Background: white
- Position: absolute, top 2px
- Transform: translateX(-50%)
- Box-shadow: 0 2px 8px rgba(0,0,0,0.5)
- Opacity: 0 when timeline not focused
- Opacity: 1 when timeline focused

**Focus State:**
- Thumb scale: 1.2
- Track height: 10px (slightly taller)

### Bottom Control Bar

**Container:**
- Display: flex
- Gap: 24px
- Align-items: center
- Height: 56px

**Control Button (base style):**
```scss
.custom-video-player__control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:disabled {
    opacity: 0.3;
    pointer-events: none;
  }
  
  &--focused {
    border: 4px solid white;
    transform: scale(1.15);
  }
  
  i {
    font-size: 28px;
    color: white;
  }
}
```

**Buttons (left to right):**

1. **Play/Pause Button:**
   - Icon: bx-play / bx-pause, 32px
   - Zone 2, Row 2, Col 0

2. **Previous Episode Button:**
   - Icon: bx-skip-previous, 28px
   - Disabled if currentEpisodeIndex === 0
   - Zone 2, Row 2, Col 1

3. **Next Episode Button:**
   - Icon: bx-skip-next, 28px
   - Disabled if currentEpisodeIndex === episodeList.length - 1
   - Zone 2, Row 2, Col 2

4. **Progress Text (spacer):**
   - Margin-left: auto
   - Font-size: 16px, weight 500
   - Format: "12:34 / 45:67"
   - Not focusable

5. **Volume Button:**
   - Icon: bx-volume-full / bx-volume-mute, 28px
   - Click: toggle mute
   - Zone 2, Row 2, Col 3

6. **Episode List Button:**
   - Icon: bx-list-ul, 28px
   - Click: toggle episode sidebar
   - Zone 2, Row 2, Col 4

**Removed:**
- Fullscreen button (TV is always fullscreen)
- Volume slider (just mute toggle)

### Episode Sidebar

**Container:**
```scss
.custom-video-player__episode-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: -4px 0 16px rgba(0,0,0,0.5);
  z-index: 20;
  
  transform: translateX(420px); // Closed
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &--open {
    transform: translateX(0);
  }
}
```

**Header:**
- Padding: 40px 24px 24px
- Border-bottom: 1px solid rgba(255,255,255,0.1)
- Display: flex, justify-content: space-between

**Header Title:**
- "Tập phim"
- Font-size: 24px, weight 600

**Close Button:**
- Width: 40px, Height: 40px
- Border-radius: 50%
- Icon: bx-x, 28px
- Focus: 4px white border, scale 1.1
- Zone 3, Row 0, Col 0 (when sidebar open)

**Episode List:**
- Padding: 16px
- Height: calc(100vh - 120px)
- Overflow-y: auto
- Display: flex, flex-direction: column
- Gap: 8px

**Episode Item (sidebar):**
```scss
.episode-sidebar__item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  border: 2px solid transparent;
  min-height: 80px;
  align-items: center;
  
  &--current {
    background: rgba(229,9,20,0.2);
    border-left: 4px solid #e50914;
  }
  
  &--focused {
    border: 4px solid white;
    background: rgba(255,255,255,0.1);
    transform: scale(1.02);
  }
}
```

**Item Layout:**
```
[Thumbnail 100x56] [Info]
```

**Thumbnail:**
- Width: 100px, Height: 56px (16:9)
- Border-radius: 4px
- Background: #2a2a2a if no thumbnail
- Play icon if no thumbnail

**Info:**
- Flex: 1

**Episode Number:**
- Font-size: 16px, weight 600
- Opacity: 0.6

**Episode Title:**
- Font-size: 16px, weight 500
- Color: white
- Max-lines: 2
- Margin-top: 4px

**Focus Navigation (sidebar):**
- ArrowDown/Up: Navigate between episodes
- Enter: Select episode, close sidebar
- Backspace/Escape: Close sidebar
- Focus trap: cannot navigate outside sidebar when open

### Info Overlay (when paused)

**Container:**
```scss
.custom-video-player__info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  padding: 60px;
  background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, transparent 100%);
  z-index: 3;
  pointer-events: none;
  
  opacity: 0;
  transition: opacity 400ms;
  
  .custom-video-player--paused & {
    opacity: 1;
  }
}
```

**Content:**
- Title: 36px, weight 700
- Episode: 20px, weight 500, opacity 0.8, margin-top 12px
- Description: 16px, line-height 24px, opacity 0.9, max 4 lines, margin-top 16px

### Autoplay Card

**Container:**
```scss
.custom-video-player__autoplay-card {
  position: absolute;
  bottom: 120px;
  right: 60px;
  width: 400px;
  padding: 24px;
  background: rgba(20,20,20,0.95);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  z-index: 15;
  
  opacity: 0;
  transition: opacity 300ms;
  
  &--visible {
    opacity: 1;
  }
}
```

**Content:**
- Small text: "Tiếp theo" - 14px, opacity 0.7
- Episode title: 20px, weight 600, margin 8px 0
- Countdown: "Tự động phát sau {X}s" - 16px, opacity 0.8

**Buttons:**
- Display: flex, gap 12px
- Margin-top: 20px

**Play Now Button:**
- Flex: 1
- Height: 48px
- Background: white
- Color: black
- Text: "Phát ngay" - 16px, weight 600
- Border-radius: 4px
- Focus: 4px #e50914 border, scale 1.05
- Zone 4, Row 0, Col 0
- Animation: pulse border during countdown

**Cancel Button:**
- Width: 48px, Height: 48px
- Background: transparent
- Border: 2px rgba(255,255,255,0.3)
- Border-radius: 50%
- Icon: bx-x, 24px
- Focus: 4px white border, scale 1.1
- Zone 4, Row 0, Col 1

**Behavior:**
- Appears: 5 seconds before video end
- Countdown: 5 to 0
- Auto-play: When countdown reaches 0, play next episode
- Dismiss: Click cancel or navigate away

### Loading State

**Container:**
- Position: absolute, center of video
- Display: flex, flex-direction: column, align-items: center
- Z-index: 100

**Spinner:**
- Width: 64px, Height: 64px
- Border: 4px solid rgba(255,255,255,0.2)
- Border-top-color: white
- Border-radius: 50%
- Animation: spin 800ms linear infinite

**Text:**
- "Đang tải..."
- Font-size: 16px
- Opacity: 0.8
- Margin-top: 16px

### Error State

**Container:**
- Position: absolute, center of video
- Text-align: center
- Max-width: 500px
- Padding: 40px

**Icon:**
- bx-error-circle
- Font-size: 64px
- Color: #e50914

**Title:**
- "Không thể phát video"
- Font-size: 24px, weight 600
- Margin-top: 16px

**Message:**
- Error details
- Font-size: 16px
- Opacity: 0.8
- Margin-top: 8px

### Focus Navigation (Player)

**Zones:**
- Zone 2: Player controls
  - Row 0: Back button
  - Row 1: Timeline
  - Row 2: Control bar buttons (col 0-4)
- Zone 3: Episode sidebar (when open)
  - Row 0: Close button
  - Row 1-N: Episode items
- Zone 4: Autoplay card (when visible)
  - Row 0, Col 0-1: Play Now, Cancel buttons

**Navigation Logic:**
- Default focus: Play/Pause button
- When sidebar opens: Focus jumps to Close button (Zone 3)
- When autoplay appears: Focus option to jump to Play Now button
- Focus trap: When sidebar open, cannot navigate to Zone 2
- Backspace: Close sidebar (if open) or close player

**Keyboard Shortcuts:**
- Space: Toggle play/pause
- ArrowLeft (not focused on timeline): Seek -10s
- ArrowRight (not focused on timeline): Seek +10s
- M: Toggle mute
- Backspace/Escape: Close player or close sidebar

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1)

**Tasks:**
1. Create `src/scss/tv-variables.scss` with all design tokens
2. Create `@mixin tv-focusable` for consistent focus styling
3. Enhance FocusContext:
   - Add focus trap logic for zones
   - Add zone priority system
   - Test zone switching
4. Create new components:
   - `src/components/episode-list-item/EpisodeListItem.jsx`
   - `src/components/video-player/episode-sidebar/EpisodeSidebar.jsx`
   - `src/components/video-player/info-overlay/InfoOverlay.jsx`
   - Refactor autoplay into `src/components/video-player/autoplay-card/AutoplayCard.jsx`

**Deliverables:**
- tv-variables.scss committed
- Focus system enhanced and tested
- New component shells created
- Unit tests for focus navigation

### Phase 2: TV Home (Week 1-2)

**Tasks:**
1. Update TvHero component:
   - Increase height to 65vh
   - Update gradient overlays
   - Restyle play button (Netflix red)
   - Remove carousel indicators
2. Update ContentRow component:
   - New card dimensions (220x330)
   - Info overlay (visible on focus)
   - Scroll-to-center logic
3. Update FocusCard component:
   - Apply tv-focusable mixin
   - Netflix-style focus indicators
4. Remove BackToTop component from Home.jsx
5. Update SCSS files with new styles

**Deliverables:**
- TvHome matches design spec
- Focus navigation smooth and responsive
- Visual QA passed

### Phase 3: TvDetail (Week 2)

**Tasks:**
1. Rewrite TvDetail.jsx layout:
   - Hero backdrop with info overlay
   - Vertical episode list using EpisodeListItem
   - Update group selector styling
   - Add similar section
2. Implement TMDB episode thumbnail fetching:
   - Extend fetchTMDBImages utility
   - Fetch episode stills if available
   - Fallback to placeholder
3. Update tv-detail.scss completely
4. Test focus navigation through all sections

**Deliverables:**
- TvDetail matches design spec
- Episode list functional with thumbnails
- Focus navigation tested

### Phase 4: CustomVideoPlayer (Week 3)

**Tasks:**
1. Update CustomVideoPlayer.jsx:
   - Remove fullscreen logic (lines 243-264, 473-475)
   - Resize all controls (48px buttons)
   - Update timeline (8px bar, 20px thumb)
   - Remove episode grid dialog
2. Integrate EpisodeSidebar:
   - Wire up open/close logic
   - Focus trap when open
   - Episode selection
3. Integrate InfoOverlay:
   - Show/hide based on paused state
   - Display title, episode, description
4. Update AutoplayCard:
   - New visual style
   - Focus navigation
5. Update CustomVideoPlayerChrome:
   - Simplify to just bottom bar
   - Remove top bar elements
6. Update custom-video-player.scss

**Deliverables:**
- CustomVideoPlayer matches design spec
- Episode sidebar functional
- All controls work correctly
- No fullscreen button

### Phase 5: Polish & Testing (Week 3-4)

**Tasks:**
1. Fine-tune animations and transitions
2. Performance optimization:
   - Image lazy loading
   - Smooth scrolling
   - requestAnimationFrame for animations
3. Cross-component integration testing
4. Edge case handling:
   - Empty episodes
   - Missing thumbnails
   - Network errors
5. Manual QA against test checklist
6. Bug fixes

**Deliverables:**
- All tests passing
- Performance benchmarks met
- Bug-free release candidate

---

## 6. File Changes Summary

### New Files

1. `src/scss/tv-variables.scss` (~150 lines)
2. `src/components/episode-list-item/EpisodeListItem.jsx` (~100 lines)
3. `src/components/episode-list-item/episode-list-item.scss` (~80 lines)
4. `src/components/video-player/episode-sidebar/EpisodeSidebar.jsx` (~150 lines)
5. `src/components/video-player/episode-sidebar/episode-sidebar.scss` (~100 lines)
6. `src/components/video-player/info-overlay/InfoOverlay.jsx` (~50 lines)
7. `src/components/video-player/info-overlay/info-overlay.scss` (~40 lines)
8. `src/components/video-player/autoplay-card/AutoplayCard.jsx` (~100 lines)
9. `src/components/video-player/autoplay-card/autoplay-card.scss` (~60 lines)

### Modified Files (Heavy)

1. `src/pages/detail/TvDetail.jsx` (~200 lines changed)
2. `src/pages/detail/tv-detail.scss` (~200+ lines changed)
3. `src/components/video-player/CustomVideoPlayer.jsx` (~300-400 lines changed)
4. `src/components/video-player/custom-video-player.scss` (~250+ lines changed)

### Modified Files (Light-Medium)

1. `src/context/FocusContext.jsx` (~50 lines changed)
2. `src/components/tv-hero/TvHero.jsx` (~60 lines changed)
3. `src/components/tv-hero/tv-hero.scss` (~100 lines changed)
4. `src/components/content-row/ContentRow.jsx` (~40 lines changed)
5. `src/components/content-row/content-row.scss` (~70 lines changed)
6. `src/pages/Home.jsx` (~15 lines changed)
7. `src/components/video-player/CustomVideoPlayerChrome.jsx` (~150 lines changed)
8. `src/utils/tmdbImageFetcher.js` (~30 lines added for episode stills)

### Deleted Components

1. BackToTop component from Home.jsx (lines 47-69, 121)

---

## 7. Technical Specifications

### Episode Thumbnail Fetching

**Implementation in `tmdbImageFetcher.js`:**

```javascript
export async function fetchEpisodeStill(tmdbId, seasonNumber, episodeNumber) {
  if (!tmdbId || !seasonNumber || !episodeNumber) return null;
  
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        params: {
          api_key: process.env.REACT_APP_TMDB_API_KEY,
          language: 'vi-VN',
        },
      }
    );
    
    const stillPath = response.data?.still_path;
    if (!stillPath) return null;
    
    return `https://image.tmdb.org/t/p/w300${stillPath}`;
  } catch (error) {
    console.error('fetchEpisodeStill error:', error);
    return null;
  }
}
```

**Usage in EpisodeListItem:**
- Attempt to parse season/episode from episode name
- Fetch still if tmdbId available
- Show loading placeholder during fetch
- Fallback to generic placeholder if fetch fails

### Focus Trap Implementation

**In FocusContext reducer:**

```javascript
case 'NAVIGATE': {
  const { direction } = action;
  const { zone, row, col, grid, activeTrap } = state;
  
  // If a zone trap is active, prevent navigation outside
  if (activeTrap && zone === activeTrap) {
    // Only allow navigation within trapped zone
    const trapGrid = grid[activeTrap];
    // ... navigate within trapGrid only
    return { ...state, row: newRow, col: newCol };
  }
  
  // Normal navigation logic
  // ...
}

case 'SET_TRAP': {
  return { ...state, activeTrap: action.zone };
}

case 'CLEAR_TRAP': {
  return { ...state, activeTrap: null };
}
```

### Scroll-to-Center Logic

**In ContentRow when card focused:**

```javascript
useEffect(() => {
  if (focused && ref.current) {
    ref.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }
}, [focused]);
```

### Performance Optimizations

**Image Lazy Loading:**
```javascript
// In FocusCard
const [imageSrc, setImageSrc] = useState(FALLBACK);

useEffect(() => {
  if (!isVisible) return; // Only load when in viewport
  
  fetchTMDBImages(item.tmdb).then(({ posterUrl }) => {
    if (posterUrl) setImageSrc(posterUrl);
  });
}, [isVisible, item.tmdb]);
```

**Use Intersection Observer:**
```javascript
const observerRef = useRef();

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setIsVisible(entry.isIntersecting),
    { rootMargin: '200px' } // Load 200px ahead
  );
  
  if (ref.current) observer.observe(ref.current);
  
  return () => observer.disconnect();
}, []);
```

---

## 8. Testing Checklist

### Focus Navigation

- [ ] Home: Hero → First row → Cards
- [ ] Home: Row navigation preserves column (rowMemory)
- [ ] Home: Card focus triggers scroll-to-center
- [ ] Home: No dead ends, can always navigate back
- [ ] TvDetail: Play button default focused
- [ ] TvDetail: Navigate to group selector, episodes, similar
- [ ] TvDetail: Episode list vertical navigation smooth
- [ ] Player: Controls focused by default
- [ ] Player: Timeline, buttons all focusable
- [ ] Player: Episode sidebar opens, focus trapped
- [ ] Player: Autoplay card appears, buttons focusable
- [ ] Player: Backspace closes sidebar then player

### Visual

- [ ] All focus indicators: 4px white border
- [ ] All focused elements: scale 1.1x
- [ ] No layout shift on neighboring elements
- [ ] Transitions smooth (200ms)
- [ ] Gradients render without banding
- [ ] Images load, fallbacks work
- [ ] Text ellipsis on overflow

### Video Playback

- [ ] HLS streams play
- [ ] Episode switching works
- [ ] Timeline seeking works
- [ ] Volume toggle works
- [ ] Autoplay countdown functions
- [ ] Next/Prev episode buttons (enabled/disabled correctly)
- [ ] Info overlay shows when paused
- [ ] No fullscreen button present

### Edge Cases

- [ ] Empty episode list handled
- [ ] Missing thumbnails show placeholder
- [ ] Very long titles truncated
- [ ] Network errors show error state
- [ ] Single episode hides prev/next buttons
- [ ] TMDB fetch failures don't break UI

### Performance

- [ ] Smooth 60fps animations
- [ ] No janky scrolling
- [ ] Images lazy load
- [ ] No memory leaks (long session test)
- [ ] Episode sidebar scroll smooth

---

## 9. Rollback Plan

### Git Strategy

**Branches:**
- `main`: stable production
- `feature/netflix-tv-redesign`: integration branch
- `feature/netflix-tv-phase-1`: foundation
- `feature/netflix-tv-phase-2`: home
- `feature/netflix-tv-phase-3`: detail
- `feature/netflix-tv-phase-4`: player

**Tags:**
- `v-before-netflix-redesign`: backup point
- `phase-1-complete`, `phase-2-complete`, etc.

### Rollback Steps

**Phase rollback:**
```bash
git revert <phase-tag>
```

**Component rollback:**
```bash
git checkout <old-commit> -- <file-path>
```

**Full rollback:**
```bash
git reset --hard v-before-netflix-redesign
```

---

## 10. Success Criteria

### Functional

- [ ] All focus navigation works without dead ends
- [ ] Video playback stable and reliable
- [ ] Episode selection and switching smooth
- [ ] All interactive elements accessible via D-pad

### Visual

- [ ] Matches Netflix TV visual language
- [ ] Focus indicators clear and consistent
- [ ] Typography readable from TV distance
- [ ] No visual glitches or artifacts

### Performance

- [ ] 60fps animations
- [ ] Page load < 2s (on good network)
- [ ] Image load progressive, no blank screens
- [ ] Video start < 3s (HLS negotiation)

### User Experience

- [ ] Navigation intuitive, no confusion
- [ ] Focus always visible and clear
- [ ] Back button always works
- [ ] No accidental exits or locks

---

## End of Specification

**Next Steps:**
1. Review and approve this specification
2. Create implementation plan using writing-plans skill
3. Begin Phase 1 implementation

