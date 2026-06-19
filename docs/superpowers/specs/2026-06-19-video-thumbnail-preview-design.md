# Video Timeline Thumbnail Preview — Design Spec

**Date:** 2026-06-19
**Status:** Approved
**Approach:** B — Lazy Capture + LRU Cache

---

## 1. Yêu cầu

Khi người dùng tua video (hover/kéo thanh timeline), hiển thị popup thumbnail preview phía trên thanh timeline để biết đang tua đến cảnh nào.

## 2. Ràng buộc

- **Nguồn thumbnail:** Client-side canvas capture từ video ẩn
- **Chiến lược generate:** Lazy (chỉ generate khi hover), cache bằng Map
- **Vị trí hiển thị:** Popup phía trên thanh timeline (kiểu YouTube)
- **Loại preview:** Ảnh tĩnh (thumbnail)

## 3. Kiến trúc

```
CustomVideoPlayer.jsx
├── <video> chính (phát video)
├── <video> ẩn (dùng để seek + capture frame, kích thước nhỏ)
├── <canvas> ẩn (drawImage từ video ẩn, 160x90)
├── useThumbnailPreview(thumbnailVideoRef, canvasRef, duration)
│   ├── cache: Map<timeKey, dataURL> — giới hạn 100 entries, LRU eviction
│   ├── generate(time): seek video ẩn → chờ seeked → canvas.drawImage → cache → return dataURL
│   ├── requestPreview(time): trả về dataURL từ cache hoặc trigger generate async
│   └── debounce 400ms trước khi seek (tránh spam khi kéo nhanh)
└── CustomVideoPlayerChrome.jsx
    ├── onMouseMove trên <input type="range"> → tính % → tính time
    ├── gọi hook.requestPreview(time)
    ├── state: { visible, dataURL, time, positionXPercent }
    └── render <ThumbnailPreview /> khi visible
```

## 4. Files

| File | Action | Mô tả |
|---|---|---|
| `src/hooks/useThumbnailPreview.js` | **New** | Hook quản lý video ẩn, canvas, cache LRU, debounce |
| `src/components/video-player/thumbnail-preview/ThumbnailPreview.jsx` | **New** | Popup component hiển thị ảnh + timestamp |
| `src/components/video-player/thumbnail-preview/thumbnail-preview.scss` | **New** | Style popup (vị trí, kích thước, animation) |
| `src/components/video-player/CustomVideoPlayerChrome.jsx` | **Modify** | Thêm hover handler trên timeline, render ThumbnailPreview |
| `src/components/video-player/CustomVideoPlayer.jsx` | **Modify** | Tạo `<video>` ẩn + `<canvas>`, khởi tạo hook, truyền state xuống Chrome |

## 5. useThumbnailPreview Hook

### API

```js
const { requestPreview, cancelRequest, preview, setSource } = useThumbnailPreview(canvasRef, duration);
```

| Method/Prop | Mô tả |
|---|---|
| `setSource(src)` | Set source cho video ẩn (gọi khi episode thay đổi) |
| `requestPreview(time)` | Yêu cầu preview tại `time` (giây). Trả về sync nếu cache hit, async nếu miss. |
| `cancelRequest()` | Hủy debounce pending (khi rời timeline) |
| `preview` | `{ dataURL, time }` hoặc `null` — state hiện tại để render |

### Internals

- **Cache**: `Map<number, string>` với key = `Math.floor(time / 5) * 5` (mỗi 5s một mốc)
- **LRU eviction**: Array track thứ tự truy cập, khi size > 100 thì xóa entry cũ nhất
- **Debounce**: `requestPreview()` dùng debounce 400ms, `cancelRequest()` hủy pending
- **Generate flow**:
  1. Set `video.currentTime = time`
  2. Listen `seeked` event (one-time)
  3. `ctx.drawImage(video, 0, 0, 160, 90)`
  4. `canvas.toDataURL('image/jpeg', 0.7)` → cache → update state
- **Cleanup**: `setSource(null)` xóa toàn bộ cache khi đổi episode

## 6. ThumbnailPreview Component

### Props

```js
interface ThumbnailPreviewProps {
  dataURL: string;        // ảnh base64
  time: number;           // thời gian (giây)
  positionXPercent: number; // vị trí ngang (% so với timeline)
  visible: boolean;
}
```

### Layout

- Container `position: absolute`, đặt phía trên timeline 12px
- `left` = `positionXPercent`, dùng `transform: translateX(-50%)` để căn giữa
- Ảnh: 160x90, border-radius 8px, box-shadow
- Timestamp: text nhỏ bên dưới ảnh, format `MM:SS`
- Fade in/out với `opacity` transition 150ms

## 7. Tích hợp Chrome

Trong `CustomVideoPlayerChrome.jsx`, trên `<input type="range">`:

```jsx
onMouseMove={(e) => {
  const rect = e.target.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const time = percent * duration;
  onTimelineHover(time, percent * 100);
}}
onMouseLeave={() => onTimelineLeave()}
```

Các callback `onTimelineHover` và `onTimelineLeave` được truyền từ `CustomVideoPlayer.jsx`.

## 8. Edge Cases

| Case | Xử lý |
|---|---|
| Video chưa load metadata (`duration = 0`) | Không hiện preview, không generate |
| HLS stream chưa load segment tại vị trí seek | `seeked` event sẽ không fire ngay → timeout 5s, bỏ qua |
| Kéo timeline quá nhanh | Debounce 400ms + cancel pending khi rời timeline |
| Đổi episode khi đang generate | `cancelRequest()` + xóa cache trong cleanup |
| Video ẩn không seek được (cross-origin, etc.) | Try-catch, fallback về không hiện preview |
| Chrome/Safari khác behavior | Dùng `seeked` event chuẩn HTML5, hoạt động trên mọi browser |

## 9. Performance

- Canvas nhỏ (160x90), JPEG quality 0.7 → mỗi thumbnail ~2-5KB
- Cache 100 entries → ~200-500KB RAM
- Debounce 400ms → tối đa 2-3 seek/giây khi kéo
- Video ẩn dùng `preload="auto"` để sẵn sàng seek
