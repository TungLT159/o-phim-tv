# Thiết kế: Refactor Focus System với Smooth Navigation

**Ngày:** 2026-06-18  
**Tác giả:** Kiro  
**Trạng thái:** Design Approved

## 1. Tổng quan

### 1.1 Vấn đề hiện tại

Hệ thống focus navigation trong video player đang gặp các vấn đề UX:

1. **Focus không scroll về giữa màn hình**: Khi di chuyển từ nút phát xuống list tập, màn hình không scroll xuống
2. **Focus nhảy cóc**: Focus bỏ qua một số episode items thay vì đi tuần tự
3. **Thiếu zone skip**: Phải nhấn nhiều lần để từ player controls xuống episode list
4. **Không có key acceleration**: Phải giữ nút xuống lâu để scroll danh sách dài
5. **Tua video thiếu feedback**: Không hiển thị thời gian khi đang tua
6. **Tua video không tăng tốc**: Giữ Left/Right không tua nhanh hơn

### 1.2 Mục tiêu

Refactor toàn bộ focus system để:

- Focus luôn scroll về giữa viewport khi di chuyển giữa rows
- Di chuyển tuần tự không bỏ qua items
- Nhảy nhanh giữa các zones quan trọng
- Tăng tốc scroll khi giữ phím lâu
- Hiển thị thời gian khi tua video
- Tăng tốc tua khi giữ phím lâu

### 1.3 Scope

**Trong scope:**
- Refactor FocusContext navigation logic
- Thêm acceleration engine
- Thêm zone skip rules
- Implement smooth scroll với centering
- Thêm seek tooltip
- Thêm seek acceleration

**Ngoài scope:**
- Video thumbnail preview (chỉ hiển thị text)
- Touch gesture acceleration
- Custom acceleration curves (dùng fixed curve)

## 2. Architecture

### 2.1 Key Acceleration System

**Acceleration Engine** track:
- Thời gian giữ phím (elapsed time)
- Step multiplier (hệ số nhân)
- Active key state

**Acceleration Curve:**

```
Thời gian giữ     | Step Multiplier | Bước nhảy
------------------|-----------------|------------
0-500ms           | 1x              | 1 item
500ms-1000ms      | 2x              | 2 items
1000ms-2000ms     | 4x              | 4 items
>2000ms           | 8x              | 8 items
```

**Implementation:**
- Dùng `keydown` + `keyup` events để track
- `setInterval` (150ms) để check elapsed time và update multiplier
- Apply multiplier vào navigation step
- Reset về 1x khi `keyup`

### 2.2 Zone Skip Rules

**Navigation shortcuts** giữa zones:

| Từ Zone | Phím       | Hành động                              |
|---------|------------|----------------------------------------|
| 2       | ArrowDown  | Nhảy thẳng zone 3 (episode sidebar)   |
| 3       | ArrowUp    | Quay lại zone 2 (restore last focus)  |

**Data Structure:**

```javascript
const ZONE_SKIP_RULES = {
  2: { // Player controls zone
    ArrowDown: { targetZone: 3, targetRow: 0 },
  },
  3: { // Episode sidebar zone
    ArrowUp: { targetZone: 2, restoreLastFocus: true },
  }
};
```

### 2.3 Smooth Scroll Strategy

**Quyết định khi nào scroll về center:**

```javascript
shouldScrollToCenter(oldRow, newRow, oldZone, newZone) {
  // Scroll về center khi:
  return (
    newRow !== oldRow ||     // Di chuyển dọc
    newZone !== oldZone      // Đổi zone
  );
  
  // Không scroll (block: 'nearest') khi:
  // - Di chuyển ngang trong cùng row
}
```

**scrollIntoView configuration:**

```javascript
element.scrollIntoView({
  block: shouldCenter ? 'center' : 'nearest',
  inline: 'nearest',
  behavior: 'smooth'
});
```

### 2.4 Seek Enhancement Architecture

**SeekTooltip Component:**
- Position: Phía trên timeline thumb
- Content: `"15:30 / 45:00"` (current / total)
- Show: Khi focus timeline hoặc đang drag
- Hide: 500ms sau khi blur/release

**Seek Acceleration Curve:**

```
Thời gian giữ     | Seek Step
------------------|------------
0-500ms           | 10s
500ms-1500ms      | 30s
1500ms-3000ms     | 60s
>3000ms           | 120s
```

