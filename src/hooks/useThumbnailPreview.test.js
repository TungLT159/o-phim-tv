import { renderHook, act } from "@testing-library/react";
import useThumbnailPreview from "./useThumbnailPreview";

describe("useThumbnailPreview", () => {
  let videoRef;
  let canvasRef;
  let videoElement;
  let canvasElement;

  beforeEach(() => {
    videoElement = document.createElement("video");
    Object.defineProperty(videoElement, "duration", {
      value: 120,
      writable: true,
    });
    Object.defineProperty(videoElement, "readyState", {
      value: 2,
      writable: true,
    });

    canvasElement = document.createElement("canvas");
    canvasElement.width = 160;
    canvasElement.height = 90;

    const ctx = {
      drawImage: jest.fn(),
    };
    canvasElement.getContext = jest.fn(() => ctx);
    canvasElement.toDataURL = jest.fn(() => "data:image/jpeg;base64,abc123");

    videoRef = { current: videoElement };
    canvasRef = { current: canvasElement };
  });

  it("returns preview null by default", () => {
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );
    expect(result.current.preview).toBeNull();
  });

  it("requestPreview sets debounced preview for uncached time", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    // Should not be immediate (debounced)
    expect(result.current.preview).toBeNull();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    // seeked event
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    expect(result.current.preview).not.toBeNull();
    expect(result.current.preview.dataURL).toBe("data:image/jpeg;base64,abc123");
    expect(result.current.preview.position).toBe(50);

    jest.useRealTimers();
  });

  it("cancelRequest clears pending preview", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    act(() => {
      result.current.cancelRequest();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current.preview).toBeNull();
    jest.useRealTimers();
  });

  it("returns null when duration is 0", () => {
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 0)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });

    expect(result.current.preview).toBeNull();
  });

  it("caches thumbnails and returns cached value on second request", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    // First request
    act(() => {
      result.current.requestPreview(30, 50);
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    const firstPreview = result.current.preview;

    // Clear preview
    act(() => {
      result.current.cancelRequest();
    });
    expect(result.current.preview).toBeNull();

    // Second request — should return cached immediately
    act(() => {
      result.current.requestPreview(30, 50);
    });

    expect(result.current.preview).not.toBeNull();
    expect(result.current.preview.dataURL).toBe(firstPreview.dataURL);

    jest.useRealTimers();
  });

  it("setSource clears cache", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(30, 50);
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    const cached = result.current.preview;
    expect(cached).not.toBeNull();

    act(() => {
      result.current.cancelRequest();
    });

    act(() => {
      result.current.requestPreview(30, 50);
    });
    expect(result.current.preview).not.toBeNull();

    act(() => {
      result.current.setSource("http://example.com/video.mp4", false);
    });
    expect(result.current.preview).toBeNull();

    jest.useRealTimers();
  });

  it("debounces rapid requests", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useThumbnailPreview(videoRef, canvasRef, 120)
    );

    act(() => {
      result.current.requestPreview(10, 20);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.requestPreview(20, 40);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.requestPreview(30, 50);
    });

    // Only the last request should trigger after debounce
    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      videoElement.dispatchEvent(new Event("seeked"));
    });

    expect(canvasElement.toDataURL).toHaveBeenCalledTimes(1);
    expect(videoElement.currentTime).toBe(30);

    jest.useRealTimers();
  });
});