## 3. Component Changes

### 3.1 FocusContext State

**Thêm vào state:**

```javascript
{
  // Existing state...
  zone, row, col, grid, maxRows, rowMemory, 
  isActive, activeTrap, savedFocus,
  
  // NEW: Acceleration state
  accelerationState: {
    activeKey: null,        // 'ArrowDown', 'ArrowUp', etc.
    startTime: null,        // Timestamp bắt đầu giữ
    stepMultiplier: 1,      // 1, 2, 4, 8
    intervalId: null,       // setInterval ID
  },
  
  // NEW: Zone skip tracking
  lastFocusPerZone: {      // Lưu last focus mỗi zone
    0: { row: 0, col: 0 },
    1: { row: 0, col: 0 },
    // ...
  }
}
```

**New actions:**

```javascript
// Acceleration actions
{ type: 'START_ACCELERATION', key: 'ArrowDown' }
{ type: 'UPDATE_ACCELERATION', multiplier: 2 }
{ type: 'STOP_ACCELERATION' }

// Zone skip actions
{ type: 'SKIP_TO_ZONE', targetZone: 3, targetRow: 0 }
{ type: 'SAVE_ZONE_FOCUS', zone: 2 }
```

### 3.2 FocusContext Navigation Logic

**Fixed Row Traversal:**

```javascript
// OLD (có thể nhảy cóc):
findNextRow(grid, currentRow) {
  const rows = Object.keys(grid).map(Number).sort((a,b) => a-b);
  return rows.find(r => r > currentRow) ?? currentRow;
}

// NEW (đi tuần tự):
findNextRowSequential(grid, currentRow, stepMultiplier = 1) {
  const allRows = Object.keys(grid).map(Number).sort((a,b) => a-b);
  const currentIndex = allRows.indexOf(currentRow);
  const targetIndex = Math.min(
    currentIndex + stepMultiplier, 
    allRows.length - 1
  );
  return allRows[targetIndex] ?? currentRow;
}
```

**Improved Column Memory:**

```javascript
// Khi di chuyển dọc:
// 1. Lưu column hiện tại vào rowMemory
// 2. Check row mới có column đó không
// 3. Nếu có → giữ nguyên
// 4. Nếu không → chọn column gần nhất
// 5. Di chuyển ngang → clear memory của row hiện tại
```

### 3.3 CustomVideoPlayer Seek

**New state:**

```javascript
const [seekTooltip, setSeekTooltip] = useState({
  visible: false,
  currentTime: 0,
  duration: 0,
});

const [seekAcceleration, setSeekAcceleration] = useState({
  startTime: null,
  step: 10, // seconds
});
```

**Seek acceleration logic:**

```javascript
const calculateSeekStep = (elapsedMs) => {
  if (elapsedMs < 500) return 10;
  if (elapsedMs < 1500) return 30;
  if (elapsedMs < 3000) return 60;
  return 120;
};

// Trong handleKeyDown:
case 'ArrowLeft':
case 'ArrowRight':
  if (isTimelineFocused) {
    const elapsed = Date.now() - seekAcceleration.startTime;
    const step = calculateSeekStep(elapsed);
    seekBy(event.key === 'ArrowRight' ? step : -step);
    updateSeekTooltip();
  }
```

### 3.4 New Component: SeekTooltip

**File:** `src/components/video-player/seek-tooltip/SeekTooltip.jsx`

```jsx
const SeekTooltip = ({ visible, currentTime, duration, position }) => {
  if (!visible) return null;
  
  return (
    <div 
      className="seek-tooltip" 
      style={{ left: `${position}%` }}
    >
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  );
};
```

**SCSS:**

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
}
```

## 4. Data Flow

### 4.1 Acceleration Flow

```
1. User presses ArrowDown
   ↓
2. keydown event → dispatch START_ACCELERATION
   ↓
3. setInterval starts (150ms)
   ↓
4. Every tick:
   - Calculate elapsed time
   - Determine multiplier (1x → 2x → 4x → 8x)
   - dispatch UPDATE_ACCELERATION
   ↓
5. Navigation uses stepMultiplier:
   - findNextRow(grid, row, stepMultiplier)
   ↓
6. User releases key
   ↓
7. keyup event → dispatch STOP_ACCELERATION
   ↓
8. Reset to 1x, clear interval
```

### 4.2 Zone Skip Flow

```
1. User at zone 2 (player controls), row 3
   ↓
2. Press ArrowDown
   ↓
3. Check ZONE_SKIP_RULES[2].ArrowDown
   ↓
4. Rule found: { targetZone: 3, targetRow: 0 }
   ↓
5. dispatch SAVE_ZONE_FOCUS (zone 2, row 3)
   ↓
6. dispatch SKIP_TO_ZONE (zone 3, row 0)
   ↓
7. Focus moves to zone 3, row 0
   ↓
8. Scroll to center
```

### 4.3 Seek Acceleration Flow

```
1. Timeline focused
   ↓
2. User presses ArrowRight
   ↓
3. Start tracking: seekAcceleration.startTime = Date.now()
   ↓
4. setInterval (100ms):
   - Calculate elapsed = now - startTime
   - step = calculateSeekStep(elapsed)
   - seekBy(step)
   - Update tooltip position & time
   ↓
5. User releases key
   ↓
6. Clear interval
   ↓
7. Hide tooltip after 500ms
```

## 5. Performance Optimizations

### 5.1 Scroll Throttling

```javascript
// Throttle scroll calls to 60fps
const throttledScroll = throttle((element, options) => {
  element.scrollIntoView(options);
}, 16); // ~60fps
```

### 5.2 Cancel Pending Scrolls

```javascript
// Nếu user spam phím, cancel scroll animation cũ
let pendingScrollCancel = null;

const scrollToElement = (element, options) => {
  if (pendingScrollCancel) {
    pendingScrollCancel();
  }
  
  const controller = new AbortController();
  pendingScrollCancel = () => controller.abort();
  
  element.scrollIntoView({ ...options, signal: controller.signal });
};
```

### 5.3 CSS Optimization

```scss
// Hint browser optimize scroll animation
.episode-sidebar__item,
.custom-video-player__control-btn {
  will-change: transform;
  contain: layout style paint;
}

// Smooth scroll container
.episode-sidebar__list {
  scroll-behavior: smooth;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

### 5.4 RequestAnimationFrame Sync

```javascript
// Sync focus updates với browser paint
const updateFocus = (newZone, newRow, newCol) => {
  requestAnimationFrame(() => {
    dispatch({ type: 'NAVIGATE', zone: newZone, row: newRow, col: newCol });
    
    requestAnimationFrame(() => {
      focusCurrent();
    });
  });
};
```

## 6. Edge Cases & Testing

### 6.1 Edge Cases

| Case | Behavior |
|------|----------|
| Spam phím nhanh | Throttle navigation, cancel pending scrolls |
| Giữ phím ở cuối list | Stop at last item, không wrap around |
| Zone boundary | Save last focus, restore khi quay lại |
| Empty rows | Skip row, nhảy sang row có items tiếp theo |
| 100+ episodes | Virtual scrolling (future), hiện tại test performance |
| Trap + acceleration | Acceleration chỉ work trong trapped zone |
| Timeline ở đầu/cuối | Stop at 0:00 / duration, không seek quá |

### 6.2 Test Scenarios

**Unit tests:**
- `calculateSeekStep(elapsed)` returns correct values
- `findNextRowSequential(grid, row, multiplier)` không bỏ qua rows
- `shouldScrollToCenter(oldRow, newRow)` logic đúng
- Zone skip rules apply correctly

**Integration tests:**
- Giữ ArrowDown 3 giây → multiplier tăng 1x → 2x → 4x → 8x
- Từ player press Down 1 lần → nhảy thẳng sidebar
- Focus timeline + giữ Right 2s → step tăng từ 10s → 30s → 60s
- Scroll về center khi đổi row, không scroll khi di chuyển ngang

**E2E tests:**
- User flow: Play video → Open episodes → Navigate 50 episodes → Select episode
- Seek flow: Focus timeline → Seek forward 2 mins → Seek backward 30s
- Rapid navigation: Spam Down key 20 times → no lag/crash

### 6.3 Backward Compatibility

**Không được break:**
- Mouse/touch navigation
- Focus trap trong dialogs
- SaveFocus/RestoreFocus API
- Existing zones (0-5)
- Video player controls (play, pause, next/prev episode)

**Fallback:**
```javascript
// Nếu browser không support smooth scroll
const supportsSmooth = 'scrollBehavior' in document.documentElement.style;

element.scrollIntoView({
  block: 'center',
  behavior: supportsSmooth ? 'smooth' : 'auto'
});
```

## 7. Implementation Plan

### Phase 1: Core Refactor (FocusContext)
1. Add acceleration state to reducer
2. Implement `START/UPDATE/STOP_ACCELERATION` actions
3. Fix `findNextRow/findPrevRow` logic
4. Implement zone skip rules
5. Update `focusCurrent` with smart scroll

### Phase 2: Video Player Seek
1. Create `SeekTooltip` component
2. Add seek acceleration logic to `CustomVideoPlayer`
3. Integrate tooltip with timeline focus/drag
4. Add SCSS styles

### Phase 3: Polish & Optimization
1. Add throttling/debouncing
2. Implement cancel pending scrolls
3. Add CSS optimizations (`will-change`, `contain`)
4. Performance testing với 100+ episodes

### Phase 4: Testing
1. Write unit tests
2. Write integration tests
3. Manual testing edge cases
4. Fix bugs

## 8. Success Metrics

**Trước refactor:**
- Focus nhảy cóc: 5-7 items bị bỏ qua trong list 50 tập
- Từ player → sidebar: phải nhấn Down 4-5 lần
- Scroll 50 tập: phải giữ nút ~10 giây
- Tua video: không feedback, tốc độ cố định

**Sau refactor:**
- Focus không bỏ qua items (đi tuần tự 100%)
- Từ player → sidebar: 1 lần nhấn Down
- Scroll 50 tập: ~3 giây với acceleration
- Tua video: có tooltip thời gian, tăng tốc rõ ràng

**KPIs:**
- Navigation accuracy: 100% (không bỏ qua items)
- Time to scroll 50 items: giảm 70% (10s → 3s)
- Zone skip usage: tăng 100% (có feature mới)
- User satisfaction: feedback từ testing

## 9. Known Limitations

1. **Không có video thumbnail preview**: Chỉ hiển thị text timestamp (có thể thêm sau)
2. **Fixed acceleration curve**: Chưa có customization (có thể thêm settings sau)
3. **Keyboard only**: Không support touch gesture acceleration
4. **Không support wrap-around**: Focus stop ở đầu/cuối list, không quay vòng
5. **Virtual scrolling**: Chưa implement cho lists rất dài (>500 items)

## 10. Future Enhancements (Out of Scope)

1. **Video thumbnail preview**: Hiển thị frame tại vị trí tua
2. **Custom acceleration curves**: User settings để điều chỉnh tốc độ
3. **Touch gesture acceleration**: Swipe velocity → scroll speed
4. **Virtual scrolling**: Optimize cho 1000+ episodes
5. **Analytics tracking**: Track user behavior với acceleration
6. **Haptic feedback**: Rung khi acceleration kick in (mobile/TV)
7. **Keyboard shortcuts**: Page Up/Down, Home/End navigation
8. **Search jump**: Nhảy đến tập bằng search/số

## 11. Dependencies

**Không cần thêm package mới:**
- Tất cả implement bằng React hooks và vanilla JS
- Dùng existing `FocusContext` architecture
- Dùng existing `CustomVideoPlayer` structure

**Browser requirements:**
- `scrollIntoView` với `behavior: 'smooth'` (fallback: 'auto')
- `requestAnimationFrame` (standard, fallback: setTimeout)
- `AbortController` (optional, for cancel scroll)

## 12. Rollout Strategy

**Development:**
1. Feature branch: `feature/focus-navigation-refactor`
2. Implement theo phases
3. Test mỗi phase trước khi merge

**Testing:**
1. Local testing với TV remote simulator
2. Test trên actual Android TV device
3. Regression testing toàn bộ navigation flows

**Deployment:**
1. Alpha release: Internal testing
2. Beta release: Small group users
3. Production: Full rollout sau 1 tuần beta

**Rollback plan:**
- Git revert nếu có critical bugs
- Feature flag để disable acceleration nếu cần
- Hotfix branch sẵn sàng

---

## Approval

- [x] Architecture approved
- [x] Component design approved  
- [x] Performance strategy approved
- [x] Testing plan approved

**Next step:** Writing implementation plan
